import { formatUnits, parseUnits } from "../lib/format";
import { isLimitWorseThanMarket } from "../lib/behavior";
import type { Token } from "../lib/types";

export function LimitPanel({
  sell,
  buy,
  sellAmount,
  midBuyAmount,
  limitBuyInput,
  onLimitBuyInput,
  ackWorse,
  onAckWorse,
}: {
  sell: Token;
  buy: Token;
  sellAmount: bigint | null;
  midBuyAmount: bigint | null;
  limitBuyInput: string;
  onLimitBuyInput: (value: string) => void;
  ackWorse: boolean;
  onAckWorse: (ack: boolean) => void;
}) {
  const parsed = parseUnits(limitBuyInput, buy.decimals);
  const worse =
    parsed !== null &&
    midBuyAmount !== null &&
    isLimitWorseThanMarket(parsed, midBuyAmount);
  const midLabel =
    midBuyAmount !== null && sellAmount !== null && sellAmount > 0n
      ? formatUnits(midBuyAmount, buy.decimals)
      : null;

  return (
    <div className="limit-row" data-testid="limit-panel">
      <p data-testid="limit-expiry">
        This limit expires in 1 hour by default. It fills only at the receive
        amount you name, or better. This demo does not place a live order.
      </p>
      {midLabel && (
        <p className="limit-row__mid">
          Mid-market, you would receive about {midLabel} {buy.symbol} for{" "}
          {formatUnits(sellAmount ?? 0n, sell.decimals)} {sell.symbol}.
        </p>
      )}
      <label className="limit-row__field" htmlFor="limit-receive">
        Limit: you receive
        <input
          id="limit-receive"
          data-testid="limit-price"
          inputMode="decimal"
          value={limitBuyInput}
          aria-invalid={worse}
          onChange={(e) => onLimitBuyInput(e.target.value)}
        />
        <span>{buy.symbol}</span>
      </label>
      {worse && (
        <div className="warn-copy warn-copy--danger" data-testid="limit-worse">
          <p>
            This limit is more than 5% worse than market. You may receive much
            less than the mid-market number if it fills.
          </p>
          <label className="ack">
            <input
              type="checkbox"
              checked={ackWorse}
              onChange={(e) => onAckWorse(e.target.checked)}
              data-testid="limit-worse-ack"
            />
            I understand this limit is more than 5% worse than market.
          </label>
        </div>
      )}
    </div>
  );
}
