import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CampaignsProvider, useCampaigns } from "@/context/CampaignsContext";
import { EncountersProvider, useEncounters } from "@/context/EncountersContext";
import seedEncounters from "@/data/encounters.json";
import seedCampaigns from "@/data/campaigns.json";

const wrapper = ({ children }) => (
  <CampaignsProvider>
    <EncountersProvider>{children}</EncountersProvider>
  </CampaignsProvider>
);

describe("EncountersContext", () => {
  beforeEach(() => {
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `enc-${++n}`);
  });

  it("exposes the seeded encounters", () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    expect(result.current.encounters).toEqual(seedEncounters);
  });

  it("addEncounter appends a new encounter and links it to the campaign", () => {
    const { result } = renderHook(() => ({ enc: useEncounters(), camp: useCampaigns() }), {
      wrapper,
    });
    const targetId = seedCampaigns[0].id;
    const prevEncountersOnCampaign = seedCampaigns[0].encounterIds;

    let returned;
    act(() => {
      returned = result.current.enc.addEncounter(targetId, "Bandit Camp");
    });

    expect(returned).toEqual({ id: "enc-1", title: "Bandit Camp" });
    expect(result.current.enc.encounters).toHaveLength(seedEncounters.length + 1);
    expect(result.current.enc.encounters.at(-1)).toEqual(returned);

    const updatedCampaign = result.current.camp.campaigns.find((c) => c.id === targetId);
    expect(updatedCampaign.encounterIds).toEqual([...prevEncountersOnCampaign, "enc-1"]);
  });
});
