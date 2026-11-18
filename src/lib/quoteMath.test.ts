import { describe, expect, it } from "vitest";
import {
  ACK_SLIPPAGE_BPS,
  BPS_DENOMINATOR,
  DEFAULT_SLIPPAGE_BPS,
  QUOTE_TTL_MS,
  WARN_SLIPPAGE_BPS,
  autoSlippageBps,
  formatBpsAsPercent,
  gradeImpact,
  isQuoteStale,
  minReceived,
  pairLiquidity,
  parseSlippageInput,
  priceImpactBps,
  remainingMs,
  slippageNeedsAck,
  slippageNeedsWarn,
} from "./quoteMath";
import { formatUnits, parseUnits, countdownLabel } from "./format";

describe("minReceived", () => {
  it("uses the 0.5% default: 10000 units yield 9950", () => {
    expect(minReceived(10_000n, DEFAULT_SLIPPAGE_BPS)).toBe(9_950n);
  });

  it("floors, and never rounds the user up", () => {
    // 100 * (10000-50) / 10000 = 99.5 -> 99
    expect(minReceived(100n, 50n)).toBe(99n);
  });

  it("is zero when slippage is 100%", () => {
    expect(minReceived(123456789n, BPS_DENOMINATOR)).toBe(0n);
  });

  it("is the full amount when slippage is 0", () => {
    expect(minReceived(999n, 0n)).toBe(999n);
  });

  it("rejects a negative buy amount or an out-of-range bps", () => {
    expect(() => minReceived(-1n, 50n)).toThrow(/buyAmount/);
    expect(() => minReceived(10n, -1n)).toThrow(/out of range/);
    expect(() => minReceived(10n, 10_001n)).toThrow(/out of range/);
  });

  it("scales to 18-decimal token amounts", () => {
    const buy = 2n * 10n ** 18n;
    const min = minReceived(buy, 50n);
    expect(min).toBe((buy * 9_950n) / 10_000n);
  });
});

describe("priceImpactBps", () => {
  it("is zero when the quote matches or beats mid", () => {
    expect(priceImpactBps(100n, 100n)).toBe(0n);
    expect(priceImpactBps(100n, 101n)).toBe(0n);
  });

  it("reports 200 bps when the quote is 2% below mid", () => {
    expect(priceImpactBps(10_000n, 9_800n)).toBe(200n);
  });

  it("floors a fractional impact", () => {
    // 3/10000 would be 3 bps if mid is 10000 and quote is 9997? 
    // (1000-999)*10000/1000 = 10
    expect(priceImpactBps(1000n, 999n)).toBe(10n);
  });

  it("rejects a zero mid", () => {
    expect(() => priceImpactBps(0n, 1n)).toThrow(/midBuyAmount/);
  });
});

describe("gradeImpact", () => {
  it("grades 0 as ok, 1% as warn, 3% as severe, 15% as block", () => {
    expect(gradeImpact(0n)).toBe("ok");
    expect(gradeImpact(99n)).toBe("ok");
    expect(gradeImpact(100n)).toBe("warn");
    expect(gradeImpact(300n)).toBe("severe");
    expect(gradeImpact(1_500n)).toBe("block");
  });
});

describe("autoSlippageBps", () => {
  it("stays at or under 0.5% for liquid pairs and widens, with a warning, for memes", () => {
    expect(autoSlippageBps("stable")).toEqual({ bps: 30n, warn: false });
    expect(autoSlippageBps("major")).toEqual({ bps: 50n, warn: false });
    expect(autoSlippageBps("volatile").warn).toBe(true);
    expect(autoSlippageBps("meme").bps).toBe(250n);
    expect(pairLiquidity("major", "meme")).toBe("meme");
    expect(pairLiquidity("stable", "major")).toBe("major");
  });
});

describe("slippage input", () => {
  it("parses percent strings into bps and rejects junk", () => {
    expect(parseSlippageInput("0.5")).toBe(50n);
    expect(parseSlippageInput("1")).toBe(100n);
    expect(parseSlippageInput("2.50")).toBe(250n);
    expect(parseSlippageInput("0")).toBe(0n);
    expect(parseSlippageInput("100")).toBe(10_000n);
    expect(parseSlippageInput("100.01")).toBeNull();
    expect(parseSlippageInput("1.234")).toBeNull();
    expect(parseSlippageInput("-1")).toBeNull();
    expect(parseSlippageInput("")).toBeNull();
    expect(parseSlippageInput("abc")).toBeNull();
  });

  it("formats bps without trailing zeros", () => {
    expect(formatBpsAsPercent(50n)).toBe("0.5%");
    expect(formatBpsAsPercent(100n)).toBe("1%");
    expect(formatBpsAsPercent(5n)).toBe("0.05%");
  });

  it("warns at 1% and requires an ack at 5%", () => {
    expect(slippageNeedsWarn(WARN_SLIPPAGE_BPS)).toBe(true);
    expect(slippageNeedsAck(ACK_SLIPPAGE_BPS)).toBe(true);
    expect(slippageNeedsAck(DEFAULT_SLIPPAGE_BPS)).toBe(false);
  });
});

describe("stale quote timer math", () => {
  const t0 = 1_000_000;

  it("is fresh until the 20 second deadline, then stale", () => {
    expect(isQuoteStale(t0, t0, QUOTE_TTL_MS)).toBe(false);
    expect(isQuoteStale(t0 + 19_999, t0, QUOTE_TTL_MS)).toBe(false);
    expect(isQuoteStale(t0 + 20_000, t0, QUOTE_TTL_MS)).toBe(true);
    expect(isQuoteStale(t0 + 20_001, t0, QUOTE_TTL_MS)).toBe(true);
  });

  it("clamps remaining time at zero", () => {
    expect(remainingMs(t0 + 5_000, t0, QUOTE_TTL_MS)).toBe(15_000);
    expect(remainingMs(t0 + 25_000, t0, QUOTE_TTL_MS)).toBe(0);
  });

  it("rejects non-finite clocks", () => {
    expect(() => isQuoteStale(Number.NaN, t0)).toThrow(/finite/);
  });
});

describe("formatUnits / parseUnits", () => {
  it("round-trips 18-decimal amounts", () => {
    const raw = 1_250_000_000_000_000_000n;
    expect(formatUnits(raw, 18)).toBe("1.25");
    expect(parseUnits("1.25", 18)).toBe(raw);
  });

  it("handles 6-decimal stables and zero", () => {
    expect(parseUnits("250", 6)).toBe(250_000_000n);
    expect(formatUnits(0n, 6)).toBe("0");
    expect(parseUnits("0.000001", 6)).toBe(1n);
  });

  it("rejects too many fraction digits", () => {
    expect(parseUnits("1.1234567", 6)).toBeNull();
    expect(parseUnits("-1", 18)).toBeNull();
  });
});

describe("countdownLabel", () => {
  it("ceils to whole seconds", () => {
    expect(countdownLabel(20_000)).toBe("Quote expires in 20s");
    expect(countdownLabel(1)).toBe("Quote expires in 1s");
    expect(countdownLabel(0)).toBe("Quote expires in 0s");
  });
});
