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
    layers: [
      {
        id: DEFAULT_LAYER_ID,
        name: "Layer 1",
        visible: true,
        map: {
          backgroundRef: state.backgroundRef ?? null,
        },
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
