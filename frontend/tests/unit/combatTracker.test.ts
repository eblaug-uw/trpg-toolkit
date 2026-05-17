import { describe, it, expect } from "vitest";
import { CombatTracker } from "@/services/combatTracker";

const mk = (name: string, dexterity: number) => ({
  name,
  dexterity,
  id: name,
  hit_points: 10,
  data: { hit_points: 10 },
});

describe("CombatTracker.adjustInitiative", () => {
  it("updates an entry's total and re-sorts the queue", () => {
    const tracker = new CombatTracker([mk("A", 14), mk("B", 12), mk("C", 10)]);
    // Force a known order regardless of the random initial roll
    tracker.queue = [
      { entity: mk("A", 14), name: "A", total: 20, dex: 14 },
      { entity: mk("B", 12), name: "B", total: 15, dex: 12 },
      { entity: mk("C", 10), name: "C", total: 10, dex: 10 },
    ];

    tracker.adjustInitiative("C", 25);

    expect(tracker.queue.map((e) => e.entity.name)).toEqual(["C", "A", "B"]);
    expect(tracker.queue[0].total).toBe(25);
  });

  it("uses dex as a tiebreaker after re-sort", () => {
    const tracker = new CombatTracker([mk("A", 14), mk("B", 18)]);
    tracker.queue = [
      { entity: mk("A", 14), name: "A", total: 20, dex: 14 },
      { entity: mk("B", 18), name: "B", total: 10, dex: 18 },
    ];

    tracker.adjustInitiative("B", 20);

    // Same total — higher dex wins
    expect(tracker.queue[0].entity.name).toBe("B");
  });

  it("is a no-op when the name is not found", () => {
    const tracker = new CombatTracker([mk("A", 14)]);
    const before = [...tracker.queue];
    tracker.adjustInitiative("ghost", 99);
    expect(tracker.queue).toEqual(before);
  });
});
