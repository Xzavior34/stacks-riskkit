import type { PortfolioSnapshot, RiskLevel, RiskSignal } from "../types.js";
import {
  excludedAssetsNote,
  isSbtc,
  positionWeight,
  summarizeWeight,
  toExcludedAsset,
} from "./valuation.js";

/**
 * sBTC exposure = (sum of sBTC position weight) / (sum of all *weighable*
 * position weight), for the assets represented in the portfolio snapshot.
 *
 * A position is "weighable" if it has an explicit `value` or a known
 * `decimals`. Positions with unknown decimals and no explicit value are
 * excluded from both the numerator and denominator rather than guessed —
 * they are reported separately via `excludedAssets`.
 *
 * This is a share-of-weighable-tracked-portfolio metric, not a share of
 * the holder's total net worth — RiskKit only ever reasons about the
 * positions it was given and can actually compute a value for.
 */
export function calculateSbtcExposure(portfolio: PortfolioSnapshot): RiskSignal {
  const { total, excluded } = summarizeWeight(portfolio.positions);
  const excludedAssets = excluded.map(toExcludedAsset);
  const note = excludedAssetsNote(excluded);

  if (total <= 0) {
    const explanation =
      portfolio.positions.length === 0
        ? "No tracked portfolio value; sBTC exposure is undefined and reported as 0."
        : `No positions with a computable value; sBTC exposure is undefined and reported as 0.${note}`;
    return { metric: "sbtc_exposure", value: 0, level: "low", explanation, excludedAssets };
  }

  const sbtcWeight = portfolio.positions
    .filter(isSbtc)
    .reduce((sum, p) => sum + (positionWeight(p) ?? 0), 0);

  const value = clamp01(sbtcWeight / total);
  const level = exposureLevel(value);
  const pct = Math.round(value * 100);

  return {
    metric: "sbtc_exposure",
    value,
    level,
    explanation: `${pct}% of the tracked, computable portfolio is exposed to sBTC.${note}`,
    excludedAssets,
  };
}

function exposureLevel(value: number): RiskLevel {
  if (value >= 0.7) return "high";
  if (value >= 0.4) return "medium";
  return "low";
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
