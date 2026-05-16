import { describe, it, expect } from "vitest";
import { serializeVttState } from "@/features/vtt/encounter/serialize";
import { deserializeVttState } from "@/features/vtt/encounter/deserialize";

const sample = () => ({
  showGrid: true,
  pixelsPerFoot: 12,
  gridFineTune: 2,
  gridOffsetX: 4,
  gridOffsetY: -3,
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

describe("serialize/deserialize round trip", () => {
  it("preserves the flat state shape", () => {
    const start = sample();
    expect(deserializeVttState(serializeVttState(start))).toEqual(start);
  });

  it("preserves a state with no map and no combat", () => {
    const start = {
      ...sample(),
      backgroundRef: null,
      viewport: null,
      participants: [],
      combat: { active: false, round: 1, queue: [] },
    };
    expect(deserializeVttState(serializeVttState(start))).toEqual(start);
  });
});
