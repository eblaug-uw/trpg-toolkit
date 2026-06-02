import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapBackgroundPicker from "@/components/MapBackgroundPicker";
import { getSignedThumbnailUrls, getSignedUrl } from "@/services/vttStorage";

vi.mock("@/services/vttStorage", () => ({
  listImages: vi.fn().mockResolvedValue(["tavern.jpg"]),
  getSignedThumbnailUrls: vi.fn(async (_bucket, _names, _expires, onThumbnail) => {
    const thumbnail = { name: "tavern.jpg", url: "https://signed.example/tavern-thumb.jpg" };
    onThumbnail?.(thumbnail);
    return [thumbnail];
  }),
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/tavern.jpg"),
}));

describe("<MapBackgroundPicker /> - name propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses thumbnails for the grid and selects the full-resolution map URL", async () => {
    const onSelect = vi.fn();

    render(
      <MapBackgroundPicker
        onSelect={onSelect}
        pixelsPerFoot={12}
        onChangePixelsPerFoot={vi.fn()}
      />,
    );

    const image = await screen.findByRole("img", { name: "tavern.jpg" });
    expect(image).toHaveAttribute("src", "https://signed.example/tavern-thumb.jpg");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(getSignedThumbnailUrls).toHaveBeenCalledWith(
      "maps",
      ["tavern.jpg"],
      undefined,
      expect.any(Function),
    );
    expect(getSignedUrl).not.toHaveBeenCalled();

    fireEvent.click(image.closest("button"));
    expect(onSelect).toHaveBeenCalledWith("https://signed.example/tavern-thumb.jpg", "tavern.jpg");

    await waitFor(() => {
      expect(getSignedUrl).toHaveBeenCalledWith("maps", "tavern.jpg");
      expect(onSelect).toHaveBeenCalledWith("https://signed.example/tavern.jpg", "tavern.jpg");
    });
  });

  it("selects the thumbnail without waiting for full-resolution URL signing", async () => {
    let resolveOriginalUrl;
    getSignedUrl.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOriginalUrl = resolve;
        }),
    );
    const onSelect = vi.fn();

    render(
      <MapBackgroundPicker
        onSelect={onSelect}
        pixelsPerFoot={12}
        onChangePixelsPerFoot={vi.fn()}
      />,
    );

    const image = await screen.findByRole("img", { name: "tavern.jpg" });
    fireEvent.click(image.closest("button"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("https://signed.example/tavern-thumb.jpg", "tavern.jpg");

    resolveOriginalUrl("https://signed.example/tavern.jpg");

    await waitFor(() => {
      expect(onSelect).toHaveBeenLastCalledWith("https://signed.example/tavern.jpg", "tavern.jpg");
    });
  });

  it("falls back to the original map URL when a transformed thumbnail cannot load", async () => {
    render(
      <MapBackgroundPicker onSelect={vi.fn()} pixelsPerFoot={12} onChangePixelsPerFoot={vi.fn()} />,
    );

    const image = await screen.findByRole("img", { name: "tavern.jpg" });
    fireEvent.error(image);

    await waitFor(() => {
      expect(image).toHaveAttribute("src", "https://signed.example/tavern.jpg");
    });
  });

  it("renders map slots before thumbnail signing finishes", async () => {
    let resolveThumbnails;
    getSignedThumbnailUrls.mockImplementationOnce(
      (_bucket, _names, _expires, onThumbnail) =>
        new Promise((resolve) => {
          resolveThumbnails = () => {
            const thumbnail = {
              name: "tavern.jpg",
              url: "https://signed.example/tavern-thumb.jpg",
            };
            onThumbnail(thumbnail);
            resolve([thumbnail]);
          };
        }),
    );

    render(
      <MapBackgroundPicker onSelect={vi.fn()} pixelsPerFoot={12} onChangePixelsPerFoot={vi.fn()} />,
    );

    expect(await screen.findByLabelText("Loading tavern.jpg")).toBeInTheDocument();
    expect(screen.queryByText("Loading Maps...")).not.toBeInTheDocument();

    resolveThumbnails();

    expect(await screen.findByRole("img", { name: "tavern.jpg" })).toHaveAttribute(
      "src",
      "https://signed.example/tavern-thumb.jpg",
    );
  });
});
