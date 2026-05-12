import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import Campaigns from "@/pages/Campaigns";
import seedCampaigns from "@/data/campaigns.json";

// TopBar pulls in Supabase + useSession — mock it out
vi.mock("@/components/TopBar", () => ({
  default: () => <div data-testid="topbar-mock" />,
}));

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
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++n}`);
  });

  it("renders a card for every seeded campaign", () => {
    renderAt();
    seedCampaigns.forEach((c) => {
      expect(screen.getByText(c.title)).toBeInTheDocument();
    });
  });

  it("navigates to the encounters page when a card is clicked", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: seedCampaigns[0].title }));
    expect(screen.getByTestId("encounters-page")).toBeInTheDocument();
  });

  it("opens the New Campaign modal when the button is clicked", async () => {
    const user = userEvent.setup();
    renderAt();
    expect(screen.queryByPlaceholderText(/my new campaign/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New Campaign" }));
    expect(screen.getByPlaceholderText(/my new campaign/i)).toBeInTheDocument();
  });

  it("creates a campaign and navigates to its encounters page on submit", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "New Campaign" }));
    await user.type(screen.getByPlaceholderText(/my new campaign/i), "Brand New Saga");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByTestId("encounters-page")).toBeInTheDocument();
  });
});
