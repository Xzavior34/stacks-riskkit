import { describe, expect, it, vi } from "vitest";
import { StacksClient } from "../src/stacks/client.js";
import { buildPortfolioSnapshot, fetchAddressPositions } from "../src/stacks/balances.js";

function fakeFetch(responses: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const matchedKey = Object.keys(responses).find((key) => url.includes(key));
    if (!matchedKey) {
      throw new Error(`Unexpected fetch call in test: ${url}`);
    }
    return new Response(JSON.stringify(responses[matchedKey]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("fetchAddressPositions (verified v3 principal balance endpoints)", () => {
  it("normalizes a nonzero STX balance with known (protocol-constant) decimals", async () => {
    const fetchImpl = fakeFetch({
      "/balances/stx": { balance: "1500000" },
      "/balances/ft": { results: [] },
    });
    const client = new StacksClient({ fetchImpl });
    const positions = await fetchAddressPositions(client, "ST_TEST");

    expect(positions).toHaveLength(1);
    expect(positions[0]).toMatchObject({ assetId: "stx", symbol: "STX", amount: "1500000", decimals: 6 });
  });

  it("omits STX from positions when the balance is zero", async () => {
    const fetchImpl = fakeFetch({
      "/balances/stx": { balance: "0" },
      "/balances/ft": { results: [] },
    });
    const client = new StacksClient({ fetchImpl });
    const positions = await fetchAddressPositions(client, "ST_TEST");
    expect(positions).toHaveLength(0);
  });

  it("normalizes fungible-token balances with decimals explicitly null (never guessed)", async () => {
    const fetchImpl = fakeFetch({
      "/balances/stx": { balance: "0" },
      "/balances/ft": {
        results: [{ asset_identifier: "SP123.mystery-token::foo", balance: "42000000" }],
      },
    });
    const client = new StacksClient({ fetchImpl });
    const positions = await fetchAddressPositions(client, "ST_TEST");

    expect(positions).toHaveLength(1);
    expect(positions[0].assetId).toBe("SP123.mystery-token::foo");
    expect(positions[0].symbol).toBe("FOO");
    expect(positions[0].amount).toBe("42000000");
    expect(positions[0].decimals).toBeNull();
    expect(positions[0].source).toBe("stacks-api");
  });

  it("skips zero-balance fungible tokens", async () => {
    const fetchImpl = fakeFetch({
      "/balances/stx": { balance: "0" },
      "/balances/ft": {
        results: [{ asset_identifier: "SP123.mystery-token::foo", balance: "0" }],
      },
    });
    const client = new StacksClient({ fetchImpl });
    const positions = await fetchAddressPositions(client, "ST_TEST");
    expect(positions).toHaveLength(0);
  });
});

describe("buildPortfolioSnapshot", () => {
  it("marks isLiveData true only when every position came from the Stacks API", () => {
    const live = buildPortfolioSnapshot("ST_TEST", [
      { assetId: "stx", symbol: "STX", amount: "1", decimals: 6, source: "stacks-api" },
    ]);
    expect(live.isLiveData).toBe(true);

    const mixed = buildPortfolioSnapshot("ST_TEST", [
      { assetId: "stx", symbol: "STX", amount: "1", decimals: 6, source: "stacks-api" },
      { assetId: "demo:sbtc", symbol: "sBTC (demo)", amount: "1", decimals: 8, source: "fixture" },
    ]);
    expect(mixed.isLiveData).toBe(false);
  });

  it("marks isLiveData true for an empty position list (vacuously true, no fixture present)", () => {
    const empty = buildPortfolioSnapshot("ST_TEST", []);
    expect(empty.isLiveData).toBe(true);
  });
});
