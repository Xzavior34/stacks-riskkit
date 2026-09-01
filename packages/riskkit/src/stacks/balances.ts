import type { AssetPosition, PortfolioSnapshot } from "../types.js";
import type { StacksClient } from "./client.js";

/**
 * Response shapes for the current (verified) Stacks Blockchain API v3
 * principal-balance endpoints. See docs/RESEARCH.md for the exact
 * endpoints, the source they were verified against, and the date of
 * verification. Only the fields RiskKit actually reads are declared.
 *
 * IMPORTANT: neither endpoint returns a `decimals` field for fungible
 * tokens — this was confirmed by inspecting the full, current OpenAPI
 * schema (no `decimals` property exists anywhere in it). RiskKit
 * therefore never fabricates a decimals value for a live fungible-token
 * position; see `decimals: null` handling below and in
 * `src/risk/valuation.ts`.
 */
export interface RawStxBalanceResponse {
  balance: string;
}

export interface RawFtBalancesResponse {
  results: Array<{
    asset_identifier: string;
    balance: string;
  }>;
}

const STX_DECIMALS = 6;

/**
 * Fetches raw balances for a testnet address/principal and normalizes
 * them into RiskKit's internal AssetPosition model.
 *
 * Makes exactly two real Stacks API calls — one for the STX balance, one
 * for the first page of fungible-token balances — and does not fabricate
 * or estimate any values.
 *
 * STX decimals (6) is a well-known, publicly documented Stacks protocol
 * constant, not a value read from this endpoint. Fungible-token
 * `decimals` is always set to `null` here, because the API does not
 * provide it; callers who know a specific token's decimals (e.g. from a
 * verified metadata source) can attach it to the returned position
 * themselves before running risk calculations.
 *
 * KNOWN LIMITATION: only the first page of fungible-token balances is
 * fetched (the API paginates this endpoint). A funded milestone should
 * add cursor-based pagination — see docs/GRANT_SCOPE.md.
 */
export async function fetchAddressPositions(
  client: StacksClient,
  principal: string,
): Promise<AssetPosition[]> {
  const positions: AssetPosition[] = [];

  const stx = await client.getJson<RawStxBalanceResponse>(
    `/extended/v3/principals/${encodeURIComponent(principal)}/balances/stx`,
  );

  if (stx && BigInt(stx.balance || "0") > 0n) {
    positions.push({
      assetId: "stx",
      symbol: "STX",
      amount: stx.balance,
      decimals: STX_DECIMALS,
      source: "stacks-api",
    });
  }

  const ft = await client.getJson<RawFtBalancesResponse>(
    `/extended/v3/principals/${encodeURIComponent(principal)}/balances/ft?limit=200`,
  );

  for (const result of ft.results ?? []) {
    if (BigInt(result.balance || "0") <= 0n) continue;
    positions.push({
      assetId: result.asset_identifier,
      symbol: symbolFromAssetId(result.asset_identifier),
      amount: result.balance,
      // Not available from this endpoint — never guessed. See the
      // module-level comment above and docs/RESEARCH.md.
      decimals: null,
      source: "stacks-api",
    });
  }

  return positions;
}

export function buildPortfolioSnapshot(
  address: string,
  positions: AssetPosition[],
): PortfolioSnapshot {
  return {
    address,
    network: "testnet",
    positions,
    timestamp: new Date().toISOString(),
    isLiveData: positions.every((p) => p.source === "stacks-api"),
  };
}

function symbolFromAssetId(assetId: string): string {
  const tokenName = assetId.split("::")[1] ?? assetId;
  return tokenName.toUpperCase();
}
