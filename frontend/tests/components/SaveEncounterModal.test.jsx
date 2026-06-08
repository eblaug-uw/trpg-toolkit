import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveEncounterModal from "@/components/SaveEncounterModal";

const sampleVttState = () => ({
  showGrid: true,
  pixelsPerFoot: 12,
  gridFineTune: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
  backgroundRef: { bucket: "maps", name: "tavern.jpg" },
  participants: [],
  combat: { active: false, round: 1, queue: [] },
  viewport: null,
});

const campaign = { id: "c1", title: "Lost Mines" };
const encounters = [{ id: "e1", title: "Goblin Ambush", campaign_id: "c1", vtt_state: null }];

const setup = (overrides = {}) => {
  const props = {
    isOpen: true,
    vttState: sampleVttState(),
    campaigns: [campaign],
    encounters,
    onSaveExisting: vi.fn(),
    onSaveNew: vi.fn(),
    onExportFile: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<SaveEncounterModal {...props} />), props, user: userEvent.setup() };
};

describe("<SaveEncounterModal />", () => {
  it("lists encounters for the chosen campaign", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText(/campaign/i), "c1");
    expect(screen.getByText("Goblin Ambush")).toBeInTheDocument();
  });

  it("saves into an existing encounter when one is selected", async () => {
    const { user, props } = setup();
    await user.selectOptions(screen.getByLabelText(/campaign/i), "c1");
    await user.click(screen.getByRole("button", { name: /save to "goblin ambush"/i }));
    expect(props.onSaveExisting).toHaveBeenCalledWith("e1", props.vttState);
  });

  it("creates a new encounter when given a title", async () => {
    const { user, props } = setup();
    await user.selectOptions(screen.getByLabelText(/campaign/i), "c1");
    await user.type(screen.getByPlaceholderText(/encounter name/i), "Lava Run");
    await user.click(screen.getByRole("button", { name: /save as new/i }));
    expect(props.onSaveNew).toHaveBeenCalledWith("c1", "Lava Run", props.vttState);
  });

  it("disables 'save as new' when no name is entered", async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText(/campaign/i), "c1");
    expect(screen.getByRole("button", { name: /save as new/i })).toBeDisabled();
  });

  it("calls onExportFile with the current vttState", async () => {
    const { user, props } = setup();
    await user.click(screen.getByRole("button", { name: /export to file/i }));
    expect(props.onExportFile).toHaveBeenCalledWith(props.vttState);
  });
});
