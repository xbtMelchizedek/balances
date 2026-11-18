/** Integer quote math. Amounts are in token base units; slippage is in bps. */

export const BPS_DENOMINATOR = 10_000n;
export const DEFAULT_SLIPPAGE_BPS = 50n; // 0.5%, Matcha's published manual default
export const WARN_SLIPPAGE_BPS = 100n; // 1%
export const ACK_SLIPPAGE_BPS = 500n; // 5%
export const QUOTE_TTL_MS = 20_000; // Matcha's public "Quote expires in 20s"
export const IMPACT_WARN_BPS = 100n; // 1%
export const IMPACT_SEVERE_BPS = 300n; // 3%
export const IMPACT_BLOCK_BPS = 1_500n; // 15%

export type LiquidityBand = "stable" | "major" | "volatile" | "meme";
export type ImpactGrade = "ok" | "warn" | "severe" | "block";

export function assertBps(slippageBps: bigint): void {
  if (slippageBps < 0n || slippageBps > BPS_DENOMINATOR) {
    throw new RangeError(`slippage bps out of range: ${slippageBps.toString()}`);
  }
}

/**
 * Lowest buy amount the user will accept.
 * min = buyAmount * (10_000 - slippageBps) / 10_000, floored.
 */
export function minReceived(buyAmount: bigint, slippageBps: bigint): bigint {
  if (buyAmount < 0n) {
    throw new RangeError("buyAmount must be >= 0");
  }
  assertBps(slippageBps);
  return (buyAmount * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
}

/** Positive bps means the quote is worse than mid. Zero if the quote beats mid. */
export function priceImpactBps(
  midBuyAmount: bigint,
  quotedBuyAmount: bigint,
): bigint {
  if (midBuyAmount <= 0n) {
    throw new RangeError("midBuyAmount must be > 0");
  }
  if (quotedBuyAmount < 0n) {
    throw new RangeError("quotedBuyAmount must be >= 0");
  }
  if (quotedBuyAmount >= midBuyAmount) return 0n;
  return ((midBuyAmount - quotedBuyAmount) * BPS_DENOMINATOR) / midBuyAmount;
}

export function gradeImpact(impactBps: bigint): ImpactGrade {
  if (impactBps >= IMPACT_BLOCK_BPS) return "block";
  if (impactBps >= IMPACT_SEVERE_BPS) return "severe";
  if (impactBps >= IMPACT_WARN_BPS) return "warn";
  return "ok";
}

/** Per-pair Auto slippage. The chosen number must still be shown in the UI. */
export function autoSlippageBps(band: LiquidityBand): {
  bps: bigint;
  warn: boolean;
} {
  switch (band) {
    case "stable":
      return { bps: 30n, warn: false };
    case "major":
      return { bps: 50n, warn: false };
    case "volatile":
      return { bps: 100n, warn: true };
    case "meme":
      return { bps: 250n, warn: true };
  }
}

/** Wider of the two sides, so a meme/major pair uses the meme band. */
export function pairLiquidity(
  a: LiquidityBand,
  b: LiquidityBand,
): LiquidityBand {
  const rank: Record<LiquidityBand, number> = {
    stable: 0,
    major: 1,
    volatile: 2,
    meme: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

export function quoteDeadline(
  quotedAtMs: number,
  ttlMs = QUOTE_TTL_MS,
): number {
  return quotedAtMs + ttlMs;
}

export function isQuoteStale(
  nowMs: number,
  quotedAtMs: number,
  ttlMs = QUOTE_TTL_MS,
): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(quotedAtMs)) {
    throw new RangeError("timestamps must be finite");
  }
  return nowMs >= quoteDeadline(quotedAtMs, ttlMs);
}

export function remainingMs(
  nowMs: number,
  quotedAtMs: number,
  ttlMs = QUOTE_TTL_MS,
): number {
  return Math.max(0, quoteDeadline(quotedAtMs, ttlMs) - nowMs);
}

/**
 * Parse a percent string ("0.5", "1", "2.50") into bps.
 * At most two decimal places, so the unit is exactly one basis point.
 */
export function parseSlippageInput(raw: string): bigint | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  const fracBps = BigInt((frac + "00").slice(0, 2));
  const bps = BigInt(whole) * 100n + fracBps;
  if (bps > BPS_DENOMINATOR) return null;
  return bps;
}

export function formatBpsAsPercent(bps: bigint): string {
  assertBps(bps);
  const whole = bps / 100n;
  const frac = bps % 100n;
  if (frac === 0n) return `${whole.toString()}%`;
  const fracStr = frac.toString().padStart(2, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}%`;
}

export function slippageNeedsAck(bps: bigint): boolean {
  return bps >= ACK_SLIPPAGE_BPS;
}

export function slippageNeedsWarn(bps: bigint): boolean {
  return bps >= WARN_SLIPPAGE_BPS;
}
