import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { minReceived } from "../lib/quoteMath";
import { tokenById } from "../lib/tokens";
import type { Quote } from "../lib/types";
import { QuoteCard } from "./QuoteCard";

const flop = tokenById("flop")!;
const hype = tokenById("hype")!;

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    sellToken: flop,
    buyToken: hype,
    sellAmount: 25n * 10n ** 18n,
    buyAmount: 500_000_000_000_000_000n, // 0.5 HYPE
    midBuyAmount: 505_000_000_000_000_000n,
    feeBuyAmount: 1_000_000_000_000_000n,
    networkCostBuyAmount: 800_000_000_000_000n,
    route: {
      label: "Best route",
      settlement: "Hash-lock atomic swap.",
      hops: [
        { venue: "FLOP tclk hash escrow", shareBps: 5_000n },
        { venue: "HyperEVM HashLockEscrow", shareBps: 5_000n },
      ],
    },
    quotedAtMs: 1,
    ttlMs: 20_000,
    firm: true,
    ...over,
  };
}

describe("QuoteCard", () => {
  it("shows minimum received from the slippage math and the split route", async () => {
    const user = userEvent.setup();
    const q = quote();
    render(<QuoteCard quote={q} slippageBps={50n} />);
    const min = minReceived(q.buyAmount, 50n);
    expect(screen.getByText(/Minimum received/)).toBeInTheDocument();
    expect(screen.getByText(/0\.4975 HYPE/)).toBeInTheDocument();
    expect(min).toBe(497_500_000_000_000_000n);
    expect(screen.getByTestId("price-impact")).toBeInTheDocument();
    await user.click(screen.getByText("Best route"));
    expect(screen.getByText(/Hash-lock atomic swap/)).toBeInTheDocument();
    expect(screen.getByText("FLOP tclk hash escrow")).toBeInTheDocument();
  });
});
