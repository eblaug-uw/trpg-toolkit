import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CURRENT_SCHEMA_VERSION } from "@/features/vtt/encounter/encounterSchema";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock } = await import("../../helpers/supabaseMock");
  return { supabase: createSupabaseMock({ encounters: [] }) };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider, useEncounters } from "@/context/EncountersContext";
import LoadEncounterButton from "@/components/LoadEncounterButton";
import { supabase } from "@/services/supabaseClient";

// Probes the context's loading state so tests can wait for session + initial
// fetch to finish before triggering actions that call addEncounter().
function ReadyProbe() {
  const { loading } = useEncounters();
  return loading ? null : <span data-testid="enc-ready" />;
}

const wrapper = ({ children }) => (
  <MemoryRouter>
    <CampaignsProvider>
      <EncountersProvider>
        <ReadyProbe />
        {children}
      </EncountersProvider>
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
    supabase.__reset({ encounters: [] });
    mockNavigate.mockClear();
  });

  it("persists an imported encounter and navigates to VTT", async () => {
    render(<LoadEncounterButton campaignId="c1" />, { wrapper });
    await screen.findByTestId("enc-ready");
    const input = document.querySelector("input[type=file]");

    fireEvent.change(input, { target: { files: [makeFile(validBlob())] } });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/vtt\?encounterId=/));
    });

    expect(supabase.__store.encounters).toHaveLength(1);
    const imported = supabase.__store.encounters[0];
    expect(imported.campaign_id).toBe("c1");
    expect(imported.title).toBe("bandit-camp");
    expect(imported.vtt_state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
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
    expect(supabase.__store.encounters).toHaveLength(0);
  });

  it("shows an error on unknown schemaVersion and does not persist", async () => {
    render(<LoadEncounterButton campaignId="c1" />, { wrapper });
    const input = document.querySelector("input[type=file]");
    const bad = { ...validBlob(), schemaVersion: 999 };

    fireEvent.change(input, { target: { files: [makeFile(bad)] } });

    await screen.findByText(/Could not load file/i);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(supabase.__store.encounters).toHaveLength(0);
  });
});
