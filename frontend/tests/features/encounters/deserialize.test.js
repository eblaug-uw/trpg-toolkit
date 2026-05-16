import { describe, it, expect } from "vitest";
import { deserializeVttState } from "@/features/vtt/encounter/deserialize";
import { CURRENT_SCHEMA_VERSION } from "@/features/vtt/encounter/encounterSchema";

const sampleBlob = () => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  grid: {
    showGrid: true,
    pixelsPerFoot: 12,
    gridFineTune: 2,
    gridOffsetX: 0,
    gridOffsetY: 0,
  },
  activeLayerId: "layer-1",
  layers: [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      map: { backgroundRef: { bucket: "maps", name: "1700000000-tavern.jpg" } },
      participants: [
        {
          id: "p1",
          name: "Goblin",
          cell: { x: 3, y: 4 },
          size: 1,
          type: "monster",
          hit_points: 7,
          data: { hit_points: 7, dexterity: 14 },
        },
        {
          id: "p2",
          name: "Rogue",
          cell: { x: 5, y: 5 },
          size: 1,
          type: "character",
          hit_points: 22,
          data: { hit_points: 22, dexterity: 16 },
        },
      ],
      combat: {
        active: true,
        round: 2,
        queue: [
          { participantId: "p2", total: 18, dex: 16 },
          { participantId: "p1", total: 11, dex: 14 },
        ],
      },
    },
  ],
  viewport: { zoom: 0.9, panX: -100, panY: -50 },
});

describe("deserializeVttState", () => {
  it("returns flat grid settings", () => {
    expect(deserializeVttState(sampleBlob())).toMatchObject({
      showGrid: true,
      pixelsPerFoot: 12,
      gridFineTune: 2,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  });

  it("pulls participants out of the active layer", () => {
    const state = deserializeVttState(sampleBlob());
    expect(state.participants).toHaveLength(2);
    expect(state.participants[0].id).toBe("p1");
  });

  it("pulls combat out of the active layer", () => {
    expect(deserializeVttState(sampleBlob()).combat).toEqual({
      active: true,
      round: 2,
      queue: [
        { participantId: "p2", total: 18, dex: 16 },
        { participantId: "p1", total: 11, dex: 14 },
      ],
    });
  });

  it("pulls backgroundRef out of the active layer", () => {
    expect(deserializeVttState(sampleBlob()).backgroundRef).toEqual({
      bucket: "maps",
      name: "1700000000-tavern.jpg",
    });
  });

  it("falls back to layers[0] when activeLayerId doesn't match", () => {
    const blob = sampleBlob();
    blob.activeLayerId = "does-not-exist";
    expect(deserializeVttState(blob).participants).toHaveLength(2);
  });

  it("picks the named active layer when multiple are present", () => {
    const blob = sampleBlob();
    blob.layers.push({
      id: "layer-2",
      name: "Layer 2",
      visible: true,
      map: { backgroundRef: null },
      participants: [],
      combat: { active: false, round: 1, queue: [] },
    });
    blob.activeLayerId = "layer-2";
    const state = deserializeVttState(blob);
    expect(state.participants).toHaveLength(0);
    expect(state.backgroundRef).toBeNull();
  });

  it("returns null backgroundRef when none was saved", () => {
    const blob = sampleBlob();
    blob.layers[0].map.backgroundRef = null;
    expect(deserializeVttState(blob).backgroundRef).toBeNull();
  });

  it("returns null viewport when none was saved", () => {
    const blob = sampleBlob();
    blob.viewport = null;
    expect(deserializeVttState(blob).viewport).toBeNull();
  });

  it("defaults combat to inactive empty queue when missing", () => {
    const blob = sampleBlob();
    delete blob.layers[0].combat;
    expect(deserializeVttState(blob).combat).toEqual({
      active: false,
      round: 1,
      queue: [],
    });
  });

  it("throws on unknown schemaVersion", () => {
    const blob = sampleBlob();
    blob.schemaVersion = 999;
    expect(() => deserializeVttState(blob)).toThrow(/Unsupported schemaVersion/);
  });
});
