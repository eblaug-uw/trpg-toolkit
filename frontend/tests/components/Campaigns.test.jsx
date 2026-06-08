import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock, FAKE_USER_ID } = await import("../helpers/supabaseMock");
  return {
    supabase: createSupabaseMock({
      campaigns: [
        {
          id: "camp-a",
          user_id: FAKE_USER_ID,
          title: "The Sundered Crown",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "camp-b",
          user_id: FAKE_USER_ID,
          title: "Whispers of the Deep",
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    }),
  };
});

// TopBar pulls in Supabase + useSession — mock it out
vi.mock("@/components/TopBar", () => ({
  default: () => <div data-testid="topbar-mock" />,
}));

import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import Campaigns from "@/pages/Campaigns";
import { supabase } from "@/services/supabaseClient";
import { FAKE_USER_ID } from "../helpers/supabaseMock";

const SEED = [
  {
    id: "camp-a",
    user_id: FAKE_USER_ID,
    title: "The Sundered Crown",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "camp-b",
    user_id: FAKE_USER_ID,
    title: "Whispers of the Deep",
    created_at: "2024-01-02T00:00:00Z",
  },
];

const renderAt = (initialPath = "/campaigns") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route path="/campaigns" element={<Campaigns />} />
            <Route
              path="/campaigns/:id/encounters"
              element={<div data-testid="encounters-page" />}
            />
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );

describe("<Campaigns />", () => {
  beforeEach(() => {
    supabase.__reset({ campaigns: SEED.map((c) => ({ ...c })) });
  });

  it("renders a card for every seeded campaign", async () => {
    renderAt();
    for (const c of SEED) {
      expect(await screen.findByText(c.title)).toBeInTheDocument();
    }
  });

  it("navigates to the encounters page when a card is clicked", async () => {
    const user = userEvent.setup();
    renderAt();
    const firstCard = await screen.findByRole("button", { name: SEED[0].title });
    await user.click(firstCard);
    expect(screen.getByTestId("encounters-page")).toBeInTheDocument();
  });

  it("opens the New Campaign modal when the button is clicked", async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.queryByPlaceholderText(/my new campaign/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "New Campaign" }));
    expect(screen.getByPlaceholderText(/my new campaign/i)).toBeInTheDocument();
  });

  it("creates a campaign and navigates to its encounters page on submit", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(await screen.findByRole("button", { name: "New Campaign" }));
    await user.type(screen.getByPlaceholderText(/my new campaign/i), "Brand New Saga");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByTestId("encounters-page")).toBeInTheDocument());
  });
});
