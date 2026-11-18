import { countdownLabel } from "../lib/format";
import { isQuoteStale, remainingMs } from "../lib/quoteMath";
import { useEffect, useState } from "react";

export function useQuoteClock(
  quotedAtMs: number | null,
  ttlMs: number,
  nowFn: () => number = Date.now,
): { nowMs: number; stale: boolean; msLeft: number } {
  const [nowMs, setNowMs] = useState(nowFn);
  useEffect(() => {
    if (quotedAtMs === null) return;
    setNowMs(nowFn());
    const id = window.setInterval(() => setNowMs(nowFn()), 250);
    return () => window.clearInterval(id);
  }, [quotedAtMs, ttlMs, nowFn]);
  if (quotedAtMs === null) {
    return { nowMs, stale: false, msLeft: 0 };
  }
  return {
    nowMs,
    stale: isQuoteStale(nowMs, quotedAtMs, ttlMs),
    msLeft: remainingMs(nowMs, quotedAtMs, ttlMs),
  };
}

export function StaleQuote({
  quotedAtMs,
  ttlMs,
  nowMs,
  onRefresh,
}: {
  quotedAtMs: number;
  ttlMs: number;
  nowMs: number;
  onRefresh: () => void;
}) {
  const stale = isQuoteStale(nowMs, quotedAtMs, ttlMs);
  const msLeft = remainingMs(nowMs, quotedAtMs, ttlMs);
  if (!stale) {
    return (
      <p
        className="quote-timer"
        data-testid="quote-timer"
        aria-live="polite"
      >
        {countdownLabel(msLeft)}
      </p>
    );
  }
  return (
    <div className="stale-banner" role="alert" data-testid="stale-banner">
      <div>
        <p className="stale-banner__title">This quote has expired</p>
        <p className="stale-banner__detail">
          Firm quotes last 20 seconds. Refresh to get a new price before you
          place the order. The previous number is no longer valid.
        </p>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={onRefresh}
        data-testid="refresh-quote"
      >
        Refresh quote
      </button>
    </div>
  );
}
