import { assertKnownSchemaVersion } from "./encounterSchema";

export function deserializeVttState(blob) {
  assertKnownSchemaVersion(blob.schemaVersion);

  const activeLayer = blob.layers.find((l) => l.id === blob.activeLayerId) ?? blob.layers[0];

  return {
    showGrid: blob.grid.showGrid,
    pixelsPerFoot: blob.grid.pixelsPerFoot,
    gridFineTune: blob.grid.gridFineTune,
    gridOffsetX: blob.grid.gridOffsetX,
    gridOffsetY: blob.grid.gridOffsetY,
    backgroundRef: activeLayer.map.backgroundRef ?? null,
    mapRotation: activeLayer.map.rotation ?? 0,
    currentLayer: blob.currentLayer ?? 1,
    mobVisibilityByLayer: blob.mobVisibilityByLayer ?? { 1: false, 2: false, 3: false },
    stagingParticipants: (blob.stagingParticipants ?? []).map((p) => ({ ...p })),
    drawings: (activeLayer.drawings ?? []).map((drawing) => ({
      ...drawing,
      points: [...drawing.points],
    })),
    participants: activeLayer.participants.map((p) => ({ ...p })),
    combat: {
      active: activeLayer.combat?.active ?? false,
      round: activeLayer.combat?.round ?? 1,
      queue: (activeLayer.combat?.queue ?? []).map((q) => ({
        participantId: q.participantId,
        total: q.total,
        dex: q.dex,
      })),
    },
    viewport: blob.viewport ?? null,
  };
}
