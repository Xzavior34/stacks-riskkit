import type { RiskScore, RiskSignal, ThresholdEvaluation } from "../types.js";

/**
 * PROTOTYPE HEURISTIC — not a predictive or financial model.
 *
 * The score is a simple weighted average of tracked risk signal values
 * (each already 0-1), scaled to 0-100, with a flat penalty added per
 * triggered threshold rule. It exists purely to give a single glanceable
 * number in the reference demo; the individual signals underneath it
 * always remain visible and are the actual source of truth.
 *
 * Weights: sbtc_exposure 0.5, concentration 0.5 (equal weight by default;
 * any signal not present is simply excluded and the remaining weights are
 * renormalized). Each triggered threshold rule adds +10 to the score,
 * capped at 100.
 */
const SIGNAL_WEIGHTS: Record<string, number> = {
  sbtc_exposure: 0.5,
  concentration: 0.5,
};

const TRIGGERED_RULE_PENALTY = 10;

export function calculateRiskScore(
  signals: RiskSignal[],
  thresholds: ThresholdEvaluation,
): RiskScore {
  const relevant = signals.filter((s) => s.metric in SIGNAL_WEIGHTS);
  const weightSum = relevant.reduce((sum, s) => sum + SIGNAL_WEIGHTS[s.metric], 0);

  const weightedAverage =
    weightSum > 0
      ? relevant.reduce((sum, s) => sum + s.value * SIGNAL_WEIGHTS[s.metric], 0) / weightSum
      : 0;

  const base = weightedAverage * 100;
  const penalty = thresholds.triggeredRules.length * TRIGGERED_RULE_PENALTY;
  const score = Math.min(100, Math.round(base + penalty));

  const label = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    score,
    label,
    explanation:
      "Prototype heuristic: weighted average of tracked risk signals (sBTC exposure 50%, concentration 50%), " +
      `plus +${TRIGGERED_RULE_PENALTY} per triggered threshold rule, capped at 100. ` +
      "Not financial advice and not a prediction of losses — see docs/RISK_MODEL.md.",
    isHeuristic: true,
  };
}
