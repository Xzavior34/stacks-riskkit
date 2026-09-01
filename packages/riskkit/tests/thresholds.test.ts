import { describe, expect, it } from "vitest";
import { evaluateThresholds } from "../src/risk/thresholds.js";
import type { RiskSignal } from "../src/types.js";

const exposureSignal = (value: number): RiskSignal => ({
  metric: "sbtc_exposure",
  value,
  level: "medium",
  explanation: "test",
  excludedAssets: [],
});

const concentrationSignal = (value: number): RiskSignal => ({
  metric: "concentration",
  value,
  level: "medium",
  explanation: "test",
  excludedAssets: [],
});

describe("evaluateThresholds", () => {
  it("returns ok status with no config", () => {
    const result = evaluateThresholds([exposureSignal(0.9)], {});
    expect(result.status).toBe("ok");
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("returns ok when signals are within configured thresholds", () => {
    const result = evaluateThresholds([exposureSignal(0.5)], { maxSbtcExposure: 0.7 });
    expect(result.status).toBe("ok");
  });

  it("triggers a rule when a signal strictly exceeds its threshold", () => {
    const result = evaluateThresholds([exposureSignal(0.85)], { maxSbtcExposure: 0.7 });
    expect(result.status).toBe("warning");
    expect(result.triggeredRules).toHaveLength(1);
    expect(result.triggeredRules[0].rule).toBe("maxSbtcExposure");
    expect(result.triggeredRules[0].actual).toBe(0.85);
    expect(result.triggeredRules[0].threshold).toBe(0.7);
  });

  it("does not trigger when the value exactly equals the threshold (boundary)", () => {
    const result = evaluateThresholds([exposureSignal(0.7)], { maxSbtcExposure: 0.7 });
    expect(result.status).toBe("ok");
  });

  it("can trigger multiple independent rules at once", () => {
    const result = evaluateThresholds(
      [exposureSignal(0.9), concentrationSignal(0.95)],
      { maxSbtcExposure: 0.7, maxConcentration: 0.8 },
    );
    expect(result.status).toBe("warning");
    expect(result.triggeredRules.map((r) => r.rule).sort()).toEqual([
      "maxConcentration",
      "maxSbtcExposure",
    ]);
  });

  it("ignores a configured rule if the corresponding signal is missing", () => {
    const result = evaluateThresholds([exposureSignal(0.9)], { maxConcentration: 0.5 });
    expect(result.status).toBe("ok");
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("every explanation string is human-readable and references the metric", () => {
    const result = evaluateThresholds([exposureSignal(0.85)], { maxSbtcExposure: 0.7 });
    expect(result.explanation[0]).toContain("sbtc_exposure");
  });
});
