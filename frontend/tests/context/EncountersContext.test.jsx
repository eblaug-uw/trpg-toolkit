import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock, FAKE_USER_ID } = await import("../helpers/supabaseMock");
  return {
    supabase: createSupabaseMock({
      encounters: [
        {
          id: "enc-seed",
          user_id: FAKE_USER_ID,
          campaign_id: "camp-1",
          title: "Seeded Encounter",
          vtt_state: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    }),
  };
});

import { EncountersProvider, useEncounters } from "@/context/EncountersContext";
import { supabase } from "@/services/supabaseClient";
import { FAKE_USER_ID } from "../helpers/supabaseMock";

const wrapper = ({ children }) => <EncountersProvider>{children}</EncountersProvider>;

const seedRow = {
  id: "enc-seed",
  user_id: FAKE_USER_ID,
  campaign_id: "camp-1",
  title: "Seeded Encounter",
  vtt_state: null,
  created_at: "2024-01-01T00:00:00Z",
};

describe("EncountersContext", () => {
  beforeEach(() => {
    supabase.__reset({ encounters: [{ ...seedRow }] });
  });

  it("loads encounters from Supabase on mount", async () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.encounters).toHaveLength(1);
    expect(result.current.encounters[0].campaign_id).toBe("camp-1");
  });

  it("addEncounter inserts a row with snake_case columns", async () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned;
    await act(async () => {
      returned = await result.current.addEncounter("camp-2", "Bandit Camp");
    });

    expect(returned.title).toBe("Bandit Camp");
    expect(returned.campaign_id).toBe("camp-2");
    expect(returned.vtt_state).toBeNull();
    expect(returned.user_id).toBe(FAKE_USER_ID);
    expect(result.current.encounters).toHaveLength(2);
  });

  it("deleteEncounter removes the row", async () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteEncounter("enc-seed");
    });

    expect(result.current.encounters).toHaveLength(0);
  });
});
