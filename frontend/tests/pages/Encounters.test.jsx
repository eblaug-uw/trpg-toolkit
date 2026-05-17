import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import EncountersPage from "@/pages/Encounters";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route path="/campaigns/:id/encounters" element={<EncountersPage />} />
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );
}

describe("Encounters page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it("renders both 'New Encounter' and 'Load from file' actions", () => {
    renderAt("/campaigns/c1/encounters");
    expect(screen.getByRole("button", { name: /new encounter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load from file/i })).toBeInTheDocument();
  });

  it("navigates to /vtt/edit?encounterId=… when an encounter card is clicked in edit mode (default)", () => {
    renderAt("/campaigns/c1/encounters");

    fireEvent.click(screen.getByRole("button", { name: "Goblin Ambush" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/vtt/edit?encounterId=e1");
  });

  it("navigates to /vtt/play?encounterId=… when an encounter card is clicked in play mode", () => {
    renderAt("/campaigns/c1/encounters");

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Goblin Ambush" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/vtt/play?encounterId=e1");
  });
});
