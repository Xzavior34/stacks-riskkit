import { describe, expect, it } from "vitest";
import { calculateConcentration } from "../src/risk/concentration.js";
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

describe("calculateConcentration", () => {
  it("returns 0 / low for an empty portfolio", () => {
    const signal = calculateConcentration(snapshot([]));
    expect(signal.value).toBe(0);
    expect(signal.level).toBe("low");
  });

  it("returns 1.0 / high for a single-asset portfolio", () => {
    const signal = calculateConcentration(
      snapshot([{ assetId: "stx", symbol: "STX", amount: "1", decimals: 6, value: 100, source: "stacks-api" }]),
    );
    expect(signal.value).toBe(1);
    expect(signal.level).toBe("high");
  });

  it("returns a low value for an evenly split portfolio across many assets", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "a", symbol: "A", amount: "1", decimals: 0, value: 25, source: "fixture" },
        { assetId: "b", symbol: "B", amount: "1", decimals: 0, value: 25, source: "fixture" },
        { assetId: "c", symbol: "C", amount: "1", decimals: 0, value: 25, source: "fixture" },
        { assetId: "d", symbol: "D", amount: "1", decimals: 0, value: 25, source: "fixture" },
      ]),
    );
    expect(signal.value).toBeCloseTo(0.25, 5);
    expect(signal.level).toBe("low");
  });

  it("classifies medium concentration between 50% and 80%", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "a", symbol: "A", amount: "1", decimals: 0, value: 60, source: "fixture" },
        { assetId: "b", symbol: "B", amount: "1", decimals: 0, value: 40, source: "fixture" },
      ]),
    );
    expect(signal.level).toBe("medium");
  });

  it("sums multiple positions sharing the same assetId before comparing", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 0, value: 40, source: "stacks-api" },
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 0, value: 40, source: "stacks-api" },
        { assetId: "other", symbol: "OTHER", amount: "1", decimals: 0, value: 20, source: "fixture" },
      ]),
    );
    expect(signal.value).toBeCloseTo(0.8, 5);
    expect(signal.level).toBe("high");
  });

  it("handles large token amounts without precision loss when falling back to raw amounts", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "big", symbol: "BIG", amount: "900000000000000000", decimals: 8, source: "fixture" },
        { assetId: "small", symbol: "SMALL", amount: "100000000000000000", decimals: 8, source: "fixture" },
      ]),
    );
    expect(signal.value).toBeCloseTo(0.9, 5);
  });

  it("excludes an unknown-decimals position from both numerator and denominator", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "stx", symbol: "STX", amount: "1", decimals: 0, value: 100, source: "stacks-api" },
        {
          assetId: "SP123.mystery-token::foo",
          symbol: "FOO",
          amount: "5000000000",
          decimals: null,
          source: "stacks-api",
        },
      ]),
    );
    expect(signal.value).toBe(1);
    expect(signal.excludedAssets).toEqual([
      expect.objectContaining({ assetId: "SP123.mystery-token::foo", symbol: "FOO" }),
    ]);
  });

  it("reports 0 without crashing when every position has unknown decimals", () => {
    const signal = calculateConcentration(
      snapshot([
        { assetId: "SP123.mystery-token::foo", symbol: "FOO", amount: "1", decimals: null, source: "stacks-api" },
        { assetId: "SP123.other-token::bar", symbol: "BAR", amount: "1", decimals: null, source: "stacks-api" },
      ]),
    );
    expect(signal.value).toBe(0);
    expect(signal.excludedAssets).toHaveLength(2);
  });
});
