/** Public, documented swap-flow rules, expressed as our own helpers. */

import type { ChainId, Token } from "./types";
import { BPS_DENOMINATOR } from "./quoteMath";

/** Published Matcha help copy: warn when a limit is more than 5% worse than market. */
export const LIMIT_WORSE_BPS = 500n;

/** Published Matcha help copy: a limit expires in 1 hour by default. */
export const DEFAULT_LIMIT_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Demo-only adverse move applied when a firm quote is refreshed after expiry.
 * Not a live market. 40 bps is enough to be visible and still far from the
 * high-impact block threshold.
 */
export const DEMO_REFRESH_ADVERSE_BPS = 40n;

export type SettlementNeed =
  | { kind: "same-chain"; chain: ChainId }
  | { kind: "cross-chain" };

/** A pair on one chain needs that wallet network; a cross-chain pair does not. */
export function settlementNeed(sell: Token, buy: Token): SettlementNeed {
  if (sell.chain === buy.chain) {
    return { kind: "same-chain", chain: sell.chain };
  }
  return { kind: "cross-chain" };
}

/**
 * If the demo wallet is on the wrong chain for a same-chain pair, return the
 * chain the user should switch to. Cross-chain pairs return null.
 */
export function needsNetworkSwitch(
  walletChain: ChainId,
  sell: Token,
  buy: Token,
): ChainId | null {
  const need = settlementNeed(sell, buy);
  if (need.kind === "cross-chain") return null;
  return need.chain !== walletChain ? need.chain : null;
}

/**
 * A limit is worse than market when the named receive amount is more than
 * `thresholdBps` below the mid-market receive amount for the same pay-with size.
 */
export function isLimitWorseThanMarket(
  limitBuyAmount: bigint,
  midBuyAmount: bigint,
  thresholdBps: bigint = LIMIT_WORSE_BPS,
): boolean {
  if (midBuyAmount <= 0n) return false;
  if (limitBuyAmount < 0n) {
    throw new RangeError("limitBuyAmount must be >= 0");
  }
  if (thresholdBps < 0n || thresholdBps > BPS_DENOMINATOR) {
    throw new RangeError(`threshold bps out of range: ${thresholdBps.toString()}`);
  }
  const floor =
    (midBuyAmount * (BPS_DENOMINATOR - thresholdBps)) / BPS_DENOMINATOR;
  return limitBuyAmount < floor;
}

/** True when a new firm quote pays the user strictly less than the reviewed one. */
export function isWorseQuote(
  reviewedBuyAmount: bigint,
  nextBuyAmount: bigint,
): boolean {
  if (reviewedBuyAmount < 0n || nextBuyAmount < 0n) {
    throw new RangeError("buy amounts must be >= 0");
  }
  return nextBuyAmount < reviewedBuyAmount;
}

export function applyAdverseBps(amount: bigint, adverseBps: bigint): bigint {
  if (amount < 0n) {
    throw new RangeError("amount must be >= 0");
  }
  if (adverseBps < 0n || adverseBps > BPS_DENOMINATOR) {
    throw new RangeError(`adverse bps out of range: ${adverseBps.toString()}`);
  }
  return (amount * (BPS_DENOMINATOR - adverseBps)) / BPS_DENOMINATOR;
}
