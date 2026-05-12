import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSidebar from "@/components/CharacterSidebar";

const characters = [
  { id: "ch1", name: "Aelar" },
  { id: "ch2", name: "Borin" },
];

const setup = (overrides = {}) => {
  const props = {
    characters,
    onAddCharacter: vi.fn(),
    onManageCharacter: vi.fn(),
    ...overrides,
  };
  const utils = render(<CharacterSidebar {...props} />);
  return { ...utils, props, user: userEvent.setup() };
};

describe("<CharacterSidebar />", () => {
  it("renders open by default with all character rows", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Characters" })).toBeInTheDocument();
    expect(screen.getByText("Aelar")).toBeInTheDocument();
    expect(screen.getByText("Borin")).toBeInTheDocument();
  });

  it('fires onAddCharacter when "Add Character" is clicked', async () => {
    const { user, props } = setup();
    await user.click(screen.getByRole("button", { name: "Add Character" }));
    expect(props.onAddCharacter).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when there are no characters", () => {
    setup({ characters: [] });
    expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
  });

  it("collapses to a hamburger when Hide is clicked", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /hide/i }));

    expect(screen.queryByRole("heading", { name: "Characters" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Character" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show characters/i })).toBeInTheDocument();
  });

  it("re-expands when the hamburger is clicked", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /hide/i }));
    await user.click(screen.getByRole("button", { name: /show characters/i }));
    expect(screen.getByRole("heading", { name: "Characters" })).toBeInTheDocument();
  });

  it("fires onManageCharacter with the character when a row's Manage button is clicked", async () => {
    const { user, props } = setup();
    const manageButtons = screen.getAllByRole("button", { name: /manage/i });
    await user.click(manageButtons[0]);
    expect(props.onManageCharacter).toHaveBeenCalledWith(characters[0]);
  });
});
