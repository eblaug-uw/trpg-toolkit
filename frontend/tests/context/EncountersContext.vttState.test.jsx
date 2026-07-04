import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock, FAKE_USER_ID } = await import("../helpers/supabaseMock");
  return {
    supabase: createSupabaseMock({
      encounters: [
        {
          id: "enc-1",
          user_id: FAKE_USER_ID,
          campaign_id: "camp-1",
          title: "Test Encounter",
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

describe("EncountersContext.saveVttState", () => {
  beforeEach(() => {
    supabase.__reset({
      encounters: [
        {
          id: "enc-1",
          user_id: FAKE_USER_ID,
          campaign_id: "camp-1",
          title: "Test Encounter",
          vtt_state: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    });
  });

  it("writes vtt_state to the matching encounter", async () => {
    const { result } = renderHook(() => useEncounters(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const state = { tokens: [{ id: "t1", x: 100, y: 200 }] };
    await act(async () => {
      await result.current.saveVttState("enc-1", state);
    });

    expect(result.current.encounters[0].vtt_state).toEqual(state);
  });

  it("does not modify sibling encounters", async () => {
    supabase.__reset({
      encounters: [
        {
          id: "enc-1",
          user_id: FAKE_USER_ID,
          campaign_id: "camp-1",
          title: "A",
          vtt_state: null,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "enc-2",
          user_id: FAKE_USER_ID,
          campaign_id: "camp-1",
          title: "B",
          vtt_state: { keep: true },
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useEncounters(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveVttState("enc-1", { changed: true });
    });

    const enc2 = result.current.encounters.find((e) => e.id === "enc-2");
    expect(enc2.vtt_state).toEqual({ keep: true });
  });
});
