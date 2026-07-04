import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useEncounters } from "./EncountersContext";
import { deserializeVttState } from "../features/vtt/encounter/deserialize";
import { serializeVttState } from "../features/vtt/encounter/serialize";
import { getSignedUrl } from "../services/vttStorage";
import { CombatTracker } from "../services/combatTracker";
import { fetchMonster55ByName } from "../services/monsters55Search";
import { supabase } from "../services/supabaseClient";

const VttSessionContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_GRID = {
  showGrid: true,
  pixelsPerFoot: 10,
  gridFineTune: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
};

const DEFAULT_MAP_ROTATION = 0;
const DEFAULT_MAP_ROTATION_STEP = 15;

const DEFAULT_MOB_VISIBILITY_BY_LAYER = {
  1: false,
  2: false,
  3: false,
};

const DEFAULT_DRAWING_TOOL = {
  color: "#facc15",
  strokeWidth: 6,
  mode: "pen",
};

const MAX_UNDO_ACTIONS = 100;

const DOWN_STATUS_ID = "down";

const DOWN_STATUS = {
  instanceId: DOWN_STATUS_ID,
  statusId: DOWN_STATUS_ID,
  name: "Down",
  turnsRemaining: null,
  stackable: false,
  effect_summary: "Health is 0. This participant is down until healed above 0 HP.",
};

function getParticipantImageUrl(participant) {
  return participant.image_url ?? participant.imageUrl ?? participant.data?.image_url ?? null;
}

function tickParticipantStatuses(statuses = []) {
  return statuses
    .filter((status) => status.statusId === DOWN_STATUS_ID || status.turnsRemaining !== null)
    .map((status) => {
      if (status.statusId === DOWN_STATUS_ID) return status;

      return {
        ...status,
        turnsRemaining: Math.max(0, Number(status.turnsRemaining ?? 0) - 1),
      };
    })
    .filter((status) => status.statusId === DOWN_STATUS_ID || status.turnsRemaining > 0);
}

export function VttSessionProvider({ children }) {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get("encounterId");
  const { encounters, saveVttState } = useEncounters();

  // --- Persistable state (mirrors serialized JSON shape)
  const [grid, setGrid] = useState(DEFAULT_GRID);
  const [mapRotation, setMapRotation] = useState(DEFAULT_MAP_ROTATION);
  const [mapRotationStep, setMapRotationStep] = useState(DEFAULT_MAP_ROTATION_STEP);
  const [backgroundRef, setBackgroundRef] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [drawingTool, setDrawingTool] = useState(DEFAULT_DRAWING_TOOL);
  const [participants, setParticipants] = useState([]);
  const [stagingParticipants, setStagingParticipants] = useState([]);

  // DM 56: Mobs are hidden by layer until the GM toggles that layer visible.
  const [mobVisibilityByLayer, setMobVisibilityByLayer] = useState(DEFAULT_MOB_VISIBILITY_BY_LAYER);

  // DM 48: Track the currently active map layer.
  const [currentLayer, setCurrentLayer] = useState(1);

  // --- Combat: combatRef is the live source of truth;

  const combatRef = useRef(null);
  const imageLookupRef = useRef(new Set());
  const [combatActive, setCombatActive] = useState(false);
  const [initiativeQueue, setInitiativeQueue] = useState([]);
  const undoLastActionRef = useRef(() => {});
  // --- Ephemeral / never serialized
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const hydratedForId = useRef(null);
  const charactersHydratedForId = useRef(null);
  const undoStackRef = useRef([]);

  const saveTimerRef = useRef(null);
  const latestStateRef = useRef({ encounterId: null, vttState: null });
  const lastSavedRef = useRef(null); // JSON snapshot of last loaded/saved state
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(null); // { id, state, serialized }
  const prevEncounterIdRef = useRef(encounterId);
  const accessTokenRef = useRef(null); // cached for beforeunload

  const pushUndoAction = useCallback((action) => {
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO_ACTIONS - 1)), action];
  }, []);

  function updateParticipantCell(id, cell) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, cell } : p)));
    setSelectedParticipant((prev) => (prev?.id === id ? { ...prev, cell } : prev));
  }

  function syncQueue() {
    if (!combatRef.current) {
      setInitiativeQueue([]);
      return;
    }
    setInitiativeQueue(
      combatRef.current.queue.map((e) => ({ ...e.entity, initiativeTotal: e.total })),
    );
  }

  // --- Hydrate from ?encounterId=…
  function updateParticipant(id, updater) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));

    if (combatRef.current) {
      combatRef.current.queue = combatRef.current.queue.map((entry) =>
        entry.entity.id === id ? { ...entry, entity: updater(entry.entity) } : entry,
      );
      syncQueue();
    }

    setSelectedParticipant((prev) => (prev?.id === id ? updater(prev) : prev));
  }

  useEffect(() => {
    const missingImageParticipants = participants.filter((participant) => {
      if (participant.type !== "monster") return false;
      if (getParticipantImageUrl(participant)) return false;
      if (imageLookupRef.current.has(participant.id)) return false;
      return Boolean(participant.name);
    });

    if (missingImageParticipants.length === 0) return;

    let cancelled = false;
    missingImageParticipants.forEach((participant) => imageLookupRef.current.add(participant.id));

    Promise.allSettled(
      missingImageParticipants.map((participant) =>
        fetchMonster55ByName(participant.name).then((monster) => ({
          participantId: participant.id,
          monster,
        })),
      ),
    ).then((results) => {
      if (cancelled) return;

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;

        const { participantId, monster } = result.value;
        if (!monster.image_url) return;

        updateParticipant(participantId, (participant) => ({
          ...participant,
          image_url: monster.image_url,
          data: {
            ...participant.data,
            ...monster,
          },
        }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [participants]);

  function tickStatusesForParticipant(id) {
    updateParticipant(id, (participant) => ({
      ...participant,
      statuses: tickParticipantStatuses(participant.statuses),
    }));
  }

  // --- Resolve a signed URL whenever backgroundRef is set without one
  useEffect(() => {
    if (!backgroundRef || backgroundUrl) return;
    let cancelled = false;
    getSignedUrl(backgroundRef.bucket, backgroundRef.name)
      .then((url) => {
        if (!cancelled) setBackgroundUrl(url);
      })
      .catch((err) => {
        console.error("[VttSession] failed to resolve background URL", err);
      });
    return () => {
      cancelled = true;
    };
  }, [backgroundRef, backgroundUrl]);

  // --- Grid mutators
  const setShowGrid = (v) =>
    setGrid((g) => ({ ...g, showGrid: typeof v === "function" ? v(g.showGrid) : v }));
  const setPixelsPerFoot = (v) =>
    setGrid((g) => ({ ...g, pixelsPerFoot: typeof v === "function" ? v(g.pixelsPerFoot) : v }));
  const setGridFineTune = (v) =>
    setGrid((g) => ({ ...g, gridFineTune: typeof v === "function" ? v(g.gridFineTune) : v }));
  const setGridOffsetX = (v) =>
    setGrid((g) => ({ ...g, gridOffsetX: typeof v === "function" ? v(g.gridOffsetX) : v }));
  const setGridOffsetY = (v) =>
    setGrid((g) => ({ ...g, gridOffsetY: typeof v === "function" ? v(g.gridOffsetY) : v }));
  const setMapRotationDegrees = useCallback(
    (v) =>
      setMapRotation((rotation) => {
        const next = typeof v === "function" ? v(rotation) : v;
        const numeric = Number(next);
        const normalized = !Number.isFinite(numeric)
          ? DEFAULT_MAP_ROTATION
          : numeric === 360
            ? 360
            : ((numeric % 360) + 360) % 360;
        if (normalized !== rotation) {
          pushUndoAction(() => setMapRotation(rotation));
        }
        return normalized;
      }),
    [pushUndoAction],
  );
  const setMapRotationStepDegrees = (v) => {
    const numeric = Number(typeof v === "function" ? v(mapRotationStep) : v);
    if (!Number.isFinite(numeric)) return;
    setMapRotationStep(Math.max(1, Math.min(360, Math.round(numeric))));
  };

  const rotateMapByDegrees = useCallback(
    (delta) => {
      setMapRotationDegrees((rotation) => rotation + delta);
    },
    [setMapRotationDegrees],
  );

  function setBackground(url, name) {
    setBackgroundUrl(url);
    setBackgroundRef({ bucket: "maps", name });
  }

  function addDrawing(drawing) {
    pushUndoAction(() => {
      setDrawings((prev) => prev.filter((item) => item.id !== drawing.id));
    });
    setDrawings((prev) => [...prev, drawing]);
  }

  function undoDrawing() {
    setDrawings((prev) => prev.slice(0, -1));
  }

  function removeDrawing(id) {
    setDrawings((prev) => {
      const removedIndex = prev.findIndex((drawing) => drawing.id === id);
      if (removedIndex === -1) return prev;
      const removedDrawing = prev[removedIndex];
      pushUndoAction(() => {
        setDrawings((current) => [
          ...current.slice(0, removedIndex),
          removedDrawing,
          ...current.slice(removedIndex),
        ]);
      });
      return prev.filter((drawing) => drawing.id !== id);
    });
  }

  function clearDrawings() {
    setDrawings((prev) => {
      if (prev.length > 0) {
        pushUndoAction(() => setDrawings(prev));
      }
      return [];
    });
  }

  function undoLastAction() {
    const action = undoStackRef.current.at(-1);
    if (!action) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    action();
  }

  undoLastActionRef.current = undoLastAction;

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tagName === "textarea" ||
        (tagName === "input" && target.type !== "range");

      if (isEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastActionRef.current();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "q" || key === "e") {
          event.preventDefault();
          rotateMapByDegrees(key === "q" ? -mapRotationStep : mapRotationStep);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapRotationStep, rotateMapByDegrees]);

  function toggleMobVisibilityForLayer(layer) {
    setMobVisibilityByLayer((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }

  // --- Participant mutators
  function addParticipant(participant) {
    const size = participant.size ?? 1;
    const cell = mapInfo
      ? {
          x: Math.max(
            0,
            Math.min(mapInfo.width - size, Math.floor(mapInfo.width / 2) - Math.floor(size / 2)),
          ),
          y: Math.max(
            0,
            Math.min(mapInfo.height - size, Math.floor(mapInfo.height / 2) - Math.floor(size / 2)),
          ),
        }
      : { x: 0, y: 0 };

    // DM 48: Assign new participants to the active map layer.
    setParticipants((prev) => [...prev, { ...participant, cell, layer: currentLayer }]);
  }

  function addToStaging(participant) {
    setStagingParticipants((prev) => [...prev, participant]);
  }

  function removeFromStaging(id) {
    setStagingParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function deployFromStaging(id) {
    const participant = stagingParticipants.find((p) => p.id === id);
    if (!participant) return;

    addParticipant(participant);
    removeFromStaging(id);
  }

  function removeParticipant(id) {
    setStagingParticipants((prev) => prev.filter((p) => p.id !== id));
    setParticipants((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        combatRef.current = null;
        setCombatActive(false);
        setInitiativeQueue([]);
      }
      return next;
    });
    if (combatRef.current) {
      combatRef.current.queue = combatRef.current.queue.filter((e) => e.entity.id !== id);
      if (combatRef.current.queue.length === 0) {
        combatRef.current = null;
        setCombatActive(false);
        setInitiativeQueue([]);
        setSelectedParticipant((prev) => (prev?.id === id ? null : prev));
        return;
      }
      syncQueue();
    }
    setSelectedParticipant((prev) => (prev?.id === id ? null : prev));
  }

  function moveToken(id, cell) {
    setParticipants((prev) => {
      const participant = prev.find((p) => p.id === id);
      if (!participant) return prev;
      const previousCell = participant.cell ?? null;
      if (previousCell?.x === cell.x && previousCell?.y === cell.y) return prev;

      pushUndoAction(() => updateParticipantCell(id, previousCell));
      return prev.map((p) => (p.id === id ? { ...p, cell } : p));
    });
    setSelectedParticipant((prev) => (prev?.id === id ? { ...prev, cell } : prev));
  }

  function updateHp(id, calc) {
    updateParticipant(id, (p) => {
      const nextHp = calc(p);
      const currentStatuses = p.statuses ?? [];
      const hasDownStatus = currentStatuses.some((status) => status.statusId === DOWN_STATUS_ID);
      let nextStatuses = currentStatuses;

      if (nextHp <= 0 && !hasDownStatus) {
        nextStatuses = [...currentStatuses, DOWN_STATUS];
      }

      if (nextHp > 0 && hasDownStatus) {
        nextStatuses = currentStatuses.filter((status) => status.statusId !== DOWN_STATUS_ID);
      }

      return { ...p, hit_points: nextHp, statuses: nextStatuses };
    });
    updateParticipant(id, (p) => ({ ...p, hit_points: calc(p) }));
  }

  function damage(id, amount) {
    updateHp(id, (p) => Math.max(0, p.hit_points - amount));
  }

  function heal(id, amount) {
    updateHp(id, (p) => {
      const max = p.data?.hit_points ?? p.data?.hp ?? p.hit_points;
      return Math.min(max, p.hit_points + amount);
    });
  }

  function applyStatus(id, status) {
    updateParticipant(id, (participant) => {
      const currentStatuses = participant.statuses ?? [];
      const statusAllowsStacking = status.stackable !== false;
      const alreadyApplied = currentStatuses.some((s) => s.statusId === status.statusId);

      if (!statusAllowsStacking && alreadyApplied) {
        return participant;
      }

      return {
        ...participant,
        statuses: [...currentStatuses, status],
      };
    });
  }

  function removeStatus(id, instanceId) {
    updateParticipant(id, (participant) => ({
      ...participant,
      statuses: (participant.statuses ?? []).filter((status) => status.instanceId !== instanceId),
    }));
  }

  // --- Combat mutators
  function roll() {
    if (participants.length === 0) return;
    combatRef.current = new CombatTracker(participants);
    syncQueue();
    setCombatActive(true);
  }

  function nextTurn() {
    if (!combatRef.current) return;
    const endingTurnId = combatRef.current.activeEntity?.entity?.id;
    if (endingTurnId) {
      tickStatusesForParticipant(endingTurnId);
    }
    combatRef.current.nextTurn();
    syncQueue();
  }

  function adjustInitiative(name, total) {
    if (!combatRef.current) return;
    combatRef.current.adjustInitiative(name, total);
    syncQueue();
  }

  // --- Serialize + save (reads round/queue from combatRef)
  const currentVttState = useMemo(
    () =>
      serializeVttState({
        ...grid,
        mapRotation,
        backgroundRef,
        drawings,
        participants,
        stagingParticipants,
        currentLayer,
        mobVisibilityByLayer,
        combat: {
          active: combatActive,
          round: combatRef.current?.round ?? 1,
          queue: (combatRef.current?.queue ?? []).map((e) => ({
            participantId: e.entity.id,
            total: e.total,
            dex: e.dex,
          })),
        },
        viewport: null,
      }),
    [
      grid,
      mapRotation,
      backgroundRef,
      drawings,
      participants,
      stagingParticipants,
      currentLayer,
      mobVisibilityByLayer,
      combatActive,
      initiativeQueue,
    ],
  );
  // Keep latest values reachable from async handlers (beforeunload, in-flight save resume).
  useEffect(() => {
    latestStateRef.current = { encounterId, vttState: currentVttState };
  });

  const performSave = useCallback(
    async (id, state, serialized) => {
      if (!id || !state) return;
      const snapshot = serialized ?? JSON.stringify(state);
      if (saveInFlightRef.current) {
        pendingSaveRef.current = { id, state, serialized: snapshot };
        return;
      }
      saveInFlightRef.current = true;
      try {
        await saveVttState(id, state);
        lastSavedRef.current = snapshot;
      } catch (err) {
        console.error("[VttSession] autosave failed", err);
      } finally {
        saveInFlightRef.current = false;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending) {
          performSave(pending.id, pending.state, pending.serialized);
        }
      }
    },
    [saveVttState],
  );

  const flushSaveNow = useCallback(
    (id, state) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const serialized = JSON.stringify(state);
      if (serialized === lastSavedRef.current) return;
      performSave(id, state, serialized);
    },
    [performSave],
  );

  // Debounced autosave: writes to Supabase ~800ms after the last change.
  useEffect(() => {
    if (!encounterId) return;
    if (hydratedForId.current === encounterId) return;
    const found = encounters.find((e) => e.id === encounterId);
    if (!found) return; // encounters list not loaded yet

    if (!found.vtt_state) {
      // Brand-new encounter, nothing stored yet.
      lastSavedRef.current = null;
    } else {
      let restored;
      try {
        restored = deserializeVttState(found.vtt_state);
      } catch (err) {
        console.error("[VttSession] failed to deserialize", err);
        return;
      }

      setGrid({
        showGrid: restored.showGrid,
        pixelsPerFoot: restored.pixelsPerFoot,
        gridFineTune: restored.gridFineTune,
        gridOffsetX: restored.gridOffsetX,
        gridOffsetY: restored.gridOffsetY,
      });
      setBackgroundRef(restored.backgroundRef);
      setMapRotation(restored.mapRotation ?? DEFAULT_MAP_ROTATION);
      setBackgroundUrl(null);
      setDrawings(restored.drawings ?? []);
      setParticipants(restored.participants);
      setStagingParticipants(restored.stagingParticipants ?? []);
      setCurrentLayer(restored.currentLayer ?? 1);
      setMobVisibilityByLayer(restored.mobVisibilityByLayer ?? DEFAULT_MOB_VISIBILITY_BY_LAYER);
      undoStackRef.current = [];

      if (restored.combat.active && restored.participants.length > 0) {
        const tracker = new CombatTracker(restored.participants);
        tracker.queue = restored.combat.queue
          .map((q) => {
            const entity = restored.participants.find((p) => p.id === q.participantId);
            if (!entity) return null;
            return { entity, name: entity.name, total: q.total, dex: q.dex };
          })
          .filter(Boolean);
        tracker.round = restored.combat.round;
        combatRef.current = tracker;
        setInitiativeQueue(tracker.queue.map((e) => ({ ...e.entity, initiativeTotal: e.total })));
        setCombatActive(true);
      } else {
        combatRef.current = null;
        setInitiativeQueue([]);
        setCombatActive(false);
      }

      lastSavedRef.current = JSON.stringify(found.vtt_state);
    }

    hydratedForId.current = encounterId;
  }, [encounterId, encounters]);
  // Auto-add campaign characters to staging when an encounter is opened.
  // Uses a ref to gate by encounterId so encounters-list updates (e.g. autosave)
  // don't re-trigger the fetch or cancel an in-flight one.
  useEffect(() => {
    if (!encounterId) return;
    if (charactersHydratedForId.current === encounterId) return;
    const found = encounters.find((e) => e.id === encounterId);
    if (!found || !found.campaign_id) return;

    charactersHydratedForId.current = encounterId;
    const targetEncounterId = encounterId;

    supabase
      .from("characters")
      .select("id, name, player_name, hit_points, hit_points_max")
      .eq("campaign_id", found.campaign_id)
      .then(({ data, error }) => {
        // Only apply if the user is still on the same encounter.
        if (charactersHydratedForId.current !== targetEncounterId) return;
        if (error) {
          console.error("[VttSession] characters fetch failed", error);
          return;
        }
        const toAdd = (data ?? []).map((c) => ({
          id: `character-${c.id}`,
          name: c.name,
          type: "player",
          dexterity: 10,
          size: 1,
          hit_points: c.hit_points ?? c.hit_points_max ?? 1,
          data: {
            name: c.name,
            player_name: c.player_name,
            dexterity: 10,
            hit_points: c.hit_points ?? c.hit_points_max ?? 1,
            hit_points_max: c.hit_points_max,
          },
        }));
        if (toAdd.length === 0) return;
        setStagingParticipants((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const deployedIdsLatest = new Set(
            (latestStateRef.current.vttState?.layers?.[0]?.participants ?? []).map((p) => p.id),
          );
          return [
            ...prev,
            ...toAdd.filter((c) => !prevIds.has(c.id) && !deployedIdsLatest.has(c.id)),
          ];
        });
      });
  }, [encounterId, encounters]);
  // Flush pending save when leaving an encounter (route change, switch to another encounter).
  useEffect(() => {
    const prev = prevEncounterIdRef.current;
    if (prev && prev !== encounterId) {
      const { vttState } = latestStateRef.current;
      if (vttState) flushSaveNow(prev, vttState);
    }
    prevEncounterIdRef.current = encounterId;
  }, [encounterId, flushSaveNow]);

  // Cache access token so beforeunload can build an authenticated fetch synchronously.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) accessTokenRef.current = data.session?.access_token ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Best-effort save on tab close / refresh via fetch+keepalive.
  useEffect(() => {
    const onBeforeUnload = () => {
      const { encounterId: id, vttState } = latestStateRef.current;
      if (!id || !vttState) return;
      const serialized = JSON.stringify(vttState);
      if (serialized === lastSavedRef.current) return;
      const token = accessTokenRef.current;
      if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;
      try {
        fetch(`${SUPABASE_URL}/rest/v1/encounters?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ vtt_state: vttState }),
        });
      } catch {
        // best-effort
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function saveCurrent(targetId) {
    flushSaveNow(targetId, currentVttState);
  }

  const value = {
    encounterId,

    // persistable
    grid,
    setShowGrid,
    setPixelsPerFoot,
    setGridFineTune,
    setGridOffsetX,
    setGridOffsetY,
    backgroundRef,
    mapRotation,
    mapRotationStep,
    setMapRotation: setMapRotationDegrees,
    setMapRotationStep: setMapRotationStepDegrees,
    rotateMapByDegrees,
    setBackground,
    drawings,
    drawingTool,
    setDrawingTool,
    addDrawing,
    removeDrawing,
    undoDrawing,
    clearDrawings,
    undoLastAction,
    participants,

    // DM 56: Mob visibility controls for map layers.
    mobVisibilityByLayer,
    toggleMobVisibilityForLayer,

    stagingParticipants,

    // DM 48: Layer controls for the VTT map.
    currentLayer,
    setCurrentLayer,

    addParticipant,
    addToStaging,
    removeFromStaging,
    deployFromStaging,
    removeParticipant,
    moveToken,
    damage,
    heal,

    // combat
    combatActive,
    initiativeQueue,
    roll,
    nextTurn,
    adjustInitiative,
    applyStatus,
    removeStatus,

    // ephemeral
    backgroundUrl,
    mapInfo,
    setMapInfo,
    selectedParticipant,
    setSelectedParticipant,

    // io
    currentVttState,
    saveCurrent,
  };

  return <VttSessionContext.Provider value={value}>{children}</VttSessionContext.Provider>;
}

export function useVttSession() {
  const ctx = useContext(VttSessionContext);
  if (!ctx) throw new Error("useVttSession must be used inside <VttSessionProvider>");
  return ctx;
}
