import { formatUnits } from "../lib/format";
import {
  formatBpsAsPercent,
  gradeImpact,
  minReceived,
  priceImpactBps,
} from "../lib/quoteMath";
import type { Quote } from "../lib/types";

export function QuoteCard({
  quote,
  slippageBps,
}: {
  quote: Quote;
  slippageBps: bigint;
}) {
  const impact = priceImpactBps(quote.midBuyAmount, quote.buyAmount);
  const grade = gradeImpact(impact);
  const min = minReceived(quote.buyAmount, slippageBps);
  const rate =
    quote.sellAmount > 0n
      ? formatUnits(
          (quote.buyAmount * 10n ** BigInt(quote.sellToken.decimals)) /
            quote.sellAmount,
          quote.buyToken.decimals,
          6,
        )
      : "0";

  return (
    <section className="quote-card" data-testid="quote-card" aria-label="Quote">
      <header className="quote-card__head">
        <h2>You receive (incl. fee)</h2>
        <p className="quote-card__out">
          {formatUnits(quote.buyAmount, quote.buyToken.decimals)}{" "}
          {quote.buyToken.symbol}
        </p>
        <p className="quote-card__rate">
          Rate 1 {quote.sellToken.symbol} = {rate} {quote.buyToken.symbol}
          {quote.firm ? " · firm quote" : " · indicative"}
        </p>
      </header>
      <dl className="quote-card__rows">
        <div>
          <dt>Minimum received</dt>
          <dd>
            {formatUnits(min, quote.buyToken.decimals)} {quote.buyToken.symbol}
          </dd>
        </div>
        <div>
          <dt>Price impact</dt>
          <dd className={`impact impact--${grade}`} data-testid="price-impact">
            {formatBpsAsPercent(impact)}
            {grade === "ok"
              ? ""
              : grade === "block"
                ? " — too high, the demo will not place this"
                : " — review before placing"}
          </dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd>
            {formatUnits(quote.feeBuyAmount, quote.buyToken.decimals)}{" "}
            {quote.buyToken.symbol}
          </dd>
        </div>
        <div>
          <dt>Network cost (in {quote.buyToken.symbol})</dt>
          <dd>
            {formatUnits(quote.networkCostBuyAmount, quote.buyToken.decimals)}{" "}
            {quote.buyToken.symbol}
          </dd>
        </div>
        <div>
          <dt>Max slippage</dt>
          <dd>{formatBpsAsPercent(slippageBps)}</dd>
        </div>
      </dl>
      <details className="route" data-testid="route-split">
        <summary>{quote.route.label}</summary>
        <p className="route__settlement">{quote.route.settlement}</p>
        <ul>
          {quote.route.hops.map((hop) => (
            <li key={hop.venue}>
              <strong>{hop.venue}</strong>
              <span>{formatBpsAsPercent(hop.shareBps)} of the route</span>
              {hop.note ? <span className="route__note">{hop.note}</span> : null}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
