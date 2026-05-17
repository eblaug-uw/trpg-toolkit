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

export function VttSessionProvider({ children }) {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get("encounterId");
  const { encounters, saveVttState } = useEncounters();

  // --- Persistable state (mirrors serialized JSON shape)
  const [grid, setGrid] = useState(DEFAULT_GRID);
  const [backgroundRef, setBackgroundRef] = useState(null);
  const [participants, setParticipants] = useState([]);

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
    setParticipants((prev) => [...prev, { ...participant, cell }]);
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
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, hit_points: calc(p) } : p)));
    if (combatRef.current) {
      combatRef.current.queue.forEach((entry) => {
        if (entry.entity.id === id) {
          entry.entity = { ...entry.entity, hit_points: calc(entry.entity) };
        }
      });
      syncQueue();
    }
    setSelectedParticipant((prev) =>
      prev?.id === id ? { ...prev, hit_points: calc(prev) } : prev,
    );
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

  // --- Combat mutators
  function roll() {
    if (participants.length === 0) return;
    combatRef.current = new CombatTracker(participants);
    syncQueue();
    setCombatActive(true);
  }

  function nextTurn() {
    if (!combatRef.current) return;
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
    addParticipant,
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
