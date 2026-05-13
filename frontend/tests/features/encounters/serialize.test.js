import { describe, it, expect } from "vitest";
import { serializeVttState } from "@/features/vtt/encounter/serialize";
import { CURRENT_SCHEMA_VERSION } from "@/features/vtt/encounter/encounterSchema";

const sampleVttState = () => ({
  showGrid: true,
  pixelsPerFoot: 12,
  gridFineTune: 2,
  gridOffsetX: 0,
  gridOffsetY: 0,
  backgroundRef: { bucket: "maps", name: "1700000000-tavern.jpg" },
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
  viewport: { zoom: 0.9, panX: -100, panY: -50 },
});

describe("serializeVttState", () => {
  it("stamps the current schemaVersion", () => {
    expect(serializeVttState(sampleVttState()).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("captures grid settings at the encounter level", () => {
    const json = serializeVttState(sampleVttState());
    expect(json.grid).toEqual({
      showGrid: true,
      pixelsPerFoot: 12,
      gridFineTune: 2,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
  });

  it("wraps state in a single active layer", () => {
    const json = serializeVttState(sampleVttState());
    expect(json.layers).toHaveLength(1);
    expect(json.activeLayerId).toBe(json.layers[0].id);
  });

  it("nests participants, backgroundRef, and combat under the active layer", () => {
    const json = serializeVttState(sampleVttState());
    const layer = json.layers[0];

    expect(layer.map.backgroundRef).toEqual({ bucket: "maps", name: "1700000000-tavern.jpg" });
    expect(layer.participants).toHaveLength(2);
    expect(layer.combat.round).toBe(2);
    expect(layer.combat.queue).toEqual([
      { participantId: "p2", total: 18, dex: 16 },
      { participantId: "p1", total: 11, dex: 14 },
    ]);
  });

  it("captures viewport when provided", () => {
    expect(serializeVttState(sampleVttState()).viewport).toEqual({
      zoom: 0.9,
      panX: -100,
      panY: -50,
    });
  });

  it("allows a null backgroundRef when no map is selected", () => {
    const json = serializeVttState({ ...sampleVttState(), backgroundRef: null });
    expect(json.layers[0].map.backgroundRef).toBeNull();
  });

  it("allows a null viewport", () => {
    const json = serializeVttState({ ...sampleVttState(), viewport: null });
    expect(json.viewport).toBeNull();
  });
});
