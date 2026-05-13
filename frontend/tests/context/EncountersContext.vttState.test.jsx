import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider, useEncounters } from "@/context/EncountersContext";
import seedEncounters from "@/data/encounters.json";

const wrapper = ({ children }) => (
  <CampaignsProvider>
    <EncountersProvider>{children}</EncountersProvider>
  </CampaignsProvider>
);

const sampleVttState = () => ({
  schemaVersion: 1,
  grid: { showGrid: true, pixelsPerFoot: 12, gridFineTune: 0, gridOffsetX: 0, gridOffsetY: 0 },
  activeLayerId: "L1",
  layers: [
    {
      id: "L1",
      name: "Layer 1",
      visible: true,
      map: { backgroundRef: { bucket: "maps", name: "tavern.jpg" } },
      participants: [],
      combat: { active: false, round: 1, queue: [] },
    },
  ],
  viewport: null,
});

const findEncounter = (encounters, id) => encounters.find((e) => e.id === id);

describe("EncountersContext — saveVttState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seed encounters start with vttState: null", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    const enc = findEncounter(result.current.encounters, seedEncounters[0].id);
    expect(enc.vttState).toBeNull();
  });

  it("addEncounter returns an encounter with campaignId and vttState: null", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    let created;
    act(() => {
      created = result.current.addEncounter("c1-fake", "Lava Run");
    });
    expect(created.campaignId).toBe("c1-fake");
    expect(created.vttState).toBeNull();
  });

  it("saveVttState writes vttState onto the matching encounter", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    const first = seedEncounters[0];

    act(() => {
      result.current.saveVttState(first.id, sampleVttState());
    });

    const enc = findEncounter(result.current.encounters, first.id);
    expect(enc.vttState).not.toBeNull();
    expect(enc.vttState.layers[0].map.backgroundRef.name).toBe("tavern.jpg");
  });

  it("saveVttState persists to localStorage", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    const first = seedEncounters[0];

    act(() => {
      result.current.saveVttState(first.id, sampleVttState());
    });

    const remounted = renderHook(() => useEncounters(), { wrapper });
    const enc = findEncounter(remounted.result.current.encounters, first.id);
    expect(enc.vttState).not.toBeNull();
    expect(enc.vttState.layers[0].map.backgroundRef.name).toBe("tavern.jpg");
  });

  it("saveVttState is a no-op for an unknown encounter id", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    const before = result.current.encounters;

    act(() => {
      result.current.saveVttState("does-not-exist", sampleVttState());
    });

    expect(result.current.encounters).toEqual(before);
  });
});
