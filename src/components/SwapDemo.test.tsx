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
    expect(screen.queryByTestId("stale-banner")).toBeNull();
    expect(await screen.findByTestId("price-updated")).toBeInTheDocument();
    expect(screen.getByTestId("primary-action")).toHaveTextContent(
      "Review updated quote",
    );
    await user.click(screen.getByTestId("review-updated-quote"));
    expect(screen.queryByTestId("price-updated")).toBeNull();
    expect(screen.getByTestId("primary-action")).toHaveTextContent(
      "Place order (DEMO)",
    );
    expect(screen.getByTestId("primary-action")).not.toBeDisabled();
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

  it("lets the user type on You receive and explains a short balance", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("button", { name: "Connect demo wallet" }));
    const receive = screen.getByLabelText("You receive amount");
    await user.clear(receive);
    // 500 HYPE would require far more than the 1,000 FLOP demo balance.
    await user.type(receive, "500");
    expect(await screen.findByTestId("error-state")).toHaveTextContent(
      "You entered the amount on You receive",
    );
    expect(screen.getByTestId("primary-action")).toBeDisabled();
  });

  it("keeps the pay-with amount when switching to Limit and warns at 5% worse", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("button", { name: "Connect demo wallet" }));
    expect(screen.getByLabelText("Pay with amount")).toHaveValue("25");
    await user.click(screen.getByRole("tab", { name: "Limit" }));
    expect(screen.getByLabelText("Pay with amount")).toHaveValue("25");
    expect(screen.getByTestId("limit-expiry")).toHaveTextContent(
      "expires in 1 hour by default",
    );
    const limit = await screen.findByTestId("limit-price");
    await user.clear(limit);
    await user.type(limit, "0.0001");
    expect(await screen.findByTestId("limit-worse")).toBeInTheDocument();
    expect(screen.getByTestId("primary-action")).toBeDisabled();
    await user.click(screen.getByTestId("limit-worse-ack"));
    expect(screen.getByTestId("primary-action")).not.toBeDisabled();
  });

  it("asks to switch networks for a same-chain pair and keeps the amount", async () => {
    const user = userEvent.setup();
    render(<SwapDemo />);
    await user.click(screen.getByRole("button", { name: "Connect demo wallet" }));
    await user.click(screen.getByTestId("token-select-pay-opener"));
    await user.click(screen.getByTestId("token-select-pay-option-hype"));
    await user.click(screen.getByTestId("token-select-receive-opener"));
    await user.click(screen.getByTestId("token-select-receive-option-usdc"));
    expect(await screen.findByTestId("network-switch")).toHaveTextContent(
      "Switch to HyperEVM network",
    );
    expect(screen.getByLabelText("Pay with amount")).toHaveValue("25");
    await user.click(screen.getByTestId("switch-network"));
    expect(screen.queryByTestId("network-switch")).toBeNull();
    expect(screen.getByLabelText("Pay with amount")).toHaveValue("25");
    expect(screen.getByTestId("primary-action")).toHaveTextContent("Review order");
  });
});
