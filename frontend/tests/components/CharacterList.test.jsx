import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterList from "@/components/CharacterList";

// CharacterList renders a single <li>, so wrap it in a <ul> for valid markup
const renderRow = (props) =>
  render(
    <ul>
      <CharacterList {...props} />
    </ul>,
  );

describe("<CharacterList />", () => {
  it("renders the character name", () => {
    renderRow({ character: { id: "ch1", name: "Aelar" }, onManage: vi.fn() });
    expect(screen.getByText("Aelar")).toBeInTheDocument();
  });

  it("fires onManage with the character when Manage is clicked", async () => {
    const onManage = vi.fn();
    const character = { id: "ch1", name: "Aelar" };
    const user = userEvent.setup();
    renderRow({ character, onManage });

    await user.click(screen.getByRole("button", { name: /manage/i }));
    expect(onManage).toHaveBeenCalledWith(character);
  });
});
