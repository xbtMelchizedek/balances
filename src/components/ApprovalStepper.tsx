export type ApprovalStep = "connect" | "approve" | "place" | "done";
export type ApprovalMode = "auto" | "standard";

export function ApprovalStepper({
  mode,
  step,
  sellSymbol,
  connected,
}: {
  mode: ApprovalMode;
  step: ApprovalStep;
  sellSymbol: string;
  connected: boolean;
}) {
  const steps =
    mode === "auto"
      ? [
          { id: "connect", label: "Connect demo wallet" },
          {
            id: "place",
            label: `Sign gasless ${sellSymbol} swap (one-time Permit2, DEMO)`,
          },
        ]
      : [
          { id: "connect", label: "Connect demo wallet" },
          {
            id: "approve",
            label: `Approve ${sellSymbol} (one-time allowance, DEMO)`,
          },
          { id: "place", label: "Place order (DEMO)" },
        ];

  const currentIndex = steps.findIndex((s) => s.id === step);

  return (
    <ol className="stepper" data-testid="approval-stepper">
      {steps.map((s, i) => {
        const state =
          !connected && s.id !== "connect"
            ? "todo"
            : s.id === step
              ? "current"
              : currentIndex > i || step === "done"
                ? "done"
                : "todo";
        return (
          <li key={s.id} className={`stepper__item is-${state}`}>
            <span className="stepper__idx" aria-hidden="true">
              {state === "done" ? "✓" : i + 1}
            </span>
            <span>
              {s.label}
              {state === "current" ? " (current)" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
