import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StaleQuote } from "./StaleQuote";

describe("StaleQuote", () => {
  it("shows a countdown while the quote is fresh", () => {
    render(
      <StaleQuote
        quotedAtMs={1_000}
        ttlMs={20_000}
        nowMs={6_000}
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByTestId("quote-timer")).toHaveTextContent(
      "Quote expires in 15s",
    );
    expect(screen.queryByTestId("stale-banner")).toBeNull();
  });

  it("shows the expired banner at the deadline and refreshes on click", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <StaleQuote
        quotedAtMs={1_000}
        ttlMs={20_000}
        nowMs={21_000}
        onRefresh={onRefresh}
      />,
    );
    const banner = screen.getByTestId("stale-banner");
    expect(banner).toHaveTextContent("This quote has expired");
    expect(banner).toHaveAttribute("role", "alert");
    await user.click(screen.getByTestId("refresh-quote"));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
