/** Display helpers for token amounts. Parsing is strict; bad input returns null. */

export function formatUnits(
  amount: bigint,
  decimals: number,
  maxFrac = 6,
): string {
  if (decimals < 0 || decimals > 36) {
    throw new RangeError("decimals out of range");
  }
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let frac = (abs % base).toString().padStart(decimals, "0");
  if (maxFrac < decimals) {
    frac = frac.slice(0, maxFrac);
  }
  frac = frac.replace(/0+$/, "");
  const sign = neg ? "-" : "";
  return frac.length > 0
    ? `${sign}${whole.toString()}.${frac}`
    : `${sign}${whole.toString()}`;
}

export function parseUnits(raw: string, decimals: number): bigint | null {
  if (decimals < 0 || decimals > 36) {
    throw new RangeError("decimals out of range");
  }
  const t = raw.trim();
  if (!t || t === ".") return null;
  if (!/^\d*(\.\d*)?$/.test(t)) return null;
  const [wholeRaw, fracRaw = ""] = t.split(".");
  if (fracRaw.length > decimals) return null;
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const frac = fracRaw.padEnd(decimals, "0");
  try {
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac || "0");
  } catch {
    return null;
  }
}

export function formatUsdFromMicros(micros: bigint): string {
  const neg = micros < 0n;
  const abs = neg ? -micros : micros;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${neg ? "-" : ""}$${whole.toString()}.${frac}`;
}

export function countdownLabel(msLeft: number): string {
  const sec = Math.max(0, Math.ceil(msLeft / 1000));
  return `Quote expires in ${sec}s`;
}
