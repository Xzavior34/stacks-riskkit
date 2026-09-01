import type { AssetPosition } from "../types.js";

/**
 * SYNTHETIC DEMO FIXTURE — NOT AN ONCHAIN sBTC CONTRACT.
 *
 * Testnet sBTC balances are frequently zero or unavailable for arbitrary
 * addresses — acquiring sBTC requires going through the peg-in flow, and
 * the current, official Stacks/sBTC documentation does not publish a
 * single stable, verifiable testnet sBTC token contract identifier that
 * this project could confirm at the time this code was written (see
 * docs/RESEARCH.md for exactly what was and wasn't verifiable). Rather
 * than include a placeholder contract address that could be mistaken for
 * a real one, RiskKit ships one deterministic, clearly-synthetic sBTC
 * fixture that a caller can explicitly opt into merging with real
 * STX/fungible-token balances.
 *
 * `SBTC_FIXTURE_ASSET_ID` uses the `demo:` prefix specifically because it
 * cannot be parsed as a valid Stacks contract-based asset identifier
 * (real asset identifiers are `{contract-principal}::{token-name}`) — so
 * it can never be confused with, or silently match, a real onchain asset.
 * Fixture positions are always tagged `source: "fixture"` and the
 * resulting PortfolioSnapshot is marked `isLiveData: false` so callers
 * and UIs can label the data honestly.
 *
 * `SBTC_DECIMALS = 8` reflects sBTC's publicly documented satoshi-based
 * design (1 sBTC peg-in is 1:1 with Bitcoin's own 8-decimal
 * denomination) — this is a protocol-level constant used only for this
 * synthetic fixture's own math, not a value read from (or guessed from)
 * the Stacks balances API, which does not expose token decimals at all
 * (see docs/RESEARCH.md).
 */
export const SBTC_FIXTURE_ASSET_ID = "demo:sbtc";
export const SBTC_DECIMALS = 8;

export function createSbtcFixturePosition(amountSats: string): AssetPosition {
  return {
    assetId: SBTC_FIXTURE_ASSET_ID,
    symbol: "sBTC (demo)",
    amount: amountSats,
    decimals: SBTC_DECIMALS,
    source: "fixture",
  };
}

/** A single deterministic fixture used by the demo app and tests. */
export const DEMO_SBTC_FIXTURE = createSbtcFixturePosition("25000000"); // 0.25 sBTC (synthetic)
