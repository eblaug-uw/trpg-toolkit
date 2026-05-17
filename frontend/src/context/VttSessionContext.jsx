import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEncounters } from "./EncountersContext";
import { deserializeVttState } from "../features/vtt/encounter/deserialize";
import { serializeVttState } from "../features/vtt/encounter/serialize";
import { getSignedUrl } from "../services/vttStorage";

const VttSessionContext = createContext(null);

const DEFAULT_GRID = {
  showGrid: true,
  pixelsPerFoot: 10,
  gridFineTune: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
};

const DEFAULT_COMBAT = { active: false, round: 1, queue: [] };

export function VttSessionProvider({ children }) {
  const [searchParams] = useSearchParams();
  const encounterId = searchParams.get("encounterId");
  const { encounters, saveVttState } = useEncounters();

  // --- Persistable state — mirrors the serialized JSON shape one-to-one.
  const [grid, setGrid] = useState(DEFAULT_GRID);
  const [backgroundRef, setBackgroundRef] = useState(null);
  const [participants, setParticipants] = useState([]);
  // Combat is read on hydrate / written on save.
  // Mutators (roll, nextTurn, adjustInitiative) land with play mode.
  const [combat, setCombat] = useState(DEFAULT_COMBAT);

  // --- Ephemeral / derived state — never serialized.
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  // Hydration guard — ensures encounter list mutations after first hydration
  // (e.g. our own save) don't reset live state.
  const hydratedForId = useRef(null);

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
    setBackgroundUrl(null); // re-resolved by the effect below
    setParticipants(restored.participants);
    setCombat({
      active: restored.combat.active,
      round: restored.combat.round,
      queue: restored.combat.queue,
    });

    hydratedForId.current = encounterId;
  }, [encounterId, encounters]);

  // --- Resolve a signed URL whenever backgroundRef is set without one.
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

  // --- Grid mutators (one per field so PillGrid signatures don't change).
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

  // --- Background mutator
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
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setSelectedParticipant((prev) => (prev?.id === id ? null : prev));
  }

  function moveToken(id, cell) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, cell } : p)));
  }

  function damage(id, amount) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, hit_points: Math.max(0, p.hit_points - amount) } : p)),
    );
    setSelectedParticipant((prev) =>
      prev?.id === id ? { ...prev, hit_points: Math.max(0, prev.hit_points - amount) } : prev,
    );
  }

  function heal(id, amount) {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const max = p.data?.hit_points ?? p.data?.hp ?? p.hit_points;
        return { ...p, hit_points: Math.min(max, p.hit_points + amount) };
      }),
    );
    setSelectedParticipant((prev) => {
      if (prev?.id !== id) return prev;
      const max = prev.data?.hit_points ?? prev.data?.hp ?? prev.hit_points;
      return { ...prev, hit_points: Math.min(max, prev.hit_points + amount) };
    });
  }

  // --- Serialize + save
  const currentVttState = useMemo(
    () =>
      serializeVttState({
        ...grid,
        backgroundRef,
        participants,
        combat,
        viewport: null,
      }),
    [grid, backgroundRef, participants, combat],
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

    combat, // read-only this round; mutators land with play mode

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
