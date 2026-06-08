import { CURRENT_SCHEMA_VERSION } from "./encounterSchema";

// Single-layer today; replace with real layer ids when multi-layer lands.
const DEFAULT_LAYER_ID = "layer-1";

export function serializeVttState(state) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    grid: {
      showGrid: state.showGrid,
      pixelsPerFoot: state.pixelsPerFoot,
      gridFineTune: state.gridFineTune,
      gridOffsetX: state.gridOffsetX,
      gridOffsetY: state.gridOffsetY,
    },
    activeLayerId: DEFAULT_LAYER_ID,
    currentLayer: state.currentLayer ?? 1,
    mobVisibilityByLayer: state.mobVisibilityByLayer ?? { 1: false, 2: false, 3: false },
    stagingParticipants: (state.stagingParticipants ?? []).map((p) => ({ ...p })),
    layers: [
      {
        id: DEFAULT_LAYER_ID,
        name: "Layer 1",
        visible: true,
        map: {
          backgroundRef: state.backgroundRef ?? null,
          rotation: state.mapRotation ?? 0,
        },
        drawings: (state.drawings ?? []).map((drawing) => ({
          ...drawing,
          points: [...drawing.points],
        })),
        participants: state.participants.map((p) => ({ ...p })),
        combat: {
          active: state.combat?.active ?? false,
          round: state.combat?.round ?? 1,
          queue: (state.combat?.queue ?? []).map((q) => ({
            participantId: q.participantId,
            total: q.total,
            dex: q.dex,
          })),
        },
      },
    ],
    viewport: state.viewport ?? null,
  };
}
