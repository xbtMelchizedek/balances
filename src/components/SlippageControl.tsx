import { useId, useState } from "react";
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
  const headingId = useId();
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
      <button
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls={headingId}
        aria-label={`Trade settings, max slippage ${formatBpsAsPercent(shownBps)}`}
        onClick={() => setOpen((v) => !v)}
        data-testid="slippage-toggle"
      >
        <SettingsIcon />
        <span className="icon-btn__meta">{formatBpsAsPercent(shownBps)}</span>
      </button>
      {open && (
        <div
          className="slippage__panel"
          id={headingId}
          role="region"
          aria-label="Trade settings"
        >
          <div className="slippage__row">
            <p className="slippage__label">Max slippage</p>
            <button
              type="button"
              className="btn btn--ghost btn--small"
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
            </button>
          </div>
          <div className="seg" role="radiogroup" aria-label="Slippage mode">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "auto"}
              className={mode === "auto" ? "seg__btn is-on" : "seg__btn"}
              onClick={() =>
                onChange({ mode: "auto", bps: auto.bps, ackHigh: false })
              }
            >
              Auto
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "manual"}
              className={mode === "manual" ? "seg__btn is-on" : "seg__btn"}
              onClick={() =>
                onChange({ mode: "manual", bps, ackHigh: false })
              }
            >
              Manual
            </button>
          </div>
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
                  className={
                    bps === p ? "chip chip--on" : "chip"
                  }
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
            <label className="ack">
              <input
                type="checkbox"
                checked={ackHigh}
                onChange={(e) =>
                  onChange({ mode, bps: shownBps, ackHigh: e.target.checked })
                }
                data-testid="slippage-ack"
              />
              I understand I may receive at least{" "}
              {formatBpsAsPercent(shownBps)} less than the quote.
            </label>
          )}
          <p className="slippage__note">
            Manual default is {formatBpsAsPercent(DEFAULT_SLIPPAGE_BPS)}. Gas
            is simulated as Fast in this demo.
          </p>
        </div>
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.2 1.5h3.6l.4 1.7a5.8 5.8 0 0 1 1.5.9l1.7-.5 1.8 3.1-1.3 1.2c.1.5.1 1 0 1.5l1.3 1.2-1.8 3.1-1.7-.5a5.8 5.8 0 0 1-1.5.9l-.4 1.7H7.2l-.4-1.7a5.8 5.8 0 0 1-1.5-.9l-1.7.5-1.8-3.1 1.3-1.2a5.8 5.8 0 0 1 0-1.5L1.8 7.7 3.6 4.6l1.7.5a5.8 5.8 0 0 1 1.5-.9l.4-1.7ZM9 7.2A1.8 1.8 0 1 0 9 10.8 1.8 1.8 0 0 0 9 7.2Z"
      />
    </svg>
  );
}
