import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import LoadEncounterButton from "@/components/LoadEncounterButton";
import { CURRENT_SCHEMA_VERSION } from "@/features/vtt/encounter/encounterSchema";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const wrapper = ({ children }) => (
  <MemoryRouter>
    <CampaignsProvider>
      <EncountersProvider>{children}</EncountersProvider>
    </CampaignsProvider>
  </MemoryRouter>
);

function makeFile(obj, name = "bandit-camp.json") {
  return new File([JSON.stringify(obj)], name, { type: "application/json" });
}

const validBlob = () => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  grid: {
    showGrid: true,
    pixelsPerFoot: 10,
    gridFineTune: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
  },
  activeLayerId: "layer-1",
  layers: [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      map: { backgroundRef: null },
      participants: [],
      combat: { active: false, round: 1, queue: [] },
    },
  ],
  viewport: null,
});

describe("LoadEncounterButton", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => `enc-${++n}`);
  });

  it("persists an imported encounter and navigates to VTT", async () => {
    render(<LoadEncounterButton campaignId="c1" />, { wrapper });
    const input = document.querySelector("input[type=file]");

    fireEvent.change(input, { target: { files: [makeFile(validBlob())] } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/vtt?encounterId=enc-1");
    });

    const stored = JSON.parse(localStorage.getItem("trpg:encounters"));
    const imported = stored.find((e) => e.id === "enc-1");
    expect(imported).toBeTruthy();
    expect(imported.campaignId).toBe("c1");
    expect(imported.title).toBe("bandit-camp");
    expect(imported.vttState.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("shows an error and does not persist on invalid JSON", async () => {
    render(<LoadEncounterButton campaignId="c1" />, { wrapper });
    const input = document.querySelector("input[type=file]");
    const badFile = new File(["this is not json"], "x.json", {
      type: "application/json",
    });

    fireEvent.change(input, { target: { files: [badFile] } });

    await screen.findByText(/Could not load file/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows an error on unknown schemaVersion and does not persist", async () => {
    render(<LoadEncounterButton campaignId="c1" />, { wrapper });
    const input = document.querySelector("input[type=file]");
    const bad = { ...validBlob(), schemaVersion: 999 };

    fireEvent.change(input, { target: { files: [makeFile(bad)] } });

    await screen.findByText(/Could not load file/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
