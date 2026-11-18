import { useEffect, useId, useRef, useState } from "react";
import { formatUnits } from "../lib/format";
import { CHAIN_LABEL, DEMO_BALANCES, searchTokens } from "../lib/tokens";
import type { ChainId, Token } from "../lib/types";

export function TokenSelect({
  label,
  token,
  amount,
  onToken,
  onAmount,
  testId,
  disabled,
}: {
  label: string;
  token: Token;
  amount: string;
  onToken: (token: Token) => void;
  onAmount: (value: string) => void;
  testId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState<ChainId | "all">("all");
  const [ackUnverified, setAckUnverified] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const titleId = useId();
  const results = searchTokens(query, chain);
  const balance = DEMO_BALANCES[token.id] ?? 0n;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (open) {
      // Native dialogs already trap focus; move it to the search field.
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setAckUnverified(null);
    openerRef.current?.focus();
  }

  function pick(next: Token) {
    if (!next.verified && ackUnverified !== next.id) {
      setAckUnverified(next.id);
      return;
    }
    onToken(next);
    close();
  }

  return (
    <div className="token-field" data-testid={testId}>
      <div className="token-field__top">
        <span className="token-field__label">{label}</span>
        <span className="token-field__bal">
          Balance {formatUnits(balance, token.decimals, 4)} {token.symbol}
        </span>
      </div>
      <div className="token-field__row">
        <button
          type="button"
          className="token-pill"
          ref={openerRef}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid={`${testId}-opener`}
        >
          <span className="token-pill__sym">{token.symbol}</span>
          <span className="token-pill__chain">{CHAIN_LABEL[token.chain]}</span>
          {!token.verified && (
            <span className="tag tag--warn">Unverified</span>
          )}
          {token.buySellTaxBps > 0n && (
            <span className="tag tag--tax">Tax</span>
          )}
        </button>
        <input
          className="token-field__amount"
          inputMode="decimal"
          placeholder="0.0"
          aria-label={`${label} amount`}
          value={amount}
          disabled={disabled}
          onChange={(e) => onAmount(e.target.value)}
        />
      </div>
      {open ? (
      <dialog
        ref={dialogRef}
        className="picker"
        aria-labelledby={titleId}
        onClose={close}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="picker__head">
          <h2 id={titleId}>Select a token</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <label className="picker__search" htmlFor={searchId}>
          Search
          <input
            id={searchId}
            ref={searchRef}
            data-testid="token-search"
            value={query}
            placeholder="Name, symbol, or demo address"
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="seg" role="radiogroup" aria-label="Filter by chain">
          {(["all", "flop", "hyperevm"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={chain === c}
              className={chain === c ? "seg__btn is-on" : "seg__btn"}
              onClick={() => setChain(c)}
            >
              {c === "all" ? "All chains" : CHAIN_LABEL[c]}
            </button>
          ))}
        </div>
        <ul className="picker__list">
          {results.length === 0 && (
            <li className="picker__empty">
              No token matches that search. Try the demo address, for example
              demo:flop. Custom live addresses are not loaded in this demo.
            </li>
          )}
          {results.map((t) => {
            const bal = DEMO_BALANCES[t.id] ?? 0n;
            const pending = ackUnverified === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className="picker__row"
                  onClick={() => pick(t)}
                  data-testid={`${testId}-option-${t.id}`}
                >
                  <span className="picker__id">
                    <strong>{t.symbol}</strong>
                    <span>
                      {t.name} · {CHAIN_LABEL[t.chain]}
                    </span>
                    <span className="mono">{t.address}</span>
                  </span>
                  <span className="picker__meta">
                    {t.verified ? (
                      <span className="tag tag--ok">Verified</span>
                    ) : (
                      <span className="tag tag--warn">Unverified</span>
                    )}
                    {t.buySellTaxBps > 0n && (
                      <span className="tag tag--tax">
                        {t.buySellTaxBps.toString()} bps tax
                      </span>
                    )}
                    <span>
                      {formatUnits(bal, t.decimals, 4)} {t.symbol}
                    </span>
                  </span>
                </button>
                {pending && (
                  <div className="picker__ack" data-testid="unverified-ack">
                    <p>
                      {t.symbol} is not in the verified catalog. Tickers can be
                      cloned. Confirm you mean the demo address {t.address}{" "}
                      before using it. This is not an endorsement.
                    </p>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => pick(t)}
                    >
                      Use {t.symbol} anyway
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </dialog>
      ) : null}
    </div>
  );
}
