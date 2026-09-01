import type { PortfolioSnapshot, RiskLevel, RiskSignal } from "../types.js";
import { excludedAssetsNote, positionWeight, summarizeWeight, toExcludedAsset } from "./valuation.js";

/**
 * Concentration = the largest single position's weight divided by total
 * *weighable* tracked portfolio weight. This is the simplest possible
 * concentration measure (a "largest share" metric, not Herfindahl-Hirschman
 * or similar) — chosen deliberately for transparency in a proof of
 * concept. Positions sharing the same `assetId` are summed together
 * before comparison.
 *
 * A position is "weighable" if it has an explicit `value` or a known
 * `decimals`; positions with unknown decimals and no explicit value are
 * excluded rather than guessed, and reported via `excludedAssets`.
 */
export function calculateConcentration(portfolio: PortfolioSnapshot): RiskSignal {
  const { total, excluded } = summarizeWeight(portfolio.positions);
  const excludedAssets = excluded.map(toExcludedAsset);
  const note = excludedAssetsNote(excluded);

  if (total <= 0) {
    const explanation =
      portfolio.positions.length === 0
        ? "No tracked portfolio value; concentration is undefined and reported as 0."
        : `No positions with a computable value; concentration is undefined and reported as 0.${note}`;
    return { metric: "concentration", value: 0, level: "low", explanation, excludedAssets };
  }

  const byAsset = new Map<string, number>();
  for (const position of portfolio.positions) {
    const weight = positionWeight(position);
    if (weight === null) continue;
    byAsset.set(position.assetId, (byAsset.get(position.assetId) ?? 0) + weight);
  }

  let largestAssetId = "";
  let largestWeight = 0;
  for (const [assetId, weight] of byAsset) {
    if (weight > largestWeight) {
      largestWeight = weight;
      largestAssetId = assetId;
    }
  }

  const value = clamp01(largestWeight / total);
  const level = concentrationLevel(value);
  const pct = Math.round(value * 100);
  const symbol = symbolFor(portfolio, largestAssetId) ?? largestAssetId;

  return {
    metric: "concentration",
    value,
    level,
    explanation: `${pct}% of tracked, computable value is concentrated in one asset (${symbol}).${note}`,
    excludedAssets,
  };
}

function symbolFor(portfolio: PortfolioSnapshot, assetId: string): string | undefined {
  return portfolio.positions.find((p) => p.assetId === assetId)?.symbol;
}

function concentrationLevel(value: number): RiskLevel {
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
