# balances

> "A just balance and scales are the Lord's." (Proverbs 16:11)

A small React + TypeScript (Vite) UI kit for swap flows. It implements
Matcha-grade UX patterns as reusable components, with a demo screen for
**FLOP ⇄ HYPE** and **FLOP ⇄ meme**. Every action is simulated and labelled
**DEMO**. There is no wallet connector, no signing, and no real transaction.

This project is not affiliated with Matcha or 0x. Matcha's production frontend
is closed source. The patterns here come from public Matcha help articles and
blog posts, 0x API documentation, and the Apache-2.0 examples under
[0xProject/0x-examples](https://github.com/0xProject/0x-examples). No
proprietary code, CSS, fonts, or brand assets were copied. Matcha's terms
prohibit reverse engineering the App, so we did not run REA or static analysis
against matcha.xyz. The UX write-up is in [docs/MATCHA_UX.md](docs/MATCHA_UX.md);
the behavior spec and terms decision are in
[docs/MATCHA_BEHAVIOR.md](docs/MATCHA_BEHAVIOR.md).

The mock "Best route" for FLOP ⇄ HYPE is the hash-lock idea from
[talents](https://github.com/xbtMelchizedek/talents): a FLOP tclk escrow and a
HyperEVM `HashLockEscrow` that share a 32-byte sha256 preimage. FLOP ⇄ meme is
two hops (hash-lock to HYPE, then a mock meme pool). None of that is executed
here.

## What you get

Reusable components:

- `TokenSelect` — search by name, symbol, or demo address; chain filter;
  verified / unverified acknowledgement; balances; buy/sell-tax badge
- `QuoteCard` — all-in output, minimum received, price impact, fees, network
  cost, and a split route
- `SlippageControl` — Auto or manual, 0.5% manual default, warn at 1%,
  acknowledgement at 5%
- `ApprovalStepper` — gasless (combined Permit2 signature) or standard
  (one-time approve, then place). Copy names the spender rule: Permit2 or
  AllowanceHolder, never Settler
- `TxProgress` — submitted, pending, confirmed, or failed
- `StaleQuote` — 20-second countdown, then a blocking expired banner
- `ErrorState` — specific, actionable failures

The quote provider is **mock only**. The live 0x Swap API requires an API key,
so this kit does not call it.

## Run it

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

`npm test` runs Vitest + Testing Library (slippage math, minimum received, the
stale-quote timer, either-side amounts, worse-quote re-review, network switch,
limit warnings, and error states). `python3 scripts/secret_scan.py` scans
the tree for secret-like strings before a push.

## Matcha-grade rules this demo follows

1. Quote the amount that should arrive, all-in.
2. Itemise minimum received, price impact, fees, and the route.
3. Default manual slippage to 0.5%. Auto still shows the number it picked.
4. A firm quote expires in 20 seconds; Place Order is disabled until refresh.
5. Approve the least authority, and name the spender.
6. Review, then place — two steps, not one.
7. Fail closed, and say why.
8. Warn on identity and impact, not only on price.
9. Let the user type on either side, and say so when a short balance was caused by entering the receive amount.
10. If a refreshed firm quote is worse, review the new number before placing.
11. On a same-chain pair, prompt "Switch to [network] network" and keep the amount.
12. Limits expire in 1 hour by default and warn, with an acknowledgement, when they are more than 5% worse than mid.

The full checklist lives in the UX notes filed with this work. Settings is a
dialog: Escape or close returns focus to the opener, and token search is
focused when the picker opens.

## License

MIT
