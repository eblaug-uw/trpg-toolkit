import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import { VttSessionProvider } from "@/context/VttSessionContext";
import VTTEdit from "@/pages/VTTEdit";

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
    localStorage.clear();
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
    localStorage.setItem(
      "trpg:encounters",
      JSON.stringify([{ id: "enc-1", title: "T", campaignId: null, vttState: null }]),
    );
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

    expect(screen.getByTestId("play-stub")).toBeInTheDocument();
  });
});
