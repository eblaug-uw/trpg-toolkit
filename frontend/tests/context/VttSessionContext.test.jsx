import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider, useEncounters } from "@/context/EncountersContext";
import { VttSessionProvider, useVttSession } from "@/context/VttSessionContext";
import { serializeVttState } from "@/features/vtt/encounter/serialize";

vi.mock("@/services/vttStorage", () => ({
  getSignedUrl: vi.fn(async () => "blob://mock-url"),
}));

function makeWrapper(initialEntries = ["/vtt/edit"]) {
  return function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <CampaignsProvider>
          <EncountersProvider>
            <VttSessionProvider>{children}</VttSessionProvider>
          </EncountersProvider>
        </CampaignsProvider>
      </MemoryRouter>
    );
  };
}

function makeParticipant(overrides = {}) {
  return {
    id: "p1",
    name: "X",
    size: 1,
    hit_points: 10,
    dexterity: 10,
    data: { hit_points: 10 },
    ...overrides,
  };
}

describe("VttSessionContext", () => {
  beforeEach(() => {
    localStorage.clear();
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `enc-${++n}`);
  });

  it("starts with empty / default state when no ?encounterId is present", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    expect(result.current.participants).toEqual([]);
    expect(result.current.backgroundRef).toBeNull();
    expect(result.current.grid).toEqual({
      showGrid: true,
      pixelsPerFoot: 10,
      gridFineTune: 0,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    expect(result.current.combatActive).toBe(false);
    expect(result.current.initiativeQueue).toEqual([]);
  });

  it("hydrates from a saved encounter when ?encounterId matches", () => {
    const saved = serializeVttState({
      showGrid: false,
      pixelsPerFoot: 12,
      gridFineTune: 2,
      gridOffsetX: 3,
      gridOffsetY: 4,
      backgroundRef: { bucket: "maps", name: "saved.png" },
      participants: [makeParticipant({ id: "p1", cell: { x: 1, y: 2 } })],
      combat: { active: false, round: 1, queue: [] },
      viewport: null,
    });
    localStorage.setItem(
      "trpg:encounters",
      JSON.stringify([{ id: "enc-existing", title: "Saved", campaignId: null, vttState: saved }]),
    );

    const { result } = renderHook(() => useVttSession(), {
      wrapper: makeWrapper(["/vtt/edit?encounterId=enc-existing"]),
    });

    expect(result.current.grid.showGrid).toBe(false);
    expect(result.current.grid.pixelsPerFoot).toBe(12);
    expect(result.current.backgroundRef).toEqual({ bucket: "maps", name: "saved.png" });
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].cell).toEqual({ x: 1, y: 2 });
  });

  it("hydrates an active combat — rebuilds the tracker and seeds initiativeQueue", () => {
    const p1 = makeParticipant({ id: "p1", name: "Alpha", dexterity: 14 });
    const p2 = makeParticipant({ id: "p2", name: "Beta", dexterity: 10 });
    const saved = serializeVttState({
      showGrid: true,
      pixelsPerFoot: 10,
      gridFineTune: 0,
      gridOffsetX: 0,
      gridOffsetY: 0,
      backgroundRef: null,
      participants: [p1, p2],
      combat: {
        active: true,
        round: 3,
        queue: [
          { participantId: "p1", total: 22, dex: 14 },
          { participantId: "p2", total: 9, dex: 10 },
        ],
      },
      viewport: null,
    });
    localStorage.setItem(
      "trpg:encounters",
      JSON.stringify([{ id: "enc-c", title: "Combat", campaignId: null, vttState: saved }]),
    );

    const { result } = renderHook(() => useVttSession(), {
      wrapper: makeWrapper(["/vtt/play?encounterId=enc-c"]),
    });

    expect(result.current.combatActive).toBe(true);
    expect(result.current.initiativeQueue.map((e) => e.id)).toEqual(["p1", "p2"]);
    expect(result.current.initiativeQueue[0].initiativeTotal).toBe(22);
  });

  it("does not re-hydrate after the encounters list mutates (save guard)", () => {
    const initial = serializeVttState({
      showGrid: true,
      pixelsPerFoot: 10,
      gridFineTune: 0,
      gridOffsetX: 0,
      gridOffsetY: 0,
      backgroundRef: null,
      participants: [makeParticipant({ id: "p1", name: "Initial" })],
      combat: { active: false, round: 1, queue: [] },
      viewport: null,
    });
    localStorage.setItem(
      "trpg:encounters",
      JSON.stringify([{ id: "enc-1", title: "T", campaignId: null, vttState: initial }]),
    );

    const { result } = renderHook(() => ({ session: useVttSession(), enc: useEncounters() }), {
      wrapper: makeWrapper(["/vtt/edit?encounterId=enc-1"]),
    });

    act(() => {
      result.current.session.addParticipant(makeParticipant({ id: "p2", name: "Added" }));
    });
    expect(result.current.session.participants).toHaveLength(2);

    act(() => result.current.session.saveCurrent("enc-1"));
    expect(result.current.session.participants).toHaveLength(2);
  });

  it("addParticipant centers on the map when mapInfo is set", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.setMapInfo({ width: 20, height: 10 }));
    act(() => result.current.addParticipant(makeParticipant({ id: "p1" })));
    expect(result.current.participants[0].cell).toEqual({ x: 10, y: 5 });
  });

  it("addParticipant falls back to {0,0} when mapInfo is not set", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.addParticipant(makeParticipant({ id: "p1" })));
    expect(result.current.participants[0].cell).toEqual({ x: 0, y: 0 });
  });

  it("removeParticipant removes by id and clears selection if it matched", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => {
      result.current.addParticipant(makeParticipant({ id: "p1", name: "A" }));
      result.current.addParticipant(makeParticipant({ id: "p2", name: "B" }));
    });
    act(() => result.current.setSelectedParticipant(result.current.participants[0]));
    act(() => result.current.removeParticipant("p1"));
    expect(result.current.participants.map((p) => p.id)).toEqual(["p2"]);
    expect(result.current.selectedParticipant).toBeNull();
  });

  it("moveToken updates the cell of the matching participant", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.addParticipant(makeParticipant({ id: "p1" })));
    act(() => result.current.moveToken("p1", { x: 4, y: 7 }));
    expect(result.current.participants[0].cell).toEqual({ x: 4, y: 7 });
  });

  it("damage clamps at 0", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() =>
      result.current.addParticipant(
        makeParticipant({ id: "p1", hit_points: 5, data: { hit_points: 10 } }),
      ),
    );
    act(() => result.current.damage("p1", 100));
    expect(result.current.participants[0].hit_points).toBe(0);
  });

  it("heal clamps at the participant's max HP (data.hit_points)", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() =>
      result.current.addParticipant(
        makeParticipant({ id: "p1", hit_points: 5, data: { hit_points: 10 } }),
      ),
    );
    act(() => result.current.heal("p1", 100));
    expect(result.current.participants[0].hit_points).toBe(10);
  });

  it("roll() instantiates a tracker and flips combatActive", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => {
      result.current.addParticipant(makeParticipant({ id: "p1", name: "Alpha", dexterity: 14 }));
      result.current.addParticipant(makeParticipant({ id: "p2", name: "Beta", dexterity: 10 }));
    });
    act(() => result.current.roll());
    expect(result.current.combatActive).toBe(true);
    expect(result.current.initiativeQueue).toHaveLength(2);
  });

  it("roll() is a no-op when there are no participants", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.roll());
    expect(result.current.combatActive).toBe(false);
    expect(result.current.initiativeQueue).toEqual([]);
  });

  it("nextTurn() rotates the initiative queue", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => {
      result.current.addParticipant(makeParticipant({ id: "p1", name: "Alpha", dexterity: 14 }));
      result.current.addParticipant(makeParticipant({ id: "p2", name: "Beta", dexterity: 10 }));
    });
    act(() => result.current.roll());
    const firstUp = result.current.initiativeQueue[0].id;
    act(() => result.current.nextTurn());
    expect(result.current.initiativeQueue[0].id).not.toBe(firstUp);
  });

  it("adjustInitiative re-sorts the visible queue", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => {
      result.current.addParticipant(makeParticipant({ id: "p1", name: "Alpha", dexterity: 14 }));
      result.current.addParticipant(makeParticipant({ id: "p2", name: "Beta", dexterity: 10 }));
    });
    act(() => result.current.roll());
    const last = result.current.initiativeQueue.at(-1).name;
    act(() => result.current.adjustInitiative(last, 99));
    expect(result.current.initiativeQueue[0].name).toBe(last);
  });

  it("applies and removes statuses from participant instances", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.addParticipant(makeParticipant({ id: "p1", name: "Alpha" })));

    act(() =>
      result.current.applyStatus("p1", {
        instanceId: "status-1",
        statusId: "poisoned",
        name: "Poisoned",
        turnsRemaining: 2,
        stackable: false,
        effect_summary: "Disadvantage on attack rolls and ability checks.",
      }),
    );

    expect(result.current.participants[0].statuses).toHaveLength(1);
    expect(result.current.participants[0].statuses[0].name).toBe("Poisoned");

    act(() => result.current.removeStatus("p1", "status-1"));
    expect(result.current.participants[0].statuses).toEqual([]);
  });

  it("ticks active participant statuses down when initiative advances", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => {
      result.current.addParticipant(makeParticipant({ id: "p1", name: "Alpha", dexterity: 14 }));
      result.current.addParticipant(makeParticipant({ id: "p2", name: "Beta", dexterity: 10 }));
    });
    act(() => result.current.roll());
    const activeId = result.current.initiativeQueue[0].id;

    act(() =>
      result.current.applyStatus(activeId, {
        instanceId: "status-1",
        statusId: "stunned",
        name: "Stunned",
        turnsRemaining: 1,
        stackable: false,
        effect_summary: null,
      }),
    );
    expect(result.current.participants.find((p) => p.id === activeId).statuses).toHaveLength(1);

    act(() => result.current.nextTurn());
    expect(result.current.participants.find((p) => p.id === activeId).statuses).toEqual([]);
  });

  it("currentVttState mirrors the persisted JSON shape", () => {
    const { result } = renderHook(() => useVttSession(), { wrapper: makeWrapper() });
    act(() => result.current.setMapInfo({ width: 20, height: 10 }));
    act(() => {
      result.current.setBackground("blob://x", "fancy-map.png");
      result.current.setShowGrid(false);
      result.current.setPixelsPerFoot(11);
      result.current.addParticipant(makeParticipant({ id: "p1" }));
    });
    const snap = result.current.currentVttState;
    expect(snap.schemaVersion).toBe(1);
    expect(snap.grid).toEqual({
      showGrid: false,
      pixelsPerFoot: 11,
      gridFineTune: 0,
      gridOffsetX: 0,
      gridOffsetY: 0,
    });
    expect(snap.layers[0].map.backgroundRef).toEqual({ bucket: "maps", name: "fancy-map.png" });
    expect(snap.layers[0].participants).toHaveLength(1);
    expect(snap.layers[0].combat).toEqual({ active: false, round: 1, queue: [] });
  });

  it("saveCurrent writes the current serialized shape into EncountersContext", () => {
    localStorage.setItem(
      "trpg:encounters",
      JSON.stringify([{ id: "enc-target", title: "T", campaignId: null, vttState: null }]),
    );
    const { result } = renderHook(() => ({ session: useVttSession(), enc: useEncounters() }), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.session.setPixelsPerFoot(15);
    });
    act(() => {
      result.current.session.saveCurrent("enc-target");
    });

    const saved = result.current.enc.encounters.find((e) => e.id === "enc-target").vttState;
    expect(saved.grid.pixelsPerFoot).toBe(15);
  });
});
