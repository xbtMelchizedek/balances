export type TxPhase = "submitted" | "pending" | "confirmed" | "failed";

const COPY: Record<TxPhase, { title: string; detail: string }> = {
  submitted: {
    title: "Submitted (DEMO)",
    detail: "The simulated order has been accepted. Nothing was broadcast.",
  },
  pending: {
    title: "Pending (DEMO)",
    detail:
      "Waiting on a simulated confirmation. A live swap would show an explorer link here.",
  },
  confirmed: {
    title: "Confirmed (DEMO)",
    detail:
      "The demo marks this as filled. No tokens moved. No hash-lock was opened.",
  },
  failed: {
    title: "Failed (DEMO)",
    detail:
      "The simulated swap did not fill. A live revert would name the cause, such as the price moving past slippage.",
  },
};

export function TxProgress({ phase }: { phase: TxPhase }) {
  const copy = COPY[phase];
  const order: TxPhase[] = ["submitted", "pending", "confirmed"];
  return (
    <div className="tx" data-testid="tx-progress" aria-live="polite">
      <p className="tx__title">{copy.title}</p>
      <p className="tx__detail">{copy.detail}</p>
      {phase !== "failed" && (
        <ol className="tx__rail">
          {order.map((p) => (
            <li
              key={p}
              className={
                p === phase
                  ? "is-current"
                  : order.indexOf(p) < order.indexOf(phase) ||
                      phase === "confirmed"
                    ? "is-done"
                    : ""
              }
            >
              {p}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
