# Matcha-grade UX

Clean-room notes on the public UX of [Matcha](https://matcha.xyz), 0x's DEX aggregator, and on 0x's open swap-API examples. Written 18 November 2026 (America/New_York). Every link below was fetched this day and resolved (HTTP 200) unless a gap is called out.

**Source limits.** Matcha's production frontend is closed source. We did not copy, decompile, or reuse Matcha code, CSS, fonts, icons, or brand assets. These notes come only from:

- Official Matcha help articles and blog posts, and marketing copy on matcha.xyz.
- Official 0x docs, knowledge-base articles, case studies, and the Apache-2.0 examples at [github.com/0xProject/0x-examples](https://github.com/0xProject/0x-examples).
- Visible, documented product behaviour described on those pages (for example, the "Quote expires in 20s" line on the public swap marketing page).

Where a detail is not published, this file says so. Do not treat anything here as permission to sign, spend, or launch a token. 0x's live Swap API requires an API key; our reference kit uses a mock quote provider only.

The reference UI that applies these patterns is the public MIT repo [balances](https://github.com/xbtMelchizedek/balances). It is a demo: buttons run a simulated flow, clearly labelled DEMO, with no wallet signing and no real transactions.

---

## 1. Token picker

**Search.** The picker accepts a name, a symbol, or a contract address. Matcha says it built "one of the fastest search engines in Web3" and, in the current product, lists tokens without a manual listing process. New ERC-20s become searchable shortly after creation (the how-to post says 15 minutes; a later help article says the Token Registry API identifies a new token within 30 minutes). If the name is ambiguous, paste the contract address from a trusted explorer or CoinGecko — Matcha itself recommends this when similarly named tokens appear (for example, Rocket Pool Protocol vs Rocket Pool ETH).

Sources: [How to trade on Matcha](https://blog.matcha.xyz/article/how-to-trade-on-matcha-dex-aggregator), [Searching for tokens](https://help.matcha.xyz/articles/7044681668-searching-for-tokens-on-matcha), [Can't find a token](https://help.matcha.xyz/articles/8014127596-i-want-to-trade-a-specific-token-but-can-t-find-it-why-is-that).

**Chain filter.** Results can be filtered by chain. The homepage also breaks tokens into popular-by-volume, trending (filterable by chain), and recent trades, so the picker is not the only discovery surface.

**Network mismatch.** If the wallet's active network is not the network of the selected pair, the trade module prompts a switch ("Switch to Polygon network") and only then lets the trade proceed.

Source: [Searching for tokens](https://help.matcha.xyz/articles/7044681668-searching-for-tokens-on-matcha).

**Custom / unknown addresses.** Adding a custom address fails closed when the address is truncated, is not a token contract (wallet, dapp, or NFT), is on an unsupported chain, or is blocked for legal reasons. The help article tells the user to check the full address on an explorer.

Source: [Custom token address not working](https://help.matcha.xyz/articles/6363344200-i-tried-to-add-a-custom-token-address-but-it-s-not-working-what-could-be-the-problem).

**Verified vs unverified, taxes, research warnings.** Official pages do not publish a precise "unverified token" label or a Security Audit badge copy we could quote. What they do publish:

- Availability is not an endorsement. Users must do their own research ([Terms](https://matcha.xyz/terms); [buy/sell tax article](https://help.matcha.xyz/articles/2255748508-what-are-buy-sell-tax-tokens)).
- Buy/sell-tax tokens are detectable in 0x API v2. The tax goes to the token project, not Matcha. Trading them may require a high slippage band (the article mentions 10–20% as a possible accommodation, "your mileage may vary"). Users are pointed to liquidity on Dexscreener and contract checks on GoPlus or TokenSniffer.
- "Slippage and price impact warnings" are listed as a product feature on the public [swap-tokens page](https://matcha.xyz/swap-tokens).

For our builds: show wallet balances next to each row; mark catalog-verified tokens clearly; for unknown or custom addresses, show a blocking or acknowledgement warning that names the contract, warns that the ticker can be cloned, and asks the user to confirm the address before the token is selectable. Surface a buy/sell-tax badge when the quote or a public tax flag says one exists. Never treat a search-by-ticker hit as identity.

**Balances.** Help articles on Matcha Auto explain "Insufficient Balance" in detail: the button is disabled, and the copy must be specific. A common trap is entering the amount on the receive side, which causes the fee to be taken from the sell token and can make a seemingly sufficient wallet look short. The prescribed fix is to enter the amount on the "Pay with" field. That is a UX rule, not just a backend rule: explain *why* the balance is short.

Source: [What is Matcha Auto?](https://help.matcha.xyz/articles/6738511972-what-is-matcha-auto).

---

## 2. Quote card

Matcha's headline promise is "get the price you're quoted." The quote is an **all-in** number: what should land in the wallet after network costs, slippage allowance, and other on-chain variables, not a best-case mid-market rate. 0x's integrator docs name three prices — quoted, executed, and adjusted (after gas and fees) — and say routing should optimise for the adjusted price.

Sources: [Matcha on 0x v2](https://blog.matcha.xyz/article/matcha-on-0x-v2), [Get the price you're quoted](https://blog.matcha.xyz/article/get-the-price-youre-quoted), [Slippage, price impact, and prices](https://help.0x.org/articles/3626232596-slippage-price-impact-and-prices-what-integrators-need-to-know), [Matcha v2 case study](https://0x.org/case-studies/matcha-v2).

**Layout and labels** (from help and marketing copy, not from inspecting proprietary CSS):

- Sell side labelled **"Pay with"**; buy side labelled **"You receive"** or **"You receive (incl. fee)"** when Auto wraps the fee in.
- Amounts can be entered in token units or as a dollar value, on either side.
- A rate line (for example "1 ETH = 1562.76 USDC") plus a USD estimate.
- **Price impact** is a small figure shown under the buy-side price. It is the effect of *this* trade on the pool, knowable before signing, and is not slippage. Review it before proceeding; on thin books, split the order or use a limit. 0x Swap API v2 does **not** return `estimatedPriceImpact` — the integrator must compute it (a common method: compare USD sell value to USD buy value from an independent price).
- **Minimum received** is implied by the slippage tolerance: if the market moves past the threshold, the swap reverts rather than filling worse. Show this number in the review step, in token units.
- **Fees** are itemised, not hidden in the rate. With Matcha Auto, an info control on "You receive (incl. fee)" opens a breakdown: Network Cost Rebate (the gas that would have been paid in the native token) and the Auto fee (published as 0.25% for most pairs; stable-to-stable is published as 0% in the current fee table, though older posts sometimes say 0.05% — use the help-centre table). Network cost is also shown at the bottom of the widget. If fees exceed the trade size, the trade is blocked with "Fees exceed the size of the trade" and the user must raise the amount.
- **Route.** Clicking the "Best route" control opens a detailed routing graph (multiplex splits across sources, plus multi-hop via intermediate tokens). Marketing pages mention RFQ private fills alongside AMM hops, and a liquidity-provider line such as "0x RFQ." Show each hop and each venue's share. Do not leave "Best route" as a badge with no explanation.

Sources: [What is Price Impact?](https://help.matcha.xyz/articles/1090649325-what-is-price-impact), [What is Matcha Auto?](https://help.matcha.xyz/articles/6738511972-what-is-matcha-auto), [Are there any fees?](https://help.matcha.xyz/articles/1222339831-are-there-any-fees-to-make-a-trade), [Matcha on 0x v2](https://blog.matcha.xyz/article/matcha-on-0x-v2), [swap-tokens](https://matcha.xyz/swap-tokens).

**Indicative vs firm.** 0x's public examples split the UI into a Price view and a Quote view. `/price` is indicative: good for browsing and live updates, does not reserve liquidity. `/quote` is firm and is fetched only when the user is ready to trade. Do not hammer the firm-quote endpoint on every keystroke.

Source: [Build a token swap app](https://docs.0x.org/evm/0x-swap-api/guides/build-token-swap-dapp-nextjs), [0x-examples](https://github.com/0xProject/0x-examples).

---

## 3. Slippage defaults and auto-slippage

- In Matcha's **manual Trade Settings**, default **Max Slippage is 0.5%**. There are presets plus a custom field. "Use Defaults" resets slippage to 0.5%, gas to **Fast**, and liquidity sources to all sources on that chain. Gas can be Normal, Fast, or Urgent. Changing these is described as an advanced action.
- **Matcha Auto** removes manual slippage and gas. 0x "sets the optimal slippage tolerance per trade by default"; Auto also uses private mempools for MEV protection. The pitch is "no slippage or other settings to worry about" and "get the price you're quoted."
- The 0x Swap API itself, if `slippageBps` / `slippagePpm` is omitted, has historically defaulted to **100 bps (1%)** in troubleshooting docs. That is an API default, not the Matcha UI default. Prefer `slippagePpm` in new integrations. `0` means no slippage is tolerated.
- High slippage is sometimes needed for tax tokens (10–20% is mentioned as a possible band) but that must be an explicit, warned choice — a very high or unlimited setting "invites poor fills."
- Failed swaps often mean the price moved past the 0.5% default before inclusion. Users are told not to edit gas after they have confirmed.

Sources: [What are Trade Settings?](https://help.matcha.xyz/articles/1435011291-what-are-trade-settings), [What is Slippage?](https://help.matcha.xyz/articles/9351734886-what-is-slippage), [Matcha Auto](https://blog.matcha.xyz/article/matcha-auto), [Trade crypto for free](https://blog.matcha.xyz/article/trade-crypto-for-free), [0x troubleshooting](https://docs.0x.org/evm/0x-swap-api/guides/troubleshooting-swap-api.md), [0x getQuote](https://docs.0x.org/api-reference/evm-ap-is/gasless/getquote.md).

For our builds: default 0.5% in manual mode; an Auto mode that picks a per-pair tolerance (tighter on liquid majors and stables, wider on thin or volatile pairs) and **shows the chosen number**; warn at or above 1%, require a typed acknowledgement at or above 5%, and never silently raise slippage to make a swap succeed.

---

## 4. Approval, Permit2, and gasless

Two published flows exist. Matcha Auto is the default gasless path; Standard is a normal on-chain swap where the user pays gas.

**Permit2, one-time.** Matcha on 0x v2 uses Permit2 with **strict one-time allowances**, not time-bound infinite approvals. The v2 case study says this reduced allowance risk to "virtually 0." 0x's examples shout a hard rule: never set an allowance on the Settler contract; only on Permit2 or AllowanceHolder, and only the spender returned in `issues.allowance.spender`.

**AllowanceHolder vs Permit2** (from 0x, for integrators): AllowanceHolder is the recommended default (cheaper, one standard approval, no double signature). Permit2 is labelled advanced (double signature, optional time limits, useful for EIP-1271 wallets). Matcha itself emphasises one-time Permit2 for v2 security. Either way, the UI should name the spender and the amount, and should not ask for an unlimited approval unless the user opts into that.

**Gasless (Matcha Auto).** Approvals can be combined into the trade. The relayer pays native gas up front; the user pays in the token they are trading. The fee token is the *opposite* of the field the user typed into (type in "Pay with" → fee taken from "You receive", and vice versa). The user cannot pick the fee token. Token approvals and the swap can collapse into one signature, which is the onboarding win: a wallet that holds only the sell token can still trade.

**Standard button sequence.** Connect → select tokens → enter an amount → **Review Order** → check the details → **Place Order** → sign in the wallet. Review and Place are two steps, not one.

Sources: [Matcha on 0x v2](https://blog.matcha.xyz/article/matcha-on-0x-v2), [Matcha Auto case study](https://0x.org/case-studies/matcha), [What is Matcha Auto?](https://help.matcha.xyz/articles/6738511972-what-is-matcha-auto), [0x-examples README](https://github.com/0xProject/0x-examples), [Permit2 guide](https://docs.0x.org/evm/0x-swap-api/guides/permit2/swap-tokens-with-0x-swap-api-permit2).

---

## 5. Price refresh, countdown, and stale quotes

The public [swap-tokens](https://matcha.xyz/swap-tokens) page shows a **“Quote expires in 20s”** countdown next to the quoted amounts. 0x troubleshooting notes that a longer gap between quote and inclusion raises the chance the price has moved past slippage and the transaction reverts; a "fast" gas price shrinks that window.

For our builds:

- Show a visible countdown on the firm quote.
- When the timer hits zero, mark the quote **stale**, disable Place Order, and show a banner that asks the user to refresh. Do not silently swap in a new price and let them sign the old one, and do not auto-submit a refreshed worse price.
- Indicative prices may poll more often; firm quotes are fetched on Review and on explicit refresh.
- A refreshed quote that moved against the user should be obvious (old vs new minimum received) before they place again.

---

## 6. Limit orders

Toggle **Market** / **Limit** at the top of the trade module. Limits are a named price, not "or better": Matcha says they fill only at the exact limit price, and they are partially fillable until 100% filled or expiry.

- Creating a limit is free; the taker pays gas when it fills. Cancelling early costs native gas; expiry cancels at no cost.
- Native tokens are not supported — wrap first (ETH → WETH). Networks named in the how-to and the later difference article disagree slightly; the difference article lists Ethereum, BNB Smart Chain, Polygon, Base, Optimism, Arbitrum, and Avalanche. Prefer the more recent article, and feature-detect rather than hard-coding.
- Price shortcuts: Market, +2%, +5%, +10%, or custom. A **red warning** appears if the limit is more than 5% worse than the current market.
- Expiry presets: 1 hour (default in the difference article), 1 day, 7 days, 30 days, 365 days, or a custom date no later than 365 days. (An older sentence in the same article also says "1 month"; treat 30 days as the preset.)
- A lock control can pin the sell amount while the buy amount is edited. Flipping the pair should prompt the user to re-check inputs.
- After **Review Order** → **Place Order**, the wallet signs (a success screen follows). Open orders live under the wallet menu → Trade History → Open Orders, with fill progress to 100%, and a cancel control.

Sources: [How to trade](https://blog.matcha.xyz/article/how-to-trade-on-matcha-dex-aggregator), [Market vs limit](https://help.matcha.xyz/articles/5468312851-what-is-the-difference-between-a-market-order-and-a-limit-order), [How do I create a Limit Order?](https://help.matcha.xyz/articles/8175982421-how-do-i-create-a-limit-order).

---

## 7. Multichain switching

Same-chain swaps and cross-chain swaps are separate modes. The how-to lists many networks (Ethereum, Polygon, Arbitrum, Base, Optimism, BNB Chain, Avalanche, Solana, Blast, Mode, Mantle, Unichain, Plasma, and others — the marketing page now says "20 chains"). The chain list moves; do not treat any blog date as complete.

- Token search can show tokens on several chains; picking a pair on another chain prompts a wallet switch, as above.
- **Cross Chain** is its own tab. Flow: pick a sell token (from multiple chains) → pick a buy token in "To" → enter an amount → review the quote → Review Order → possible approval → Place Order. Bridging takes longer than a same-chain swap; the user can keep trading while it settles. Progress is a details pop-up with a block-explorer link (help names Socketscan for the source and destination hashes). History has a Cross Chain tab.

Source: [How to make a Cross Chain Swap](https://help.matcha.xyz/articles/7764033453-how-to-make-a-cross-chain-swap).

0x's examples let the wallet kit handle chain switching. A 2025 Matcha design note (reported in 0x materials) is worth copying in spirit: **preserve entered amounts and the current quote when the user switches wallets**, rather than wiping the form.

---

## 8. Loading, empty, and error states

Published copy is specific and actionable. Use that tone:

| State | Behaviour |
| --- | --- |
| Empty amount | No quote yet; primary button stays at a neutral prompt (Connect, or enter an amount), not Place Order. |
| Loading quote | Make the pending state obvious; do not show a stale number as if it were current. |
| No / unsupported token | Explain that the asset is not supported, or that a custom address failed and why (truncated, not a token, wrong chain, legal restriction). |
| Insufficient balance | Disable the action; say whether the shortfall is the sell amount, the fee taken from the sell token, or gas. |
| Fees exceed the trade | Block the trade; ask the user to increase the amount. |
| High price impact | Warn, and require review, before Place Order. |
| Tax token | Disclose the tax; do not hide it in slippage. |
| Quote expired | Banner + refresh; do not submit. |
| Swap reverted | Name the likely cause (price moved past slippage, or gas limit lowered). Do not tell the user to raise slippage as the first fix. |
| Failed custom gas | "Do not manually adjust the transaction's gas settings post-trade confirmation." |

Sources: [Why did my transaction fail?](https://help.matcha.xyz/articles/8913454514-why-did-my-transaction-fail), [What is Matcha Auto?](https://help.matcha.xyz/articles/6738511972-what-is-matcha-auto), custom-token and search articles above.

---

## 9. Transaction progress and confirmation

- Market swaps: "a few seconds," then tokens in the wallet.
- Matcha Auto: published as confirming about one block faster than standard, with a much lower revert rate (Auto ~1.5% vs a higher rate on standard and on some competitors; the case study also says 85% fewer failed trades vs popular DEXes). Show progress, not just a spinner.
- Limits: "a few seconds to a few minutes," then a Success screen, then the order appears under Open Orders.
- Cross-chain: minutes, with source and destination hashes in a details pop-up; the user is not trapped on a blocking spinner ("you can continue trading").
- After a failure, explain the revert; do not leave a generic "transaction failed."

---

## 10. Mobile layout

Official docs do not publish breakpoints, a mobile component inventory, or an accessibility statement we could find. Marketing describes a "beautiful clutter-free interface" for beginners and serious traders alike, and WalletConnect is a supported connect path.

For our builds, apply the same patterns in a single column: the trade module is the screen; the token picker is a full-screen or bottom-sheet dialog; Trade Settings are a full-screen sheet; primary actions stay visible above the keyboard; touch targets are at least 44px; chain switch and warnings are not hidden in hover-only chrome.

---

## 11. Copy tone

Direct, calm, and specific. Matcha writes as if the quoted number should be trusted, and it names numbers and causes.

Recurring labels and phrases, for reuse in spirit (not as a slogan we need to trademark):

- "Pay with" / "You receive" / "You receive (incl. fee)"
- "Review Order" then "Place Order"
- "Connect" / "Switch to [network] network"
- "Get the price you're quoted"
- "Quote expires in 20s"
- "Best route"
- "Fees exceed the size of the trade"
- "Insufficient Balance"
- "Use Defaults"

Warnings are red when the user is about to accept a bad limit (more than 5% worse than market) or a dangerous setting. They explain the consequence. They do not shout, and they do not claim that listing a token is a recommendation.

---

## 12. Accessibility

No official Matcha accessibility write-up was found on this pass. That is a gap, not a licence to skip a11y. For our builds:

- Every input and icon button has a visible label or `aria-label`.
- The token picker and settings sheets are dialogs with a focus trap, Escape to close, and a return of focus to the opener.
- The countdown, quote updates, and errors use an `aria-live` region (polite for the timer, assertive for a stale or failed quote).
- Colour is not the only signal: price impact, stale quotes, and unverified tokens also have text and, where useful, an icon.
- Contrast meets WCAG AA on text and on the primary button.
- The flow is usable with a keyboard only, including the route breakdown and the approval stepper.

---

## Checklist: Matcha-grade UX rules

Apply these on every swap, quote, or order surface we ship. They are pattern rules, not a copy of Matcha's code.

1. **Quote the amount that should arrive, all-in.** Show the number after fees, gas (or the gasless rebate), and the slippage floor. Do not advertise a mid-market rate the wallet will not receive.
2. **Itemise the quote.** Minimum received, price impact, fees, network cost, and the split route are visible in Review, not hidden behind a generic "best price" badge.
3. **Default slippage to 0.5% in manual mode.** Auto may pick a per-pair tolerance, but it must display the number it picked. Warn at ≥1%. Require an explicit acknowledgement at ≥5%. Never silently raise slippage to force a fill.
4. **Treat a firm quote as perishable.** Show a countdown (Matcha's public page uses 20 seconds). When it expires, disable Place Order and demand a refresh. Never sign or simulate-sign a stale quote.
5. **Approve the least authority, and name the spender.** Prefer one-time or exact-amount allowances (Permit2 one-time or AllowanceHolder as the API indicates). Never approve the Settler. Gasless may combine approval and swap, but the user still sees what is being authorised.
6. **Review, then place.** Connect → amount → Review Order → Place Order is two confirmations, not one. A refreshed worse price goes back through Review.
7. **Fail closed, and say why.** Insufficient balance, fees larger than the trade, no route, expired quote, unsupported token, or a bad custom address all block the action with a specific reason and a next step.
8. **Warn on identity and impact, not only on price.** Paste-by-address for lookalike tickers; unverified or custom tokens need an acknowledgement of the contract; buy/sell tax is disclosed; high price impact is reviewed before placing. Listing a token is not an endorsement.
9. **Keep the form when the context changes.** Switching wallet, chain, or Market/Limit should not wipe amounts without cause. A chain mismatch prompts "Switch to [network]," then continues.
10. **Progress is a named state, not a spinner.** Submitted, pending, confirmed, or failed, with links to explorers (and, for bridges, both legs). Cross-chain and limits may take minutes; let the user keep browsing.
11. **Copy is plain and numbered.** Use concrete labels ("Pay with," "You receive (incl. fee)," "Quote expires in 20s"). Errors name the cause. Do not shout.
12. **The same rules apply on a phone, and with a keyboard.** Focus, labels, live regions, contrast, and 44px targets are part of the design, not a polish pass.

---

## Open-source 0x material (study only)

- [0x-examples](https://github.com/0xProject/0x-examples) (Apache-2.0): Price view vs Quote view, AllowanceHolder and Permit2 demos, gasless headless examples. The examples are unaudited demos and require API keys; we do not copy them into our kit.
- [Swap API getting started](https://docs.0x.org/evm/0x-swap-api/guides/swap-tokens-with-0x-swap-api), [Permit2 getQuote](https://docs.0x.org/api-reference/evm-ap-is/swap/permit-2-getquote), [Gasless getQuote](https://docs.0x.org/api-reference/evm-ap-is/gasless/getquote.md).
- The live `api.0x.org` price and quote endpoints need a 0x API key. There is no key-free public price URL we will call from this kit.

---

## Related

- This file is the UX companion for this repo. The same notes are also filed in the local knowledge base as `melchizedek_kb/ux/MATCHA_UX.md`.
- The reference implementation is this repository.
- FLOP ⇄ HYPE hash-lock routing, used as a mock "route" in the demo, is described in [talents](https://github.com/xbtMelchizedek/talents).
