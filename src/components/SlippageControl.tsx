import { useId, useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/arc/popover/popover";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { Settings } from "lucide-react";
import {
  DEFAULT_SLIPPAGE_BPS,
  autoSlippageBps,
  formatBpsAsPercent,
  parseSlippageInput,
  slippageNeedsAck,
  slippageNeedsWarn,
  type LiquidityBand,
} from "../lib/quoteMath";

const PRESETS: bigint[] = [10n, 50n, 100n]; // 0.1, 0.5, 1.0

export type SlippageMode = "auto" | "manual";

export function SlippageControl({
  mode,
  bps,
  band,
  ackHigh,
  onChange,
}: {
  mode: SlippageMode;
  bps: bigint;
  band: LiquidityBand;
  ackHigh: boolean;
  onChange: (next: {
    mode: SlippageMode;
    bps: bigint;
    ackHigh: boolean;
  }) => void;
}) {
  const customId = useId();
  const auto = autoSlippageBps(band);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(formatBpsAsPercent(bps).replace("%", ""));
  const parsed = parseSlippageInput(draft);
  const shownBps = mode === "auto" ? auto.bps : bps;
  const warn = slippageNeedsWarn(shownBps) || (mode === "auto" && auto.warn);
  const needsAck = slippageNeedsAck(shownBps);

  function applyManual(next: bigint) {
    onChange({
      mode: "manual",
      bps: next,
      ackHigh: next < 500n ? false : ackHigh,
    });
    setDraft(formatBpsAsPercent(next).replace("%", ""));
  }

  return (
    <div className="slippage" data-testid="slippage-control">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip content={`Trade settings, max slippage ${formatBpsAsPercent(shownBps)}`}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={open}
              aria-label={`Trade settings, max slippage ${formatBpsAsPercent(shownBps)}`}
              data-testid="slippage-toggle"
            >
              <Settings width={18} height={18} aria-hidden="true" />
              {formatBpsAsPercent(shownBps)}
            </Button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="end"
          aria-label="Trade settings"
          className="slippage__panel"
        >
          <div className="slippage__row">
            <p className="slippage__label">Max slippage</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({
                  mode: "auto",
                  bps: auto.bps,
                  ackHigh: false,
                });
                setDraft(formatBpsAsPercent(auto.bps).replace("%", ""));
              }}
            >
              Use defaults
            </Button>
          </div>
          <SegmentedControl
            label="Slippage mode"
            value={mode}
            onValueChange={(value) => {
              if (value === "auto") {
                onChange({ mode: "auto", bps: auto.bps, ackHigh: false });
              } else {
                onChange({ mode: "manual", bps, ackHigh: false });
              }
            }}
            options={[
              { value: "auto", label: "Auto" },
              { value: "manual", label: "Manual" },
            ]}
          />
          {mode === "auto" ? (
            <p className="slippage__note">
              Auto picked {formatBpsAsPercent(auto.bps)} for this pair
              {auto.warn
                ? ", wider than the 0.5% default, because the book is thin or volatile."
                : ". The 0.5% manual default is still available if you switch back."}
            </p>
          ) : (
            <div className="slippage__presets">
              {PRESETS.map((p) => (
                <button
                  key={p.toString()}
                  type="button"
                  className={bps === p ? "chip chip--on" : "chip"}
                  onClick={() => applyManual(p)}
                >
                  {formatBpsAsPercent(p)}
                </button>
              ))}
              <label className="slippage__custom" htmlFor={customId}>
                Custom
                <input
                  id={customId}
                  inputMode="decimal"
                  value={draft}
                  aria-invalid={parsed === null}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    const next = parseSlippageInput(e.target.value);
                    if (next !== null) applyManual(next);
                  }}
                />
                <span aria-hidden="true">%</span>
              </label>
            </div>
          )}
          {warn && (
            <p className="warn-copy" data-testid="slippage-warn">
              Slippage of {formatBpsAsPercent(shownBps)} can fill well below
              the quoted price. If the market moves past this limit, the swap
              should revert rather than take a worse fill.
            </p>
          )}
          {needsAck && (
            <Checkbox
              checked={ackHigh}
              onCheckedChange={(checked) =>
                onChange({
                  mode,
                  bps: shownBps,
                  ackHigh: checked === true,
                })
              }
              data-testid="slippage-ack"
              label={`I understand I may receive at least ${formatBpsAsPercent(shownBps)} less than the quote.`}
            />
          )}
          <p className="slippage__note">
            Manual default is {formatBpsAsPercent(DEFAULT_SLIPPAGE_BPS)}. Gas
            is simulated as Fast in this demo.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
