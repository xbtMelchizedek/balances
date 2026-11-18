import { useEffect, useMemo, useState } from "react";
import {
  DEMO_REFRESH_ADVERSE_BPS,
  isLimitWorseThanMarket,
  isWorseQuote,
  needsNetworkSwitch,
} from "../lib/behavior";
import { formatUnits, parseUnits } from "../lib/format";
import {
  DEFAULT_SLIPPAGE_BPS,
  QUOTE_TTL_MS,
  autoSlippageBps,
  gradeImpact,
  isQuoteStale,
  pairLiquidity,
  priceImpactBps,
  slippageNeedsAck,
} from "../lib/quoteMath";
import {
  feesExceedTrade,
  getMockQuote,
  quoteError,
  sellAmountForBuyTarget,
} from "../lib/mockProvider";
import { CHAIN_LABEL, DEMO_BALANCES, PRESETS, tokenById } from "../lib/tokens";
import type { ChainId, Quote, Token, TradeError } from "../lib/types";
import { ApprovalStepper, type ApprovalMode, type ApprovalStep } from "./ApprovalStepper";
import { ErrorState } from "./ErrorState";
import { LimitPanel } from "./LimitPanel";
import { NetworkSwitch } from "./NetworkSwitch";
import { PriceUpdateBanner } from "./PriceUpdateBanner";
import { QuoteCard } from "./QuoteCard";
import { SlippageControl, type SlippageMode } from "./SlippageControl";
import { StaleQuote, useQuoteClock } from "./StaleQuote";
import { TokenSelect } from "./TokenSelect";
import { TxProgress, type TxPhase } from "./TxProgress";

const flop = tokenById("flop")!;
const hype = tokenById("hype")!;

export function SwapDemo({
  nowFn = Date.now,
  ttlMs = QUOTE_TTL_MS,
  refreshAdverseBps = DEMO_REFRESH_ADVERSE_BPS,
}: {
  nowFn?: () => number;
  ttlMs?: number;
  refreshAdverseBps?: bigint;
}) {
  const [sell, setSell] = useState<Token>(flop);
  const [buy, setBuy] = useState<Token>(hype);
  const [sellInput, setSellInput] = useState("25");
  const [buyInput, setBuyInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"pay" | "receive">("pay");
  const [slipMode, setSlipMode] = useState<SlippageMode>("auto");
  const [slipBps, setSlipBps] = useState<bigint>(DEFAULT_SLIPPAGE_BPS);
  const [ackHigh, setAckHigh] = useState(false);
  const [ackUnverified, setAckUnverified] = useState(false);
  const [ackLimitWorse, setAckLimitWorse] = useState(false);
  const [limitBuyInput, setLimitBuyInput] = useState("");
  const [limitTouched, setLimitTouched] = useState(false);
  const [gasless, setGasless] = useState(true);
  const [connected, setConnected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [walletChain, setWalletChain] = useState<ChainId>("flop");
  const [stage, setStage] = useState<"edit" | "review" | "progress">("edit");
  const [tx, setTx] = useState<TxPhase | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [limit, setLimit] = useState(false);
  const [reviewedBuyAmount, setReviewedBuyAmount] = useState<bigint | null>(
    null,
  );
  const [needsReReview, setNeedsReReview] = useState(false);

  const band = pairLiquidity(sell.liquidity, buy.liquidity);
  const effectiveBps = slipMode === "auto" ? autoSlippageBps(band).bps : slipBps;
  const sellAmount = parseUnits(sellInput, sell.decimals);
  const receiveAmount = parseUnits(buyInput, buy.decimals);
  const balance = DEMO_BALANCES[sell.id] ?? 0n;
  const switchTo = connected ? needsNetworkSwitch(walletChain, sell, buy) : null;

  const requestReady =
    lastEdited === "receive"
      ? receiveAmount !== null && receiveAmount > 0n && sell.id !== buy.id
      : sellAmount !== null && sellAmount > 0n && sell.id !== buy.id;

  useEffect(() => {
    if (!requestReady) {
      setQuote(null);
      return;
    }
    const firm = stage === "review";
    // Indicative and first firm quotes are clean. An expired refresh passes
    // refreshAdverseBps explicitly in refreshQuote, not through this effect.

    if (lastEdited === "receive") {
      if (receiveAmount === null || receiveAmount <= 0n) {
        setQuote(null);
        return;
      }
      const inverted = sellAmountForBuyTarget({
        sellToken: sell,
        buyToken: buy,
        targetBuyAmount: receiveAmount,
        firm,
        nowMs: nowFn(),
        ttlMs,
      });
      if (inverted === null) {
        setQuote(null);
        return;
      }
      const formatted = formatUnits(inverted, sell.decimals);
      setSellInput((prev) => (prev === formatted ? prev : formatted));
      setQuote(
        getMockQuote({
          sellToken: sell,
          buyToken: buy,
          sellAmount: inverted,
          firm,
          nowMs: nowFn(),
          ttlMs,
        }),
      );
      return;
    }

    if (sellAmount === null || sellAmount <= 0n) {
      setQuote(null);
      return;
    }
    const next = getMockQuote({
      sellToken: sell,
      buyToken: buy,
      sellAmount,
      firm,
      nowMs: nowFn(),
      ttlMs,
    });
    setQuote(next);
    const formattedBuy = formatUnits(next.buyAmount, next.buyToken.decimals);
    setBuyInput((prev) => (prev === formattedBuy ? prev : formattedBuy));
  }, [
    buy,
    lastEdited,
    nowFn,
    receiveAmount,
    requestReady,
    sell,
    sellAmount,
    stage,
    ttlMs,
  ]);

  // Reset approval when the sell token changes.
  useEffect(() => {
    setApproved(false);
    setAckUnverified(false);
    setAckLimitWorse(false);
    setNeedsReReview(false);
    setReviewedBuyAmount(null);
    if (stage !== "progress") setStage("edit");
    // Keep the typed amount; only the pair changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stage reset is a pair-change side effect
  }, [sell.id, buy.id]);

  useEffect(() => {
    if (quote && limit && !limitTouched) {
      const mid = formatUnits(quote.midBuyAmount, quote.buyToken.decimals);
      setLimitBuyInput((prev) => (prev === mid ? prev : mid));
    }
  }, [quote, limit, limitTouched]);

  const clock = useQuoteClock(quote?.quotedAtMs ?? null, ttlMs, nowFn);
  const stale =
    Boolean(quote && quote.firm && isQuoteStale(clock.nowMs, quote.quotedAtMs, ttlMs));

  const error: TradeError | null = useMemo(() => {
    if (switchTo) {
      return {
        kind: "network-mismatch",
        title: `Switch to ${CHAIN_LABEL[switchTo]} network`,
        detail: `The demo wallet is on ${CHAIN_LABEL[walletChain]}.`,
        action: `Switch to ${CHAIN_LABEL[switchTo]} network (DEMO)`,
      };
    }
    if (lastEdited === "pay" && sellAmount === null && sellInput.trim() !== "") {
      return {
        kind: "unsupported",
        title: "Check the amount",
        detail:
          "Use a non-negative number with no more decimal places than the token allows.",
      };
    }
    if (
      lastEdited === "receive" &&
      receiveAmount === null &&
      buyInput.trim() !== ""
    ) {
      return {
        kind: "unsupported",
        title: "Check the amount",
        detail:
          "Use a non-negative number with no more decimal places than the token allows.",
      };
    }
    if (
      (lastEdited === "pay" && (sellAmount === null || sellAmount <= 0n)) ||
      (lastEdited === "receive" &&
        (receiveAmount === null || receiveAmount <= 0n))
    ) {
      return quoteError({
        sellToken: sell,
        buyToken: buy,
        sellAmount: 0n,
        firm: false,
        nowMs: 0,
        ttlMs,
      });
    }
    const resolvedSell = quote?.sellAmount ?? sellAmount ?? 0n;
    const qErr = quoteError({
      sellToken: sell,
      buyToken: buy,
      sellAmount: resolvedSell,
      firm: false,
      nowMs: 0,
      ttlMs,
    });
    if (qErr) return qErr;
    if (connected && resolvedSell > balance) {
      const enteredOnReceive = lastEdited === "receive";
      return {
        kind: "insufficient-balance",
        title: "Insufficient balance",
        detail: enteredOnReceive
          ? `You entered the amount on You receive. Fees and network cost are taken from ${sell.symbol}, so you need ${formatUnits(resolvedSell, sell.decimals)} ${sell.symbol} to receive that number. The demo wallet holds ${formatUnits(balance, sell.decimals)} ${sell.symbol}. Enter the amount in Pay with if you want the fee taken from a known balance.`
          : `The demo wallet holds ${formatUnits(balance, sell.decimals)} ${sell.symbol}, which is less than the ${formatUnits(resolvedSell, sell.decimals)} ${sell.symbol} you entered. Enter the amount in Pay with so fees are not taken twice.`,
      };
    }
    if (quote && feesExceedTrade(quote)) {
      return {
        kind: "fees-exceed-trade",
        title: "Fees exceed the size of the trade",
        detail:
          "Network cost and the demo fee are larger than this swap. Increase the amount to continue.",
        action: "Set a larger amount",
      };
    }
    if (quote) {
      const impact = priceImpactBps(quote.midBuyAmount, quote.buyAmount);
      if (gradeImpact(impact) === "block") {
        return {
          kind: "high-impact",
          title: "Price impact is too high",
          detail:
            "This size moves the mock book too far. Split the order or pick a more liquid pair.",
        };
      }
    }
    if (stale) {
      return {
        kind: "quote-expired",
        title: "This quote has expired",
        detail: "Refresh to get a new firm quote. The previous number is no longer valid.",
        action: "Refresh quote",
      };
    }
    if (needsReReview && quote) {
      return {
        kind: "price-updated",
        title: "The price has changed",
        detail: "Review the new receive amount before placing.",
        action: "Review updated quote",
      };
    }
    if (
      (!buy.verified || !sell.verified) &&
      !ackUnverified &&
      stage === "review"
    ) {
      return {
        kind: "unverified-token",
        title: "Unverified token",
        detail:
          "One side of this pair is not in the verified catalog. Confirm the demo address before placing. Listing it here is not an endorsement.",
        action: "I have checked the address",
      };
    }
    if (slippageNeedsAck(effectiveBps) && !ackHigh) {
      return {
        kind: "unsupported",
        title: "Confirm high slippage",
        detail: "Open trade settings and acknowledge the high slippage before placing.",
      };
    }
    return null;
  }, [
    ackHigh,
    ackUnverified,
    balance,
    buy,
    buyInput,
    connected,
    effectiveBps,
    lastEdited,
    needsReReview,
    quote,
    receiveAmount,
    sell,
    sellAmount,
    sellInput,
    stage,
    stale,
    switchTo,
    ttlMs,
    walletChain,
  ]);

  const blocking =
    error !== null &&
    error.kind !== "empty" &&
    !(error.kind === "quote-expired" && stage !== "review") &&
    error.kind !== "network-mismatch" &&
    error.kind !== "price-updated";

  const approvalMode: ApprovalMode = gasless ? "auto" : "standard";
  const approvalStep: ApprovalStep = !connected
    ? "connect"
    : !gasless && !approved
      ? "approve"
      : tx === "confirmed"
        ? "done"
        : "place";

  function setPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setSell(tokenById(p.sell)!);
    setBuy(tokenById(p.buy)!);
    setStage("edit");
    setTx(null);
  }

  function flip() {
    setSell(buy);
    setBuy(sell);
    if (quote) {
      setSellInput(formatUnits(quote.buyAmount, quote.buyToken.decimals));
      setLastEdited("pay");
    }
    setStage("edit");
  }

  function refreshQuote() {
    const amount = quote?.sellAmount ?? sellAmount;
    if (amount === null || amount <= 0n) return;
    const next = getMockQuote({
      sellToken: sell,
      buyToken: buy,
      sellAmount: amount,
      firm: true,
      nowMs: nowFn(),
      ttlMs,
      adverseBps: refreshAdverseBps,
    });
    setQuote(next);
    if (lastEdited === "pay") {
      setBuyInput(formatUnits(next.buyAmount, next.buyToken.decimals));
    }
    setStage("review");
    if (
      reviewedBuyAmount !== null &&
      isWorseQuote(reviewedBuyAmount, next.buyAmount)
    ) {
      setNeedsReReview(true);
    } else {
      setNeedsReReview(false);
      setReviewedBuyAmount(next.buyAmount);
    }
  }

  function onReview() {
    if (blocking || !requestReady || switchTo) return;
    setStage("review");
    if (sellAmount === null && quote === null) return;
    const amount = quote?.sellAmount ?? sellAmount;
    if (amount === null || amount <= 0n) return;
    const next = getMockQuote({
      sellToken: sell,
      buyToken: buy,
      sellAmount: amount,
      firm: true,
      nowMs: nowFn(),
      ttlMs,
    });
    setQuote(next);
    setReviewedBuyAmount(next.buyAmount);
    setNeedsReReview(false);
    if (lastEdited === "pay") {
      setBuyInput(formatUnits(next.buyAmount, next.buyToken.decimals));
    }
  }

  function acceptUpdatedQuote() {
    if (!quote) return;
    setReviewedBuyAmount(quote.buyAmount);
    setNeedsReReview(false);
  }

  function onPlace() {
    if (blocking || stale || !quote || needsReReview || switchTo) return;
    if (!connected) {
      setConnected(true);
      return;
    }
    if (!gasless && !approved) {
      setApproved(true);
      return;
    }
    setStage("progress");
    setTx("submitted");
    window.setTimeout(() => setTx("pending"), 400);
    window.setTimeout(() => setTx("confirmed"), 1400);
  }

  const primaryLabel = !connected
    ? "Connect demo wallet"
    : switchTo
      ? `Switch to ${CHAIN_LABEL[switchTo]} network (DEMO)`
      : !requestReady || error?.kind === "empty"
        ? "Enter an amount"
        : stage !== "review"
          ? "Review order"
          : needsReReview
            ? "Review updated quote"
            : !gasless && !approved
              ? `Approve ${sell.symbol} (DEMO)`
              : "Place order (DEMO)";

  const primaryDisabled =
    (primaryLabel === "Enter an amount") ||
    (primaryLabel !== "Connect demo wallet" &&
      primaryLabel !== `Switch to ${CHAIN_LABEL[switchTo ?? "flop"]} network (DEMO)` &&
      blocking) ||
    (stage === "review" && stale) ||
    (stage === "review" && needsReReview && primaryLabel !== "Review updated quote");

  return (
    <div className="swap" data-testid="swap-demo">
      <header className="hero">
        <p className="eyebrow">
          <span className="demo-badge">DEMO</span> No wallet signing · no real
          transactions
        </p>
        <h1>balances</h1>
        <p className="lede">
          A just balance and scales. A reference swap UI that follows
          Matcha-grade patterns: all-in quotes, a 20-second firm quote, one-time
          approvals, and errors that say what went wrong.
        </p>
      </header>

      <div className="presets" role="tablist" aria-label="Demo pairs">
        {PRESETS.map((p) => {
          const on = sell.id === p.sell && buy.id === p.buy;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "chip chip--on" : "chip"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="preset-blurb">
        {PRESETS.find((p) => p.sell === sell.id && p.buy === buy.id)?.blurb ??
          "Pick a demo pair, or choose any two tokens from the picker."}
        {connected && (
          <>
            {" "}
            Demo wallet is on {CHAIN_LABEL[walletChain]}.
          </>
        )}
      </p>

      <div className="module">
        <div className="module__bar">
          <div className="seg" role="tablist" aria-label="Order type">
            <button
              type="button"
              role="tab"
              aria-selected={!limit}
              className={!limit ? "seg__btn is-on" : "seg__btn"}
              onClick={() => setLimit(false)}
            >
              Market
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={limit}
              className={limit ? "seg__btn is-on" : "seg__btn"}
              onClick={() => setLimit(true)}
            >
              Limit
            </button>
          </div>
          <SlippageControl
            mode={slipMode}
            bps={slipBps}
            band={band}
            ackHigh={ackHigh}
            onChange={({ mode, bps, ackHigh: ack }) => {
              setSlipMode(mode);
              setSlipBps(bps);
              setAckHigh(ack);
            }}
          />
        </div>

        <TokenSelect
          label="Pay with"
          token={sell}
          amount={sellInput}
          onToken={(t) => {
            setSell(t);
            setLastEdited("pay");
          }}
          onAmount={(v) => {
            setSellInput(v);
            setLastEdited("pay");
            setStage("edit");
            setTx(null);
            setNeedsReReview(false);
            setReviewedBuyAmount(null);
          }}
          testId="token-select-pay"
        />

        <button
          type="button"
          className="flip"
          onClick={flip}
          aria-label="Switch pay-with and receive tokens"
        >
          ⇅
        </button>

        <TokenSelect
          label="You receive"
          token={buy}
          amount={buyInput}
          onToken={(t) => {
            setBuy(t);
          }}
          onAmount={(v) => {
            setBuyInput(v);
            setLastEdited("receive");
            setStage("edit");
            setTx(null);
            setNeedsReReview(false);
            setReviewedBuyAmount(null);
          }}
          testId="token-select-receive"
        />

        {limit && (
          <LimitPanel
            sell={sell}
            buy={buy}
            sellAmount={quote?.sellAmount ?? sellAmount}
            midBuyAmount={quote?.midBuyAmount ?? null}
            limitBuyInput={limitBuyInput}
            onLimitBuyInput={(v) => {
              setLimitTouched(true);
              setLimitBuyInput(v);
              setAckLimitWorse(false);
            }}
            ackWorse={ackLimitWorse}
            onAckWorse={setAckLimitWorse}
          />
        )}

        <label className="ack ack--inline">
          <input
            type="checkbox"
            checked={gasless}
            onChange={(e) => {
              setGasless(e.target.checked);
              setApproved(false);
            }}
          />
          Auto (gasless, DEMO) — approval and swap are one simulated signature.
          Standard mode adds a one-time approve step. Spender would be Permit2
          or AllowanceHolder, never Settler.
        </label>

        {quote && !stale && !needsReReview && (
          <QuoteCard quote={quote} slippageBps={effectiveBps} />
        )}
        {quote && needsReReview && (
          <PriceUpdateBanner
            token={quote.buyToken}
            previousBuyAmount={reviewedBuyAmount ?? quote.buyAmount}
            nextBuyAmount={quote.buyAmount}
            onReview={acceptUpdatedQuote}
          />
        )}
        {quote && stage === "review" && !needsReReview && (
          <StaleQuote
            quotedAtMs={quote.quotedAtMs}
            ttlMs={ttlMs}
            nowMs={clock.nowMs}
            onRefresh={refreshQuote}
          />
        )}

        {switchTo && (
          <NetworkSwitch
            walletChain={walletChain}
            requiredChain={switchTo}
            onSwitch={() => setWalletChain(switchTo)}
          />
        )}

        {error &&
          error.kind !== "empty" &&
          error.kind !== "quote-expired" &&
          error.kind !== "network-mismatch" &&
          error.kind !== "price-updated" && (
          <ErrorState
            error={error}
            onAction={
              error.kind === "unverified-token"
                ? () => setAckUnverified(true)
                : error.kind === "fees-exceed-trade"
                  ? () => {
                      setSellInput("25");
                      setLastEdited("pay");
                    }
                  : undefined
            }
          />
        )}

        <ApprovalStepper
          mode={approvalMode}
          step={approvalStep}
          sellSymbol={sell.symbol}
          connected={connected}
        />

        {stage === "progress" && tx && <TxProgress phase={tx} />}

        <button
          type="button"
          className="btn btn--primary btn--block"
          data-testid="primary-action"
          disabled={
            (primaryDisabled && !switchTo) ||
            stage === "progress" ||
            (limit &&
              parseUnits(limitBuyInput, buy.decimals) !== null &&
              quote !== null &&
              needsLimitAck(limitBuyInput, buy, quote.midBuyAmount) &&
              !ackLimitWorse)
          }
          onClick={() => {
            if (!connected) {
              setConnected(true);
              return;
            }
            if (switchTo) {
              setWalletChain(switchTo);
              return;
            }
            if (needsReReview) {
              acceptUpdatedQuote();
              return;
            }
            if (stage !== "review") {
              onReview();
              return;
            }
            onPlace();
          }}
        >
          {primaryLabel}
        </button>
        {stage === "review" && !stale && !needsReReview && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            data-testid="expire-quote"
            onClick={() => {
              if (!quote) return;
              setQuote({ ...quote, quotedAtMs: nowFn() - ttlMs });
            }}
          >
            Expire quote now (DEMO)
          </button>
        )}
      </div>
    </div>
  );
}

function needsLimitAck(
  limitBuyInput: string,
  buy: Token,
  midBuyAmount: bigint,
): boolean {
  const parsed = parseUnits(limitBuyInput, buy.decimals);
  if (parsed === null) return false;
  return isLimitWorseThanMarket(parsed, midBuyAmount);
}
