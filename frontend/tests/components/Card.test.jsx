import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "@/components/Card";

describe("<Card />", () => {
  it("renders the title", () => {
    render(<Card title="Goblin Ambush" />);
    expect(screen.getByText("Goblin Ambush")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Card title="Goblin Ambush" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Goblin Ambush" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has role="button" when onClick is provided', () => {
    render(<Card title="Goblin Ambush" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Goblin Ambush" })).toBeInTheDocument();
  });

  it("has no button role when onClick is not provided", () => {
    render(<Card title="Goblin Ambush" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
