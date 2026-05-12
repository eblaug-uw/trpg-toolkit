import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import Encounters from "@/pages/Encounters";
import seedCampaigns from "@/data/campaigns.json";
import seedEncounters from "@/data/encounters.json";

vi.mock("@/components/TopBar", () => ({
  default: () => <div data-testid="topbar-mock" />,
}));

const campaignWithEncounters = seedCampaigns.find((c) => c.encounterIds.length > 0);

const renderEncountersFor = (campaignId) =>
  render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}/encounters`]}>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route path="/campaigns" element={<div data-testid="campaigns-page" />} />
            <Route path="/campaigns/:id/encounters" element={<Encounters />} />
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );

describe("<Encounters />", () => {
  beforeEach(() => {
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `enc-${++n}`);
  });

  it("renders the campaign title", () => {
    renderEncountersFor(campaignWithEncounters.id);
    expect(
      screen.getByRole("heading", { level: 1, name: campaignWithEncounters.title }),
    ).toBeInTheDocument();
  });

  it("lists only the encounters belonging to the current campaign", () => {
    renderEncountersFor(campaignWithEncounters.id);
    const expected = seedEncounters.filter((e) =>
      campaignWithEncounters.encounterIds.includes(e.id),
    );
    expected.forEach((e) => {
      expect(screen.getByText(e.title)).toBeInTheDocument();
    });

    const otherEncounter = seedEncounters.find(
      (e) => !campaignWithEncounters.encounterIds.includes(e.id),
    );
    if (otherEncounter) {
      expect(screen.queryByText(otherEncounter.title)).not.toBeInTheDocument();
    }
  });

  it("mode toggle switches the active button", async () => {
    const user = userEvent.setup();
    renderEncountersFor(campaignWithEncounters.id);

    const edit = screen.getByRole("button", { name: "Edit" });
    const play = screen.getByRole("button", { name: "Play" });

    expect(edit).toHaveClass("active");
    expect(play).not.toHaveClass("active");

    await user.click(play);
    expect(play).toHaveClass("active");
    expect(edit).not.toHaveClass("active");
  });

  it("creates a new encounter and shows it as a card", async () => {
    const user = userEvent.setup();
    renderEncountersFor(campaignWithEncounters.id);

    await user.click(screen.getByRole("button", { name: "New Encounter" }));
    await user.type(screen.getByPlaceholderText(/my new encounter/i), "Lava Run");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Lava Run")).toBeInTheDocument();
  });

  it("shows a not-found message when the campaign id is unknown", () => {
    renderEncountersFor("non-existent-id");
    expect(screen.getByText(/campaign not found/i)).toBeInTheDocument();
  });

  it("back link navigates to /campaigns", async () => {
    const user = userEvent.setup();
    renderEncountersFor(campaignWithEncounters.id);
    await user.click(screen.getByRole("link", { name: /campaigns/i }));
    expect(screen.getByTestId("campaigns-page")).toBeInTheDocument();
  });
});
