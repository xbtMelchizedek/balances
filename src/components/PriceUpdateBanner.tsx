import { formatUnits } from "../lib/format";
import type { Token } from "../lib/types";

export function PriceUpdateBanner({
  token,
  previousBuyAmount,
  nextBuyAmount,
  onReview,
}: {
  token: Token;
  previousBuyAmount: bigint;
  nextBuyAmount: bigint;
  onReview: () => void;
}) {
  return (
    <div
      className="stale-banner"
      role="alert"
      data-testid="price-updated"
    >
      <div>
        <p className="stale-banner__title">The price has changed</p>
        <p className="stale-banner__detail">
          You would now receive {formatUnits(nextBuyAmount, token.decimals)}{" "}
          {token.symbol}, which is less than the{" "}
          {formatUnits(previousBuyAmount, token.decimals)} {token.symbol} you
          already reviewed. Review the new number before placing.
        </p>
      </div>
      <button
        type="button"
        className="btn btn--primary"
        onClick={onReview}
        data-testid="review-updated-quote"
      >
        Review updated quote
      </button>
    </div>
  );
}
