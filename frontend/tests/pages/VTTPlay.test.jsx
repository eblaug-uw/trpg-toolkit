import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { CampaignsProvider } from "@/context/CampaignsContext";
import { EncountersProvider } from "@/context/EncountersContext";
import { VttSessionProvider } from "@/context/VttSessionContext";
import VTTPlay from "@/pages/VTTPlay";

vi.mock("@/components/MapCanvas", () => ({
  default: vi.fn(() => <div data-testid="map-canvas-stub" />),
}));
vi.mock("@/services/vttStorage", () => ({
  getSignedUrl: vi.fn(async () => "blob://mock-url"),
}));
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

function renderAt(path = "/vtt/play") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route path="/vtt" element={<Layout />}>
              <Route path="play" element={<VTTPlay />} />
              <Route path="edit" element={<div data-testid="edit-stub" />} />
            </Route>
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </MemoryRouter>,
  );
}

async function openPillBottom(user) {
  await user.click(screen.getByRole("button", { name: /map controls/i }));
  await user.hover(screen.getByTestId("pill-bottom"));
}

describe("<VTTPlay />", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the canvas stub, initiative tracker, and ← Edit button", () => {
    renderAt();
    expect(screen.getByTestId("map-canvas-stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to edit mode/i })).toBeInTheDocument();
    // InitiativeTracker shows a "Roll" button before combat starts
    expect(screen.getByRole("button", { name: /roll/i })).toBeInTheDocument();
  });

  it("renders PillBottom with Tables + Save only (no edit-only buttons)", async () => {
    const user = userEvent.setup();
    renderAt();

    await openPillBottom(user);

    expect(screen.getByRole("button", { name: /lookup tables/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save encounter/i })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^image$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^map$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add character/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enemy generator/i })).not.toBeInTheDocument();
  });

  it("tables modal shows MonsterSearch AND EquipmentSearch", async () => {
    const user = userEvent.setup();
    renderAt();

    await openPillBottom(user);
    await user.click(screen.getByRole("button", { name: /lookup tables/i }));

    expect(screen.getByRole("heading", { name: /monster search/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /equipment search/i })).toBeInTheDocument();
  });

  it("does NOT render the grid pill (grid is locked from edit mode)", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: /map controls/i }));
    expect(screen.queryByRole("button", { name: /grid/i })).not.toBeInTheDocument();
  });

  it("← Edit button navigates to /vtt/edit", async () => {
    const user = userEvent.setup();
    renderAt("/vtt/play?encounterId=enc-1");
    await user.click(screen.getByRole("button", { name: /switch to edit mode/i }));
    expect(screen.getByTestId("edit-stub")).toBeInTheDocument();
  });
});
