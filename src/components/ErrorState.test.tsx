import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";
import type { TradeError } from "../lib/types";

const expired: TradeError = {
  kind: "quote-expired",
  title: "This quote has expired",
  detail: "Refresh to get a new firm quote.",
  action: "Refresh quote",
};

const insufficient: TradeError = {
  kind: "insufficient-balance",
  title: "Insufficient balance",
  detail: "The demo wallet holds 10 FLOP, which is less than 25 FLOP.",
};

describe("ErrorState", () => {
  it("exposes the message as an alert", () => {
    render(<ErrorState error={insufficient} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Insufficient balance");
    expect(alert).toHaveTextContent("10 FLOP");
  });

  it("invokes the action when one is provided", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ErrorState error={expired} onAction={onAction} />);
    await user.click(screen.getByRole("button", { name: "Refresh quote" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders a hint, not a button, when there is no handler", () => {
    render(<ErrorState error={expired} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Refresh quote")).toBeInTheDocument();
  });
});
