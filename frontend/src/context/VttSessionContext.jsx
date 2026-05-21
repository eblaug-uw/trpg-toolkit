import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEncounters } from "./EncountersContext";
import { deserializeVttState } from "../features/vtt/encounter/deserialize";
import { serializeVttState } from "../features/vtt/encounter/serialize";
import { getSignedUrl } from "../services/vttStorage";
import { CombatTracker } from "../services/combatTracker";

const VttSessionContext = createContext(null);

const DEFAULT_GRID = {
  showGrid: true,
  pixelsPerFoot: 10,
  gridFineTune: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
};

const DEFAULT_MOB_VISIBILITY_BY_LAYER = {
  1: false,
  2: false,
  3: false,
};

export function VttSessionProvider({ children }) {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get("encounterId");
  const { encounters, saveVttState } = useEncounters();

  // --- Persistable state (mirrors serialized JSON shape)
  const [grid, setGrid] = useState(DEFAULT_GRID);
  const [backgroundRef, setBackgroundRef] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stagingParticipants, setStagingParticipants] = useState([]);

  // DM 56: Mobs are hidden by layer until the GM toggles that layer visible.
  const [mobVisibilityByLayer, setMobVisibilityByLayer] = useState(DEFAULT_MOB_VISIBILITY_BY_LAYER);

  // DM 48: Track the currently active map layer.
  const [currentLayer, setCurrentLayer] = useState(1);

  // --- Combat: combatRef is the live source of truth;

  const combatRef = useRef(null);
  const [combatActive, setCombatActive] = useState(false);
  const [initiativeQueue, setInitiativeQueue] = useState([]);

  // --- Ephemeral / never serialized
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const hydratedForId = useRef(null);

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

  function tickStatusesForParticipant(id) {
    updateParticipant(id, (participant) => ({
      ...participant,
      statuses: (participant.statuses ?? [])
        .map((status) => ({
          ...status,
          turnsRemaining: Math.max(0, Number(status.turnsRemaining ?? 0) - 1),
        }))
        .filter((status) => status.turnsRemaining > 0),
    }));
  }

  useEffect(() => {
    if (!encounterId) return;
    if (hydratedForId.current === encounterId) return;
    const found = encounters.find((e) => e.id === encounterId);
    if (!found || !found.vttState) return;

    let restored;
    try {
      restored = deserializeVttState(found.vttState);
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
    setBackgroundUrl(null);
    setParticipants(restored.participants);

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

    hydratedForId.current = encounterId;
  }, [encounterId, encounters]);

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

  function setBackground(url, name) {
    setBackgroundUrl(url);
    setBackgroundRef({ bucket: "maps", name });
  }

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
      syncQueue();
    }
    setSelectedParticipant((prev) => (prev?.id === id ? null : prev));
  }

  function moveToken(id, cell) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, cell } : p)));
  }

  function updateHp(id, calc) {
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
        backgroundRef,
        participants,
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
    [grid, backgroundRef, participants, combatActive, initiativeQueue],
  );

  function saveCurrent(targetId) {
    saveVttState(targetId, currentVttState);
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
    setBackground,
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
