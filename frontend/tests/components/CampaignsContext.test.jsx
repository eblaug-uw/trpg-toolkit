import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CampaignsProvider, useCampaigns } from "@/context/CampaignsContext";
import seedCampaigns from "@/data/campaigns.json";

const wrapper = ({ children }) => <CampaignsProvider>{children}</CampaignsProvider>;

describe("CampaignsContext", () => {
  beforeEach(() => {
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++n}`);
  });

  it("exposes the seeded campaigns", () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    expect(result.current.campaigns).toEqual(seedCampaigns);
  });

  it("appends a new campaign with the proper shape via addCampaign", () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });

    let returned;
    act(() => {
      returned = result.current.addCampaign("A New Saga");
    });

    expect(returned).toEqual({
      id: "uuid-1",
      title: "A New Saga",
      encounterIds: [],
      characterIds: [],
    });
    expect(result.current.campaigns).toHaveLength(seedCampaigns.length + 1);
    expect(result.current.campaigns.at(-1)).toEqual(returned);
  });

  it("linkEncounter pushes the encounter id onto the right campaign", () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    const targetId = seedCampaigns[0].id;
    const prevEncounters = seedCampaigns[0].encounterIds;

    act(() => {
      result.current.linkEncounter(targetId, "enc-new");
    });

    const updated = result.current.campaigns.find((c) => c.id === targetId);
    expect(updated.encounterIds).toEqual([...prevEncounters, "enc-new"]);

    // Sibling campaigns are untouched
    const other = result.current.campaigns.find((c) => c.id !== targetId);
    const seedOther = seedCampaigns.find((c) => c.id === other.id);
    expect(other.encounterIds).toEqual(seedOther.encounterIds);
  });
});
