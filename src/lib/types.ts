export type ChainId = "flop" | "hyperevm";

export type LiquidityBand = "stable" | "major" | "volatile" | "meme";

export type Token = {
  id: string;
  symbol: string;
  name: string;
  chain: ChainId;
  decimals: number;
  /** Demo-only identifier, not a live contract. */
  address: string;
  verified: boolean;
  /** Transfer tax in bps, if any. */
  buySellTaxBps: bigint;
  liquidity: LiquidityBand;
};

export type RouteHop = {
  venue: string;
  shareBps: bigint;
  note?: string;
};

export type RoutePlan = {
  label: string;
  /** Short description of the settlement idea (hash-lock, meme hop, …). */
  settlement: string;
  hops: RouteHop[];
};

export type Quote = {
  id: string;
  sellToken: Token;
  buyToken: Token;
  sellAmount: bigint;
  buyAmount: bigint;
  /** Mid-market buy amount, used to compute price impact. */
  midBuyAmount: bigint;
  feeBuyAmount: bigint;
  networkCostBuyAmount: bigint;
  route: RoutePlan;
  quotedAtMs: number;
  ttlMs: number;
  firm: boolean;
};

export type TradeErrorKind =
  | "empty"
  | "insufficient-balance"
  | "fees-exceed-trade"
  | "no-route"
  | "quote-expired"
  | "high-impact"
  | "unverified-token"
  | "network-mismatch"
  | "price-updated"
  | "limit-worse"
  | "unsupported";

export type TradeError = {
  kind: TradeErrorKind;
  title: string;
  detail: string;
  action?: string;
};
