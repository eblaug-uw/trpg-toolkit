import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock, FAKE_USER_ID } = await import("../helpers/supabaseMock");
  return {
    supabase: createSupabaseMock({
      campaigns: [
        {
          id: "seed-1",
          user_id: FAKE_USER_ID,
          title: "Seeded Campaign",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    }),
  };
});

import { CampaignsProvider, useCampaigns } from "@/context/CampaignsContext";
import { supabase } from "@/services/supabaseClient";
import { FAKE_USER_ID } from "../helpers/supabaseMock";

const wrapper = ({ children }) => <CampaignsProvider>{children}</CampaignsProvider>;

describe("CampaignsContext", () => {
  beforeEach(() => {
    supabase.__reset({
      campaigns: [
        {
          id: "seed-1",
          user_id: FAKE_USER_ID,
          title: "Seeded Campaign",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    });
  });

  it("loads campaigns from Supabase on mount", async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.campaigns).toHaveLength(1);
    expect(result.current.campaigns[0].title).toBe("Seeded Campaign");
  });

  it("addCampaign inserts a row and appends to local state", async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.addCampaign("A New Saga");
    });

    expect(returned.title).toBe("A New Saga");
    expect(returned.user_id).toBe(FAKE_USER_ID);
    expect(result.current.campaigns).toHaveLength(2);
    expect(result.current.campaigns.at(-1)).toEqual(returned);
  });

  it("updateCampaign patches the row", async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateCampaign("seed-1", { title: "Renamed" });
    });

    expect(result.current.campaigns[0].title).toBe("Renamed");
  });

  it("deleteCampaign removes the row", async () => {
    const { result } = renderHook(() => useCampaigns(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteCampaign("seed-1");
    });

    expect(result.current.campaigns).toHaveLength(0);
  });
});
