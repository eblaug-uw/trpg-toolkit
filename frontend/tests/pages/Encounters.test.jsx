import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CharacterDraftProvider } from "@/context/CharacterDraftContext";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock, FAKE_USER_ID } = await import("../helpers/supabaseMock");
  return {
    supabase: createSupabaseMock({
      campaigns: [
        {
          id: "c1",
          user_id: FAKE_USER_ID,
          title: "Lost Mines",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      encounters: [
        {
          id: "e1",
          user_id: FAKE_USER_ID,
          campaign_id: "c1",
          title: "Goblin Ambush",
          vtt_state: null,
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    }),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import EncountersPage from "@/pages/Encounters";
import { supabase } from "@/services/supabaseClient";
import { FAKE_USER_ID } from "../helpers/supabaseMock";

const SEED = {
  campaigns: [
    {
      id: "c1",
      user_id: FAKE_USER_ID,
      title: "Lost Mines",
      created_at: "2024-01-01T00:00:00Z",
    },
  ],
  encounters: [
    {
      id: "e1",
      user_id: FAKE_USER_ID,
      campaign_id: "c1",
      title: "Goblin Ambush",
      vtt_state: null,
      created_at: "2024-01-02T00:00:00Z",
    },
  ],
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CampaignsProvider>
        <EncountersProvider>
          <CharacterDraftProvider>
            <Routes>
              <Route path="/campaigns/:id/encounters" element={<EncountersPage />} />
            </Routes>
          </CharacterDraftProvider>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );
}

describe("Encounters page", () => {
  beforeEach(() => {
    supabase.__reset({
      campaigns: SEED.campaigns.map((c) => ({ ...c })),
      encounters: SEED.encounters.map((e) => ({ ...e })),
    });
    mockNavigate.mockClear();
  });

  it("renders both 'New Encounter' and 'Load from file' actions", async () => {
    renderAt("/campaigns/c1/encounters");
    expect(await screen.findByRole("button", { name: /new encounter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load from file/i })).toBeInTheDocument();
  });

  it("navigates to /vtt/edit?encounterId=… when an encounter card is clicked in edit mode (default)", async () => {
    renderAt("/campaigns/c1/encounters");

    const card = await screen.findByRole("button", { name: "Goblin Ambush" });
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/vtt/edit?encounterId=e1");
  });

  it("navigates to /vtt/play?encounterId=… when an encounter card is clicked in play mode", async () => {
    renderAt("/campaigns/c1/encounters");

    // Wait for the encounters to load before flipping to play mode.
    await screen.findByRole("button", { name: "Goblin Ambush" });

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Goblin Ambush" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/vtt/play?encounterId=e1");
  });
});
