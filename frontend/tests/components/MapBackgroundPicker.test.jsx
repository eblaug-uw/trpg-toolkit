import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapBackgroundPicker from "@/components/MapBackgroundPicker";

vi.mock("@/services/vttStorage", () => ({
  listImages: vi.fn().mockResolvedValue(["tavern.jpg"]),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/tavern.jpg"),
}));

describe("<MapBackgroundPicker /> — name propagation", () => {
  it("calls onSelect with both url and name", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <MapBackgroundPicker
        onSelect={onSelect}
        pixelsPerFoot={12}
        onChangePixelsPerFoot={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("img", { name: "tavern.jpg" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("img", { name: "tavern.jpg" }).closest("button"));

    expect(onSelect).toHaveBeenCalledWith("https://signed.example/tavern.jpg", "tavern.jpg");
  });
});
