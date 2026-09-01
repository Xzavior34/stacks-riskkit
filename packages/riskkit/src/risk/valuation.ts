import type { AssetPosition, ExcludedAsset } from "../types.js";

/**
 * Resolves a comparable numeric "weight" for a position, or `null` if it
 * cannot be safely computed.
 *
 * If the caller supplied a `value` (e.g. a USD-equivalent), that is
 * always used, regardless of whether `decimals` is known. Otherwise, the
 * raw base-unit amount is normalized using `decimals` — but only if
 * `decimals` is known (non-null). RiskKit never guesses a decimals value:
 * a position with unknown decimals and no explicit `value` returns `null`
 * here and is excluded from whatever calculation is using this weight.
 */
export function positionWeight(position: AssetPosition): number | null {
  if (typeof position.value === "number" && Number.isFinite(position.value)) {
    return position.value;
  }
  if (position.decimals === null) {
    return null;
  }
  const raw = BigInt(position.amount || "0");
  return Number(raw) / 10 ** position.decimals;
}

export interface WeightSummary {
  /** Sum of weight() across all positions that could be weighed. */
  total: number;
  /** Positions that could not be weighed (unknown decimals, no value). */
  excluded: AssetPosition[];
}

export function summarizeWeight(positions: AssetPosition[]): WeightSummary {
  let total = 0;
  const excluded: AssetPosition[] = [];
  for (const position of positions) {
    const weight = positionWeight(position);
    if (weight === null) {
      excluded.push(position);
      continue;
    }
    total += weight;
  }
  return { total, excluded };
}

export function toExcludedAsset(position: AssetPosition): ExcludedAsset {
  return {
    assetId: position.assetId,
    symbol: position.symbol,
    reason:
      "decimals unknown for this token and no explicit value was supplied — " +
      "excluded rather than guessed (see docs/RISK_MODEL.md)",
  };
}

export function excludedAssetsNote(excluded: AssetPosition[]): string {
  if (excluded.length === 0) return "";
  const symbols = excluded.map((p) => p.symbol).join(", ");
  return (
    ` ${excluded.length} token${excluded.length === 1 ? "" : "s"} excluded from this ` +
    `calculation because ${excluded.length === 1 ? "its" : "their"} decimals could not be ` +
    `verified: ${symbols}.`
  );
}

export function isSbtc(position: AssetPosition): boolean {
  return (
    position.symbol.toUpperCase() === "SBTC" ||
    position.assetId.toLowerCase().includes("sbtc")
  );
}
