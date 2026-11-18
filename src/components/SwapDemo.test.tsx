import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SwapDemo } from "./SwapDemo";

describe("SwapDemo", () => {
  it("reviews a FLOP to HYPE quote and can expire it", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("button", { name: "Connect demo wallet" }));
    await user.click(screen.getByTestId("primary-action"));
    expect(await screen.findByTestId("quote-card")).toBeInTheDocument();
    expect(screen.getByTestId("quote-timer")).toHaveTextContent(/Quote expires in/);
    await user.click(screen.getByTestId("expire-quote"));
    expect(await screen.findByTestId("stale-banner")).toBeInTheDocument();
    expect(screen.getByTestId("primary-action")).toBeDisabled();
    await user.click(screen.getByTestId("refresh-quote"));
    expect(await screen.findByTestId("quote-timer")).toBeInTheDocument();
    expect(screen.queryByTestId("stale-banner")).toBeNull();
  });

  it("blocks a swap that is larger than the demo balance", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("button", { name: "Connect demo wallet" }));
    const amount = screen.getByLabelText("Pay with amount");
    await user.clear(amount);
    await user.type(amount, "5000");
    expect(await screen.findByTestId("error-state")).toHaveTextContent(
      "Insufficient balance",
    );
    expect(screen.getByTestId("primary-action")).toBeDisabled();
  });

  it("asks for an acknowledgement before using the unverified meme token", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("tab", { name: "FLOP ⇄ meme" }));
    await user.click(screen.getByTestId("token-select-receive-opener"));
    await user.click(screen.getByTestId("token-select-receive-option-loaves"));
    expect(await screen.findByTestId("unverified-ack")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use LOAVES anyway" }));
    expect(screen.getByTestId("token-select-receive")).toHaveTextContent("LOAVES");
  });
});
