import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "../src/risk/score.js";
import { evaluateThresholds } from "../src/risk/thresholds.js";
import type { RiskSignal } from "../src/types.js";

describe("calculateRiskScore", () => {
  it("returns 0 for a portfolio with no risk", () => {
    const signals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 0, level: "low", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 0, level: "low", explanation: "x", excludedAssets: [] },
    ];
    const thresholds = evaluateThresholds(signals, {});
    const score = calculateRiskScore(signals, thresholds);
    expect(score.score).toBe(0);
    expect(score.label).toBe("low");
    expect(score.isHeuristic).toBe(true);
  });

  it("weights sbtc_exposure and concentration equally at 50/50", () => {
    const signals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 1, level: "high", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 0, level: "low", explanation: "x", excludedAssets: [] },
    ];
    const thresholds = evaluateThresholds(signals, {});
    const score = calculateRiskScore(signals, thresholds);
    expect(score.score).toBe(50);
  });

  it("adds a penalty per triggered threshold rule, capped at 100", () => {
    const signals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 1, level: "high", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 1, level: "high", explanation: "x", excludedAssets: [] },
    ];
    const thresholds = evaluateThresholds(signals, { maxSbtcExposure: 0.1, maxConcentration: 0.1 });
    const score = calculateRiskScore(signals, thresholds);
    expect(score.score).toBe(100);
  });

  it("labels scores >= 70 as high, >= 40 as medium, else low", () => {
    const highSignals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 0.8, level: "high", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 0.8, level: "high", explanation: "x", excludedAssets: [] },
    ];
    const highScore = calculateRiskScore(highSignals, evaluateThresholds(highSignals, {}));
    expect(highScore.label).toBe("high");

    const medSignals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 0.5, level: "medium", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 0.5, level: "medium", explanation: "x", excludedAssets: [] },
    ];
    const medScore = calculateRiskScore(medSignals, evaluateThresholds(medSignals, {}));
    expect(medScore.label).toBe("medium");
  });

  it("ignores unrelated signal metrics when computing the weighted average", () => {
    const signals: RiskSignal[] = [
      { metric: "sbtc_exposure", value: 1, level: "high", explanation: "x", excludedAssets: [] },
      { metric: "concentration", value: 0, level: "low", explanation: "x", excludedAssets: [] },
      { metric: "some_future_metric", value: 1, level: "high", explanation: "x", excludedAssets: [] },
    ];
    const thresholds = evaluateThresholds(signals, {});
    const score = calculateRiskScore(signals, thresholds);
    expect(score.score).toBe(50);
  });
});
