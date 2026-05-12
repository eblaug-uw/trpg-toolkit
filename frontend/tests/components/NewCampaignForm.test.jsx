import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewCampaignForm from "@/components/NewCampaignForm";

const setup = (overrides = {}) => {
  const props = {
    onCreate: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const utils = render(<NewCampaignForm {...props} />);
  return { ...utils, props, user: userEvent.setup() };
};

describe("<NewCampaignForm />", () => {
  it("disables Create when the input is empty", () => {
    setup();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("disables Create when the input is whitespace only", async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/my new campaign/i), "   ");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables Create once the input has non-whitespace content", async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/my new campaign/i), "New Saga");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("fires onCreate with the trimmed title on submit", async () => {
    const { user, props } = setup();
    await user.type(screen.getByPlaceholderText(/my new campaign/i), "  Curse of Strahd  ");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(props.onCreate).toHaveBeenCalledWith("Curse of Strahd");
  });

  it("fires onCancel when Cancel is clicked", async () => {
    const { user, props } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
