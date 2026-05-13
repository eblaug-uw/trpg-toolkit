import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillBottom from "@/components/PillBottom";

const setup = (overrides = {}) => {
  const props = {
    onImage: vi.fn(),
    onMap: vi.fn(),
    onAddCharacter: vi.fn(),
    onEnemyGenerator: vi.fn(),
    onTables: vi.fn(),
    onSaveEncounter: vi.fn(),
    ...overrides,
  };
  return { ...render(<PillBottom {...props} />), props, user: userEvent.setup() };
};

describe("<PillBottom /> save button", () => {
  it("fires onSaveEncounter when the save button is clicked", async () => {
    const { container, user, props } = setup();
    await user.hover(container.firstChild);
    await user.click(screen.getByRole("button", { name: /save encounter/i }));
    expect(props.onSaveEncounter).toHaveBeenCalledTimes(1);
  });
});
