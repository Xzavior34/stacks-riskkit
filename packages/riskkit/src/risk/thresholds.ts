import type {
  RiskSignal,
  ThresholdConfig,
  ThresholdEvaluation,
  TriggeredRule,
} from "../types.js";

const SIGNAL_FOR_RULE: Record<keyof ThresholdConfig, string> = {
  maxSbtcExposure: "sbtc_exposure",
  maxConcentration: "concentration",
};

/**
 * Evaluates a set of risk signals against developer-supplied thresholds.
 *
 * A rule triggers when the corresponding signal's value strictly exceeds
 * the configured threshold. Every triggered rule is returned with both the
 * threshold and the actual value, so a developer (or end user) can see
 * exactly why a warning fired.
 */
export function evaluateThresholds(
  signals: RiskSignal[],
  config: ThresholdConfig,
): ThresholdEvaluation {
  const signalByMetric = new Map(signals.map((s) => [s.metric, s]));
  const triggeredRules: TriggeredRule[] = [];

  for (const rule of Object.keys(config) as (keyof ThresholdConfig)[]) {
    const threshold = config[rule];
    if (threshold === undefined) continue;

    const metric = SIGNAL_FOR_RULE[rule];
    const signal = signalByMetric.get(metric);
    if (!signal) continue;

    if (signal.value > threshold) {
      const actualPct = Math.round(signal.value * 100);
      const thresholdPct = Math.round(threshold * 100);
      triggeredRules.push({
        rule,
        threshold,
        actual: signal.value,
        explanation: `${metric} is ${actualPct}%, exceeding the configured ${rule} limit of ${thresholdPct}%.`,
      });
    }
  }

  const status = triggeredRules.length > 0 ? "warning" : "ok";
  const explanation =
    triggeredRules.length > 0
      ? triggeredRules.map((r) => r.explanation)
      : ["All tracked signals are within configured thresholds."];

  return { status, triggeredRules, explanation };
}
