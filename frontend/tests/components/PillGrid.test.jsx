import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillGrid from "@/components/PillGrid";

const setup = (overrides = {}) => {
  const props = {
    showGrid: true,
    onToggleGrid: vi.fn(),
    pixelsPerFoot: 50,
    onChangePixelsPerFoot: vi.fn(),
    gridFineTune: 0,
    onChangeGridFineTune: vi.fn(),
    gridOffsetX: 0,
    onChangeGridOffsetX: vi.fn(),
    gridOffsetY: 0,
    onChangeGridOffsetY: vi.fn(),
    ...overrides,
  };
  const utils = render(<PillGrid {...props} />);
  return { ...utils, props, user: userEvent.setup() };
};

describe("<PillGrid />", () => {
  it("keeps the controls hidden until hovered", () => {
    setup();
    expect(screen.queryByRole("button", { name: "toggle grid" })).not.toBeInTheDocument();
  });

  it("reveals all four sliders + the toggle button on hover", async () => {
    const { container, user } = setup();
    await user.hover(container.firstChild);

    expect(screen.getAllByRole("slider")).toHaveLength(3); // Y, X, fine-tune
    expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // px/ft number input
    expect(screen.getByRole("button", { name: "toggle grid" })).toBeInTheDocument();
  });

  it("passes a Number (not a string) to the px/ft callback", async () => {
    const { container, user, props } = setup();
    await user.hover(container.firstChild);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "75" } });

    expect(props.onChangePixelsPerFoot).toHaveBeenCalledWith(75);
    expect(props.onChangePixelsPerFoot).not.toHaveBeenCalledWith("75");
  });

  it("passes a Number from the X-offset slider", async () => {
    const { container, user, props } = setup();
    await user.hover(container.firstChild);

    const sliders = screen.getAllByRole("slider");
    // Order in the DOM: Y, X, fine-tune
    fireEvent.change(sliders[1], { target: { value: "12" } });

    expect(props.onChangeGridOffsetX).toHaveBeenCalledWith(12);
  });

  it("fires onToggleGrid when the toggle button is clicked", async () => {
    const { container, user, props } = setup();
    await user.hover(container.firstChild);

    fireEvent.click(screen.getByRole("button", { name: "toggle grid" }));
    expect(props.onToggleGrid).toHaveBeenCalledTimes(1);
  });

  it("shows the toggle button at full opacity when showGrid is true", async () => {
    const { container, user } = setup({ showGrid: true });
    await user.hover(container.firstChild);
    const btn = screen.getByRole("button", { name: "toggle grid" });
    expect(btn).toHaveStyle({ opacity: "1" });
  });

  it("shows the toggle button dimmed when showGrid is false", async () => {
    const { container, user } = setup({ showGrid: false });
    await user.hover(container.firstChild);
    const btn = screen.getByRole("button", { name: "toggle grid" });
    expect(btn).toHaveStyle({ opacity: "0.5" });
  });
});
