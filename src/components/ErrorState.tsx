import type { TradeError } from "../lib/types";

export function ErrorState({
  error,
  onAction,
}: {
  error: TradeError;
  onAction?: () => void;
}) {
  return (
    <div
      className={`error-state error-state--${error.kind}`}
      role="alert"
      data-testid="error-state"
    >
      <p className="error-state__title">{error.title}</p>
      <p className="error-state__detail">{error.detail}</p>
      {error.action && onAction ? (
        <button type="button" className="btn btn--ghost" onClick={onAction}>
          {error.action}
        </button>
      ) : error.action ? (
        <p className="error-state__hint">{error.action}</p>
      ) : null}
    </div>
  );
}
