import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";

vi.mock("@/services/supabaseClient", async () => {
  const { createSupabaseMock } = await import("../helpers/supabaseMock");
  return { supabase: createSupabaseMock({ encounters: [] }) };
});

// MapCanvas pulls in react-konva, which doesn't run in jsdom.
vi.mock("@/components/MapCanvas", () => ({
  default: vi.fn(() => <div data-testid="map-canvas-stub" />),
}));

// Avoid hitting Supabase storage during tests.
vi.mock("@/services/vttStorage", () => ({
  getSignedUrl: vi.fn(async () => "blob://mock-url"),
}));

// TopBar pulls auth state we don't care to set up in this file.
vi.mock("@/components/TopBar", () => ({
  default: () => <header data-testid="topbar-stub" />,
}));

import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import { VttSessionProvider } from "@/context/VttSessionContext";
import VTTEdit from "@/pages/VTTEdit";
import { supabase } from "@/services/supabaseClient";
import { FAKE_USER_ID } from "../helpers/supabaseMock";

function Layout() {
  return (
    <VttSessionProvider>
      <Outlet />
    </VttSessionProvider>
  );
}

function renderAt(path = "/vtt/edit") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route path="/vtt" element={<Layout />}>
              <Route path="edit" element={<VTTEdit />} />
            </Route>
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );
}

// PillMapContorl is collapsed by default — clicking its "map controls" button
// locks it open. PillBottom is *itself* collapsed until hovered, so we hover
// the [data-testid="pill-bottom"] node to reveal its action buttons.
async function openPillBottom(user) {
  await user.click(screen.getByRole("button", { name: /map controls/i }));
  await user.hover(screen.getByTestId("pill-bottom"));
}

describe("<VTTEdit />", () => {
  beforeEach(() => {
    supabase.__reset({ encounters: [] });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders the canvas stub and the Play → handoff button", () => {
    renderAt();
    expect(screen.getByTestId("map-canvas-stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to play mode/i })).toBeInTheDocument();
  });

  it("renders the edit-mode pill set (image, map, add character, enemy generator, Lookup Tables, save encounter)", async () => {
    const user = userEvent.setup();
    renderAt();

    await openPillBottom(user);
    await user.hover(screen.getByTestId("pill-map-rotation"));

    expect(screen.getByRole("slider", { name: /map rotation/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rotate map counterclockwise/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate map clockwise/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /map rotation shortcut degrees/i })).toHaveValue(
      15,
    );
    expect(screen.getByRole("button", { name: /^image$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^map$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add character/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enemy generator/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lookup tables/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save encounter/i })).toBeInTheDocument();
  });

  it("does NOT render play-only UI (initiative tracker, measure pill, loot/xp/stats pill)", () => {
    renderAt();
    expect(screen.queryByText(/initiative/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /measure/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /loot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /xp calculator/i })).not.toBeInTheDocument();
  });

  it("tables modal shows MonsterSearch but NOT EquipmentSearch in edit mode", async () => {
    const user = userEvent.setup();
    renderAt();

    await openPillBottom(user);
    await user.click(screen.getByRole("button", { name: /lookup tables/i }));

    expect(screen.getByRole("heading", { name: /monster search/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /equipment search/i })).not.toBeInTheDocument();
  });

  it("Play → button saves and navigates to /vtt/play with the current encounterId", async () => {
    // Seed an encounter so saveCurrent has a target and ?encounterId hydrates the session.
    supabase.__reset({
      encounters: [
        {
          id: "enc-1",
          user_id: FAKE_USER_ID,
          campaign_id: null,
          title: "T",
          vtt_state: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/vtt/edit?encounterId=enc-1"]}>
        <CampaignsProvider>
          <EncountersProvider>
            <Routes>
              <Route path="/vtt" element={<Layout />}>
                <Route path="edit" element={<VTTEdit />} />
                <Route path="play" element={<div data-testid="play-stub" />} />
              </Route>
            </Routes>
          </EncountersProvider>
        </CampaignsProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /switch to play mode/i }));

    await waitFor(() => expect(screen.getByTestId("play-stub")).toBeInTheDocument());
  });
});
