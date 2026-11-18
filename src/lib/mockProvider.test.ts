import { describe, expect, it } from "vitest";
import { QUOTE_TTL_MS } from "./quoteMath";
import { tokenById } from "./tokens";
import { getMockQuote, sellAmountForBuyTarget } from "./mockProvider";

const flop = tokenById("flop")!;
const hype = tokenById("hype")!;

const base = {
  sellToken: flop,
  buyToken: hype,
  firm: false,
  nowMs: 1_000,
  ttlMs: QUOTE_TTL_MS,
};

describe("sellAmountForBuyTarget", () => {
  it("finds a pay-with amount that receives at least the target, all-in", () => {
    const want = getMockQuote({ ...base, sellAmount: 25n * 10n ** 18n }).buyAmount;
    const sell = sellAmountForBuyTarget({ ...base, targetBuyAmount: want });
    expect(sell).not.toBeNull();
    const quoted = getMockQuote({ ...base, sellAmount: sell! });
    expect(quoted.buyAmount).toBeGreaterThanOrEqual(want);
    const oneLess = getMockQuote({ ...base, sellAmount: sell! - 1n });
    expect(oneLess.buyAmount).toBeLessThan(want);
  });

  it("returns null when there is no route", () => {
    const same = sellAmountForBuyTarget({
      ...base,
      buyToken: flop,
      targetBuyAmount: 1n,
    });
    expect(same).toBeNull();
  });
});

describe("getMockQuote adverseBps", () => {
  it("pays strictly less after a 40 bps demo move", () => {
    const clean = getMockQuote({ ...base, sellAmount: 25n * 10n ** 18n, firm: true });
    const moved = getMockQuote({
      ...base,
      sellAmount: 25n * 10n ** 18n,
      firm: true,
      adverseBps: 40n,
    });
    expect(moved.buyAmount).toBeLessThan(clean.buyAmount);
  });
});
