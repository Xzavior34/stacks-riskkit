import { describe, expect, it } from "vitest";
import { calculateSbtcExposure } from "../src/risk/exposure.js";
import type { PortfolioSnapshot } from "../src/types.js";

function snapshot(positions: PortfolioSnapshot["positions"]): PortfolioSnapshot {
  return {
    address: "ST_TEST",
    network: "testnet",
    positions,
    timestamp: new Date().toISOString(),
    isLiveData: true,
  };
}

describe("calculateSbtcExposure", () => {
  it("returns 0 / low for an empty portfolio", () => {
    const signal = calculateSbtcExposure(snapshot([]));
    expect(signal.value).toBe(0);
    expect(signal.level).toBe("low");
  });

  it("computes exposure using explicit values when provided", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "fixture.sbtc", symbol: "sBTC", amount: "1", decimals: 8, value: 72, source: "fixture" },
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 6, value: 28, source: "stacks-api" },
      ]),
    );
    expect(signal.value).toBeCloseTo(0.72, 5);
    expect(signal.level).toBe("high");
  });

  it("classifies medium exposure between 40% and 70%", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "fixture.sbtc", symbol: "sBTC", amount: "1", decimals: 8, value: 50, source: "fixture" },
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 6, value: 50, source: "stacks-api" },
      ]),
    );
    expect(signal.level).toBe("medium");
  });

  it("classifies low exposure under 40%", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "fixture.sbtc", symbol: "sBTC", amount: "1", decimals: 8, value: 10, source: "fixture" },
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 6, value: 90, source: "stacks-api" },
      ]),
    );
    expect(signal.level).toBe("low");
  });

  it("matches an asset by assetId containing 'sbtc' even with a different symbol case", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        {
          assetId: "ST1ABC.sbtc-token::sbtc-token",
          symbol: "sbtc-token",
          amount: "100000000",
          decimals: 8,
          source: "stacks-api",
        },
      ]),
    );
    expect(signal.value).toBe(1);
  });

  it("falls back to raw-amount weighting when no value is supplied, for same-decimal assets", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "sbtc", symbol: "sBTC", amount: "80", decimals: 8, source: "fixture" },
        { assetId: "other", symbol: "OTHER", amount: "20", decimals: 8, source: "fixture" },
      ]),
    );
    expect(signal.value).toBeCloseTo(0.8, 5);
  });

  it("never exceeds 1 even with pathological inputs", () => {
    const signal = calculateSbtcExposure(
      snapshot([{ assetId: "sbtc", symbol: "sBTC", amount: "1", decimals: 0, value: 999999, source: "fixture" }]),
    );
    expect(signal.value).toBeLessThanOrEqual(1);
  });

  it("excludes a position with unknown decimals and no explicit value, and reports it", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "sbtc", symbol: "sBTC", amount: "80", decimals: 8, source: "fixture" },
        {
          assetId: "SP123.mystery-token::foo",
          symbol: "FOO",
          amount: "999999999",
          decimals: null,
          source: "stacks-api",
        },
      ]),
    );
    // Only the sBTC position (known decimals) is weighable, so it's 100% of the computable total.
    expect(signal.value).toBe(1);
    expect(signal.excludedAssets).toHaveLength(1);
    expect(signal.excludedAssets[0].symbol).toBe("FOO");
    expect(signal.explanation).toContain("excluded");
  });

  it("still uses an unknown-decimals position if an explicit value is supplied", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "sbtc", symbol: "sBTC", amount: "1", decimals: 8, value: 50, source: "fixture" },
        {
          assetId: "SP123.mystery-token::foo",
          symbol: "FOO",
          amount: "1",
          decimals: null,
          value: 50,
          source: "stacks-api",
        },
      ]),
    );
    expect(signal.excludedAssets).toHaveLength(0);
    expect(signal.value).toBeCloseTo(0.5, 5);
  });

  it("reports 0 without crashing when every position has unknown decimals", () => {
    const signal = calculateSbtcExposure(
      snapshot([
        { assetId: "SP123.mystery-token::foo", symbol: "FOO", amount: "1", decimals: null, source: "stacks-api" },
      ]),
    );
    expect(signal.value).toBe(0);
    expect(signal.excludedAssets).toHaveLength(1);
    expect(signal.explanation).toContain("computable value");
  });
});
