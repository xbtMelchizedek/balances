import type { ChainId, Token } from "./types";

/** Demo tokens only. Addresses are not live contracts. */
export const TOKENS: Token[] = [
  {
    id: "flop",
    symbol: "FLOP",
    name: "FLOP (demo)",
    chain: "flop",
    decimals: 18,
    address: "demo:flop",
    verified: true,
    buySellTaxBps: 0n,
    liquidity: "major",
  },
  {
    id: "hype",
    symbol: "HYPE",
    name: "HYPE (demo)",
    chain: "hyperevm",
    decimals: 18,
    address: "demo:hype",
    verified: true,
    buySellTaxBps: 0n,
    liquidity: "major",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin (demo)",
    chain: "hyperevm",
    decimals: 6,
    address: "demo:usdc",
    verified: true,
    buySellTaxBps: 0n,
    liquidity: "stable",
  },
  {
    id: "loaves",
    symbol: "LOAVES",
    name: "Loaves (demo meme)",
    chain: "hyperevm",
    decimals: 18,
    address: "demo:loaves",
    verified: false,
    buySellTaxBps: 300n, // 3% transfer tax, fictional
    liquidity: "meme",
  },
];

export const CHAIN_LABEL: Record<ChainId, string> = {
  flop: "FLOP chain",
  hyperevm: "HyperEVM",
};

/** Simulated demo-wallet balances, in base units. */
export const DEMO_BALANCES: Record<string, bigint> = {
  flop: 1_000n * 10n ** 18n,
  hype: 50n * 10n ** 18n,
  usdc: 250n * 10n ** 6n,
  loaves: 0n,
};

export function tokenById(id: string): Token | undefined {
  return TOKENS.find((t) => t.id === id);
}

export function searchTokens(
  query: string,
  chain?: ChainId | "all",
): Token[] {
  const q = query.trim().toLowerCase();
  return TOKENS.filter((t) => {
    if (chain && chain !== "all" && t.chain !== chain) return false;
    if (!q) return true;
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase() === q ||
      t.id.toLowerCase() === q
    );
  });
}

export const PRESETS = [
  {
    id: "flop-hype",
    label: "FLOP ⇄ HYPE",
    sell: "flop",
    buy: "hype",
    blurb: "Single hash-lock route. Same sha256 preimage opens both legs.",
  },
  {
    id: "flop-loaves",
    label: "FLOP ⇄ meme",
    sell: "flop",
    buy: "loaves",
    blurb: "Two hops: FLOP → HYPE by hash-lock, then HYPE → LOAVES on a mock meme pool.",
  },
] as const;
