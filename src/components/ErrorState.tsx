import { Alert } from "@/components/arc/alert/alert";
import { Button } from "@/components/arc/button/button";
import type { TradeError } from "../lib/types";

const DANGER: TradeError["kind"][] = [
  "insufficient-balance",
  "fees-exceed-trade",
  "quote-expired",
  "high-impact",
  "unverified-token",
];

export function ErrorState({
  error,
  onAction,
}: {
  error: TradeError;
  onAction?: () => void;
}) {
  const tone = DANGER.includes(error.kind) ? "danger" : "warning";
  return (
    <div
      className={`error-state error-state--${error.kind}`}
      data-testid="error-state"
    >
      <Alert tone={tone} title={error.title}>
        {error.detail}
      </Alert>
      {error.action && onAction ? (
        <Button type="button" variant="ghost" onClick={onAction}>
          {error.action}
        </Button>
      ) : error.action ? (
        <p className="error-state__hint">{error.action}</p>
      ) : null}
    </div>
  );
}
