import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillMeasure from "@/components/PillMeasure";

const setup = (props = {}) => {
  const onSetMeasureMode = vi.fn();
  const utils = render(
    <PillMeasure measureMode={null} onSetMeasureMode={onSetMeasureMode} {...props} />,
  );
  return { ...utils, onSetMeasureMode, user: userEvent.setup() };
};

describe("<PillMeasure />", () => {
  it("always renders the ruler icon", () => {
    const { container } = setup();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("keeps the menu hidden until the wrapper is hovered", () => {
    setup();
    expect(screen.queryByText("Squares")).not.toBeInTheDocument();
  });

  it("opens the menu on hover and renders every category heading", async () => {
    const { container, user } = setup();
    await user.hover(container.firstChild);
    expect(screen.getByText("Squares")).toBeInTheDocument();
    expect(screen.getByText("Lines")).toBeInTheDocument();
    expect(screen.getByText("Cones")).toBeInTheDocument();
    expect(screen.getByText("Circles")).toBeInTheDocument();
  });

  it("calls onSetMeasureMode with the id when an inactive button is clicked", async () => {
    const { container, user, onSetMeasureMode } = setup();
    await user.hover(container.firstChild);
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(onSetMeasureMode).toHaveBeenCalledWith("distance");
  });

  it("passes null to clear the mode when the currently-active button is clicked", async () => {
    const { container, user, onSetMeasureMode } = setup({ measureMode: "distance" });
    await user.hover(container.firstChild);
    fireEvent.click(screen.getByRole("button", { name: "Distance" }));
    expect(onSetMeasureMode).toHaveBeenCalledWith(null);
  });

  it("routes line-shape clicks to the matching id", async () => {
    const { container, user, onSetMeasureMode } = setup();
    await user.hover(container.firstChild);
    fireEvent.click(screen.getByRole("button", { name: "100×5" }));
    expect(onSetMeasureMode).toHaveBeenCalledWith("line-100x5");
  });
});
