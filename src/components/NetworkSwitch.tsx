import { CHAIN_LABEL } from "../lib/tokens";
import type { ChainId } from "../lib/types";

export function NetworkSwitch({
  walletChain,
  requiredChain,
  onSwitch,
}: {
  walletChain: ChainId;
  requiredChain: ChainId;
  onSwitch: () => void;
}) {
  return (
    <div
      className="error-state error-state--network-mismatch"
      role="alert"
      data-testid="network-switch"
    >
      <p className="error-state__title">
        Switch to {CHAIN_LABEL[requiredChain]} network
      </p>
      <p className="error-state__detail">
        The demo wallet is on {CHAIN_LABEL[walletChain]}. This pair settles on{" "}
        {CHAIN_LABEL[requiredChain]}. Switching networks does not clear the
        amount you entered.
      </p>
      <button
        type="button"
        className="btn btn--primary"
        onClick={onSwitch}
        data-testid="switch-network"
      >
        Switch to {CHAIN_LABEL[requiredChain]} network (DEMO)
      </button>
    </div>
  );
}
