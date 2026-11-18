import { Stepper } from "@/components/arc/stepper/stepper";

export type ApprovalStep = "connect" | "approve" | "place" | "done";
export type ApprovalMode = "auto" | "standard";

export function ApprovalStepper({
  mode,
  step,
  sellSymbol,
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

  const current =
    step === "done"
      ? steps.length
      : Math.max(0, steps.findIndex((s) => s.id === step));

  return (
    <div className="approval-stepper" data-testid="approval-stepper">
      <Stepper
        steps={steps}
        current={current}
        orientation="vertical"
        details="all"
        label="Approval steps"
      />
    </div>
  );
}
