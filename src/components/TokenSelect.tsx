import { useState } from "react";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/arc/dialog/dialog";
import { SearchField } from "@/components/arc/search-field/search-field";
import { Select } from "@/components/arc/select/select";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { formatUnits } from "../lib/format";
import { CHAIN_LABEL, DEMO_BALANCES, searchTokens } from "../lib/tokens";
import type { ChainId, Token } from "../lib/types";

const CHAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All chains" },
  { value: "flop", label: CHAIN_LABEL.flop },
  { value: "hyperevm", label: CHAIN_LABEL.hyperevm },
];

function TokenMarks({ token }: { token: Token }) {
  return (
    <>
      {token.verified ? (
        <Badge tone="success" size="sm">
          Verified
        </Badge>
      ) : (
        <Tooltip content="This ticker is not in the verified catalog. Confirm the address before using it.">
          <span tabIndex={0} className="token-mark">
            <Badge tone="warning" size="sm">
              Unverified
            </Badge>
          </span>
        </Tooltip>
      )}
      {token.buySellTaxBps > 0n && (
        <Tooltip content="A buy or sell tax goes to the token project, not this demo.">
          <span tabIndex={0} className="token-mark">
            <Badge tone="warning" size="sm">
              {token.buySellTaxBps.toString()} bps tax
            </Badge>
          </span>
        </Tooltip>
      )}
    </>
  );
}

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
  const results = searchTokens(query, chain);
  const balance = DEMO_BALANCES[token.id] ?? 0n;

  function close() {
    setOpen(false);
    setQuery("");
    setAckUnverified(null);
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
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (next) setOpen(true);
            else close();
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              className="token-pill"
              aria-haspopup="dialog"
              aria-expanded={open}
              data-testid={`${testId}-opener`}
            >
              <span className="token-pill__sym">{token.symbol}</span>
              <span className="token-pill__chain">{CHAIN_LABEL[token.chain]}</span>
              {!token.verified && (
                <Badge tone="warning" size="sm">
                  Unverified
                </Badge>
              )}
              {token.buySellTaxBps > 0n && (
                <Badge tone="warning" size="sm">
                  Tax
                </Badge>
              )}
            </button>
          </DialogTrigger>
          <DialogContent title="Select a token" className="picker-dialog">
            <SearchField
              label="Search"
              value={query}
              onValueChange={setQuery}
              data-testid="token-search"
              placeholder="Name, symbol, or demo address"
              autoComplete="off"
            />
            <Select
              label="Filter by chain"
              value={chain}
              onValueChange={(value) => setChain(value as ChainId | "all")}
              options={CHAIN_OPTIONS}
            />
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
                        <TokenMarks token={t} />
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
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => pick(t)}
                        >
                          Use {t.symbol} anyway
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
