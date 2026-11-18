import { describe, expect, it } from "vitest";
import { tokenById } from "./tokens";
import {
  LIMIT_WORSE_BPS,
  applyAdverseBps,
  isLimitWorseThanMarket,
  isWorseQuote,
  needsNetworkSwitch,
  settlementNeed,
} from "./behavior";

const flop = tokenById("flop")!;
const hype = tokenById("hype")!;
const usdc = tokenById("usdc")!;
const loaves = tokenById("loaves")!;

describe("settlementNeed", () => {
  it("treats FLOP ⇄ HYPE as cross-chain", () => {
    expect(settlementNeed(flop, hype)).toEqual({ kind: "cross-chain" });
  });

  it("treats HYPE ⇄ USDC as a same-chain HyperEVM pair", () => {
    expect(settlementNeed(hype, usdc)).toEqual({
      kind: "same-chain",
      chain: "hyperevm",
    });
  });
});

describe("needsNetworkSwitch", () => {
  it("does not ask for a switch on a cross-chain pair", () => {
    expect(needsNetworkSwitch("flop", flop, hype)).toBeNull();
    expect(needsNetworkSwitch("hyperevm", flop, hype)).toBeNull();
  });

  it("asks to switch when the wallet is on the wrong chain", () => {
    expect(needsNetworkSwitch("flop", hype, loaves)).toBe("hyperevm");
    expect(needsNetworkSwitch("hyperevm", hype, usdc)).toBeNull();
  });
});

describe("isLimitWorseThanMarket", () => {
  it("warns when the limit is more than 5% below mid", () => {
    const mid = 10_000n;
    const justInside = 9_500n; // exactly 5% below, not worse than the threshold
    const worse = 9_499n;
    expect(isLimitWorseThanMarket(justInside, mid, LIMIT_WORSE_BPS)).toBe(false);
    expect(isLimitWorseThanMarket(worse, mid, LIMIT_WORSE_BPS)).toBe(true);
  });

  it("does not warn when the limit is at or above mid", () => {
    expect(isLimitWorseThanMarket(10_000n, 10_000n)).toBe(false);
    expect(isLimitWorseThanMarket(11_000n, 10_000n)).toBe(false);
  });
});

describe("isWorseQuote", () => {
  it("is true only when the new receive amount is strictly smaller", () => {
    expect(isWorseQuote(100n, 99n)).toBe(true);
    expect(isWorseQuote(100n, 100n)).toBe(false);
    expect(isWorseQuote(100n, 101n)).toBe(false);
  });
});

describe("applyAdverseBps", () => {
  it("haircuts 10_000 by 40 bps to 9_960", () => {
    expect(applyAdverseBps(10_000n, 40n)).toBe(9_960n);
  });
});
