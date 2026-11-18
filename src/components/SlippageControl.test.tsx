import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlippageControl } from "./SlippageControl";

describe("SlippageControl", () => {
  it("opens settings and can switch to the 0.5% manual default", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SlippageControl
        mode="auto"
        bps={50n}
        band="major"
        ackHigh={false}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("slippage-toggle"));
    expect(screen.getByText(/Auto picked 0.5%/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Manual" }));
    expect(onChange).toHaveBeenCalledWith({
      mode: "manual",
      bps: 50n,
      ackHigh: false,
    });
  });

  it("warns at 1% and asks for an acknowledgement at 5%", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SlippageControl
        mode="manual"
        bps={100n}
        band="major"
        ackHigh={false}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTestId("slippage-toggle"));
    expect(screen.getByTestId("slippage-warn")).toBeInTheDocument();
    rerender(
      <SlippageControl
        mode="manual"
        bps={500n}
        band="major"
        ackHigh={false}
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId("slippage-ack")).toBeInTheDocument();
    await user.click(screen.getByTestId("slippage-ack"));
    expect(onChange).toHaveBeenCalledWith({
      mode: "manual",
      bps: 500n,
      ackHigh: true,
    });
  });

  it("closes from the close button and on Escape, and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <SlippageControl
        mode="auto"
        bps={50n}
        band="major"
        ackHigh={false}
        onChange={() => {}}
      />,
    );
    const toggle = screen.getByTestId("slippage-toggle");
    await user.click(toggle);
    expect(screen.getByRole("dialog", { name: "Trade settings" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close trade settings" }));
    expect(screen.queryByRole("dialog", { name: "Trade settings" })).toBeNull();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    const dialog = screen.getByRole("dialog", { name: "Trade settings" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Trade settings" })).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
