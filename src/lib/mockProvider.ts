import { BPS_DENOMINATOR } from "./quoteMath";
import { TOKENS, tokenById } from "./tokens";
import type { Quote, RoutePlan, Token, TradeError } from "./types";

export type QuoteRequest = {
  sellToken: Token;
  buyToken: Token;
  sellAmount: bigint;
  firm: boolean;
  nowMs: number;
  ttlMs: number;
};

const RATES: Record<string, number> = {
  // Mid price of 1 sell unit, in buy units. Demo figures only.
  "flop:hype": 0.02,
  "hype:flop": 50,
  "flop:usdc": 0.4,
  "usdc:flop": 2.5,
  "hype:usdc": 20,
  "usdc:hype": 0.05,
  "hype:loaves": 80,
  "loaves:hype": 0.012,
  "flop:loaves": 1.6,
  "loaves:flop": 0.6,
  "usdc:loaves": 4,
  "loaves:usdc": 0.25,
};

function rateKey(sell: Token, buy: Token): string {
  return `${sell.id}:${buy.id}`;
}

function htlcRoute(sell: Token, buy: Token): RoutePlan | null {
  const pair = rateKey(sell, buy);
  if (pair === "flop:hype" || pair === "hype:flop") {
    return {
      label: "Best route",
      settlement:
        "Hash-lock atomic swap: FLOP tclk escrow ⇄ HyperEVM HashLockEscrow. One 32-byte sha256 preimage claims both legs. No bridge.",
      hops: [
        {
          venue: "FLOP tclk hash escrow",
          shareBps: 5_000n,
          note: "Initiator timeout must exceed the responder's, plus a margin.",
        },
        {
          venue: "HyperEVM HashLockEscrow",
          shareBps: 5_000n,
          note: "Claim with the preimage; refund after the timeout.",
        },
      ],
    };
  }
  if (
    pair === "flop:loaves" ||
    pair === "loaves:flop" ||
    pair === "flop:usdc" ||
    pair === "usdc:flop"
  ) {
    const via = pair.includes("loaves") ? "HYPE" : "USDC";
    return {
      label: "Best route",
      settlement: `Two hops, both non-custodial: FLOP ⇄ ${via} by hash-lock, then ${via} ⇄ ${buy.symbol === "FLOP" ? sell.symbol : buy.symbol} on a mock venue. Only the revealed preimage moves value across chains.`,
      hops: [
        {
          venue: "FLOP tclk ⇄ HashLockEscrow",
          shareBps: 6_000n,
          note: `FLOP ⇄ ${via} hash-lock.`,
        },
        {
          venue:
            via === "HYPE"
              ? "Mock meme pool (DEMO)"
              : "Mock stable pool (DEMO)",
          shareBps: 4_000n,
          note: `${via} ⇄ ${buy.symbol === "FLOP" ? sell.symbol : buy.symbol}.`,
        },
      ],
    };
  }
  if (pair === "hype:loaves" || pair === "loaves:hype") {
    return {
      label: "Best route",
      settlement: "Same-chain mock meme pool on HyperEVM. Demo only.",
      hops: [
        {
          venue: "Mock meme pool (DEMO)",
          shareBps: 10_000n,
        },
      ],
    };
  }
  if (pair === "hype:usdc" || pair === "usdc:hype") {
    return {
      label: "Best route",
      settlement: "Same-chain mock stable route on HyperEVM. Demo only.",
      hops: [{ venue: "Mock stable pool (DEMO)", shareBps: 10_000n }],
    };
  }
  if (pair === "usdc:loaves" || pair === "loaves:usdc") {
    return {
      label: "Best route",
      settlement: "Same-chain mock meme pool, quoted against USDC. Demo only.",
      hops: [{ venue: "Mock meme pool (DEMO)", shareBps: 10_000n }],
    };
  }
  return null;
}

function scale(amount: bigint, fromDec: number, toDec: number, rate: number): bigint {
  // Convert via a fixed 1e18 rate to stay in integers.
  const RATE_SCALE = 10n ** 18n;
  const rateInt = BigInt(Math.round(rate * 1e18));
  const asBase = amount * rateInt;
  if (toDec >= fromDec) {
    return (asBase * 10n ** BigInt(toDec - fromDec)) / RATE_SCALE;
  }
  return asBase / RATE_SCALE / 10n ** BigInt(fromDec - toDec);
}

function approxTokens(amount: bigint, decimals: number): number {
  const keep = Math.min(decimals, 6);
  const scale = 10n ** BigInt(decimals - keep);
  return Number(amount / scale) / 10 ** keep;
}

function impactHaircutBps(sell: Token, buy: Token, sellAmount: bigint): bigint {
  // Crude size-vs-liquidity model for the demo; not a market.
  // Uses whole-token units so large decimal amounts don't overflow Number.
  const size = approxTokens(sellAmount, sell.decimals);
  let base = 15n; // 0.15%
  if (sell.liquidity === "meme" || buy.liquidity === "meme") base = 80n;
  if (sell.liquidity === "volatile" || buy.liquidity === "volatile") base = 40n;
  if (sell.liquidity === "stable" && buy.liquidity === "stable") base = 2n;
  const sizeBump = BigInt(
    Math.min(800, Math.floor(Math.sqrt(Math.max(size, 0)) * 4)),
  );
  return base + sizeBump;
}

export function quoteError(req: QuoteRequest): TradeError | null {
  if (req.sellToken.id === req.buyToken.id) {
    return {
      kind: "no-route",
      title: "Pick two different tokens",
      detail: "A swap needs a pay-with token and a receive token that are not the same.",
    };
  }
  if (req.sellAmount <= 0n) {
    return {
      kind: "empty",
      title: "Enter an amount",
      detail: "Type how much you want to pay with, or a dollar value, to see a quote.",
    };
  }
  if (!RATES[rateKey(req.sellToken, req.buyToken)]) {
    return {
      kind: "no-route",
      title: "No route",
      detail: `The demo provider has no path from ${req.sellToken.symbol} to ${req.buyToken.symbol}.`,
      action: "Try FLOP ⇄ HYPE or FLOP ⇄ LOAVES.",
    };
  }
  return null;
}

export function getMockQuote(req: QuoteRequest): Quote {
  const err = quoteError(req);
  if (err && err.kind !== "empty") {
    throw new Error(err.title);
  }
  const rate = RATES[rateKey(req.sellToken, req.buyToken)];
  if (rate === undefined) {
    throw new Error("No route");
  }
  const mid = scale(
    req.sellAmount,
    req.sellToken.decimals,
    req.buyToken.decimals,
    rate,
  );
  const impact = impactHaircutBps(req.sellToken, req.buyToken, req.sellAmount);
  const afterImpact = (mid * (BPS_DENOMINATOR - impact)) / BPS_DENOMINATOR;
  // Tiny all-in fee + network rebate, taken from the buy side, for the breakdown.
  const feeBps =
    req.sellToken.liquidity === "stable" && req.buyToken.liquidity === "stable"
      ? 0n
      : 25n; // 0.25%
  const fee = (afterImpact * feeBps) / BPS_DENOMINATOR;
  // Flat demo network cost, smaller on a firm quote so the number is stable-ish.
  const dust = 10n ** BigInt(Math.max(req.buyToken.decimals - 4, 0));
  const network = dust * (req.firm ? 8n : 10n);
  let buyAmount = afterImpact - fee - network;
  if (buyAmount < 0n) buyAmount = 0n;
  const route = htlcRoute(req.sellToken, req.buyToken);
  if (!route) {
    throw new Error("No route");
  }
  return {
    id: `${req.firm ? "firm" : "indic"}-${req.nowMs}`,
    sellToken: req.sellToken,
    buyToken: req.buyToken,
    sellAmount: req.sellAmount,
    buyAmount,
    midBuyAmount: mid,
    feeBuyAmount: fee,
    networkCostBuyAmount: network,
    route,
    quotedAtMs: req.nowMs,
    ttlMs: req.ttlMs,
    firm: req.firm,
  };
}

export function feesExceedTrade(quote: Quote): boolean {
  return quote.buyAmount <= 0n || quote.feeBuyAmount + quote.networkCostBuyAmount >= quote.midBuyAmount;
}

export { TOKENS, tokenById };
