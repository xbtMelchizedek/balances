import { useEffect, useMemo, useState } from "react";
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
} from "../lib/mockProvider";
import { DEMO_BALANCES, PRESETS, tokenById } from "../lib/tokens";
import type { Quote, Token, TradeError } from "../lib/types";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Switch } from "@/components/arc/switch/switch";
import Toast from "@/components/arc/toast/toast";
import { ApprovalStepper, type ApprovalMode, type ApprovalStep } from "./ApprovalStepper";
import { ErrorState } from "./ErrorState";
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
}: {
  nowFn?: () => number;
  ttlMs?: number;
}) {
  const [sell, setSell] = useState<Token>(flop);
  const [buy, setBuy] = useState<Token>(hype);
  const [sellInput, setSellInput] = useState("25");
  const [slipMode, setSlipMode] = useState<SlippageMode>("auto");
  const [slipBps, setSlipBps] = useState<bigint>(DEFAULT_SLIPPAGE_BPS);
  const [ackHigh, setAckHigh] = useState(false);
  const [ackUnverified, setAckUnverified] = useState(false);
  const [gasless, setGasless] = useState(true);
  const [connected, setConnected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [stage, setStage] = useState<"edit" | "review" | "progress">("edit");
  const [tx, setTx] = useState<TxPhase | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [limit, setLimit] = useState(false);
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null);


  const band = pairLiquidity(sell.liquidity, buy.liquidity);
  const effectiveBps = slipMode === "auto" ? autoSlippageBps(band).bps : slipBps;
  const sellAmount = parseUnits(sellInput, sell.decimals);
  const balance = DEMO_BALANCES[sell.id] ?? 0n;

  const requestReady = sellAmount !== null && sellAmount > 0n && sell.id !== buy.id;

  useEffect(() => {
    if (!requestReady || sellAmount === null) {
      setQuote(null);
      return;
    }
    const firm = stage === "review";
    const next = getMockQuote({
      sellToken: sell,
      buyToken: buy,
      sellAmount,
      firm,
      nowMs: nowFn(),
      ttlMs,
    });
    setQuote(next);
  }, [sell, buy, sellInput, requestReady, sellAmount, stage, nowFn, ttlMs]);

  // Reset approval when the sell token changes.
  useEffect(() => {
    setApproved(false);
    setAckUnverified(false);
    if (stage !== "progress") setStage("edit");
  }, [sell.id, buy.id]);

  const clock = useQuoteClock(quote?.quotedAtMs ?? null, ttlMs, nowFn);
  const stale =
    Boolean(quote && quote.firm && isQuoteStale(clock.nowMs, quote.quotedAtMs, ttlMs));

  const error: TradeError | null = useMemo(() => {
    if (sellAmount === null && sellInput.trim() !== "") {
      return {
        kind: "unsupported",
        title: "Check the amount",
        detail:
          "Use a non-negative number with no more decimal places than the token allows.",
      };
    }
    if (sellAmount === null || sellAmount <= 0n) {
      return quoteError({
        sellToken: sell,
        buyToken: buy,
        sellAmount: 0n,
        firm: false,
        nowMs: 0,
        ttlMs,
      });
    }
    const qErr = quoteError({
      sellToken: sell,
      buyToken: buy,
      sellAmount,
      firm: false,
      nowMs: 0,
      ttlMs,
    });
    if (qErr) return qErr;
    if (connected && sellAmount > balance) {
      return {
        kind: "insufficient-balance",
        title: "Insufficient balance",
        detail: `The demo wallet holds ${formatUnits(balance, sell.decimals)} ${sell.symbol}, which is less than the ${formatUnits(sellAmount, sell.decimals)} ${sell.symbol} you entered. Enter the amount in Pay with so fees are not taken twice.`,
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
    connected,
    effectiveBps,
    quote,
    sell,
    sellAmount,
    sellInput,
    stage,
    stale,
    ttlMs,
  ]);

  const blocking =
    error !== null &&
    error.kind !== "empty" &&
    !(error.kind === "quote-expired" && stage !== "review");

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
    }
    setStage("edit");
  }

  function refreshQuote() {
    if (sellAmount === null || sellAmount <= 0n) return;
    setQuote(
      getMockQuote({
        sellToken: sell,
        buyToken: buy,
        sellAmount,
        firm: true,
        nowMs: nowFn(),
        ttlMs,
      }),
    );
    setStage("review");
  }

  function onReview() {
    if (blocking || !requestReady) return;
    setStage("review");
    refreshQuote();
  }

  function onPlace() {
    if (blocking || stale || !quote) return;
    if (!connected) {
      setConnected(true);
      setToast({
        title: "Demo wallet connected",
        description: "No real wallet was used.",
      });
      return;
    }
    if (!gasless && !approved) {
      setApproved(true);
      return;
    }
    setStage("progress");
    setTx("submitted");
    window.setTimeout(() => setTx("pending"), 400);
    window.setTimeout(() => {
      setTx("confirmed");
      setToast({
        title: "Order placed (DEMO)",
        description: "Nothing was signed or broadcast.",
      });
    }, 1400);
  }

  const primaryLabel = !connected
    ? "Connect demo wallet"
    : !requestReady || error?.kind === "empty"
      ? "Enter an amount"
      : stage !== "review"
        ? "Review order"
        : !gasless && !approved
          ? `Approve ${sell.symbol} (DEMO)`
          : "Place order (DEMO)";

  const primaryDisabled =
    (primaryLabel === "Enter an amount") ||
    (primaryLabel !== "Connect demo wallet" && blocking) ||
    (stage === "review" && stale);

  return (
    <div className="swap" data-testid="swap-demo">
      <header className="hero">
        <p className="hero__meta">
          <Badge tone="info" size="sm">
            DEMO
          </Badge>
          <span>No wallet signing · no real transactions</span>
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
      </p>

      <div className="module">
        <div className="module__bar">
          <SegmentedControl
            label="Order type"
            value={limit ? "limit" : "market"}
            onValueChange={(value) => setLimit(value === "limit")}
            options={[
              { value: "market", label: "Market" },
              { value: "limit", label: "Limit" },
            ]}
          />
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
          onToken={setSell}
          onAmount={(v) => {
            setSellInput(v);
            setStage("edit");
            setTx(null);
          }}
          testId="token-select-pay"
        />

        <div className="flip">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={flip}
            aria-label="Switch pay-with and receive tokens"
          >
            Flip tokens
          </Button>
        </div>

        <TokenSelect
          label="You receive"
          token={buy}
          amount={
            quote
              ? formatUnits(quote.buyAmount, quote.buyToken.decimals)
              : ""
          }
          onToken={setBuy}
          onAmount={() => {
            /* buy side is quoted, not typed, in this demo */
          }}
          testId="token-select-receive"
          disabled
        />

        {limit && (
          <div className="limit-row" data-testid="limit-panel">
            <p>
              Limit orders in the live Matcha product fill at the exact price
              you name, expire in 1 hour by default, and warn in red if the
              limit is more than 5% worse than market. This demo does not place
              a live order.
            </p>
          </div>
        )}

        <div className="ack ack--inline">
          <Switch
            checked={gasless}
            onCheckedChange={(checked) => {
              setGasless(checked);
              setApproved(false);
            }}
            label="Auto (gasless, DEMO). Approval and swap are one simulated signature. Standard mode adds a one-time approve step. Spender would be Permit2 or AllowanceHolder, never Settler."
          />
        </div>

        {quote && !stale && (
          <QuoteCard quote={quote} slippageBps={effectiveBps} />
        )}
        {quote && stage === "review" && (
          <StaleQuote
            quotedAtMs={quote.quotedAtMs}
            ttlMs={ttlMs}
            nowMs={clock.nowMs}
            onRefresh={refreshQuote}
          />
        )}

        {error && error.kind !== "empty" && error.kind !== "quote-expired" && (
          <ErrorState
            error={error}
            onAction={
              error.kind === "unverified-token"
                ? () => setAckUnverified(true)
                : error.kind === "fees-exceed-trade"
                  ? () => setSellInput("25")
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

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="primary-action"
          data-testid="primary-action"
          disabled={primaryDisabled || stage === "progress"}
          onClick={() => {
            if (!connected) {
              setConnected(true);
              setToast({
                title: "Demo wallet connected",
                description: "No real wallet was used.",
              });
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
        </Button>
        {stage === "review" && !stale && (
          <Button
            type="button"
            variant="ghost"
            className="secondary-action"
            data-testid="expire-quote"
            onClick={() => {
              if (!quote) return;
              setQuote({ ...quote, quotedAtMs: nowFn() - ttlMs });
            }}
          >
            Expire quote now (DEMO)
          </Button>
        )}
      </div>
      {toast ? (
        <div className="toast-slot">
          <Toast
            title={toast.title}
            description={toast.description}
            open
            onOpenChange={(next) => {
              if (!next) setToast(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
