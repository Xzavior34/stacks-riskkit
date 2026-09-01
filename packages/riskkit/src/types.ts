/**
 * Core data model for Stacks RiskKit.
 *
 * Token amounts are kept as raw integer strings (base units, e.g. micro-STX
 * or the token's smallest denomination) rather than floating point numbers.
 * This avoids precision loss for large balances. Ratios/percentages used in
 * risk signals are derived from BigInt arithmetic and only converted to
 * `number` at the very end, for display.
 */

export type DataSource = "stacks-api" | "fixture";

export type RiskLevel = "low" | "medium" | "high";

export type ThresholdStatus = "ok" | "warning";

/**
 * A single tracked asset position within a portfolio snapshot.
 *
 * `amount` is the raw integer balance in base units, as a decimal string
 * (e.g. "150000000" micro-STX), and is always preserved exactly as
 * returned by the source — RiskKit never rounds or estimates it.
 *
 * `decimals` describes how many places to shift `amount` to get a
 * human-readable quantity. It is `null` when the number of decimals is
 * not known from a verified source for this specific token — the Stacks
 * API's fungible-token balance endpoints do not return decimals, so
 * real fungible-token positions fetched from the API have `decimals:
 * null` unless a caller supplies it explicitly. RiskKit never guesses a
 * decimals value. A position with `decimals: null` and no explicit
 * `value` cannot be safely converted to a comparable weight and is
 * excluded from value/risk calculations (see `docs/RISK_MODEL.md`).
 *
 * `value` is an optional USD-equivalent value supplied by the caller —
 * RiskKit does not fetch or infer prices itself. Supplying `value`
 * makes a position usable in risk calculations even when `decimals` is
 * unknown.
 */
export interface AssetPosition {
  assetId: string;
  symbol: string;
  amount: string;
  decimals: number | null;
  value?: number;
  source: DataSource;
}

/** A position that was excluded from a risk calculation, and why. */
export interface ExcludedAsset {
  assetId: string;
  symbol: string;
  reason: string;
}

export interface PortfolioSnapshot {
  address: string;
  network: "testnet";
  positions: AssetPosition[];
  timestamp: string;
  /**
   * True if every position in this snapshot came from live Stacks API data.
   * False if any position is a fixture used to demonstrate risk
   * calculations (e.g. because the address holds no sBTC on testnet).
   */
  isLiveData: boolean;
}

export interface RiskSignal {
  metric: string;
  value: number;
  level: RiskLevel;
  explanation: string;
  /**
   * Positions that could not be included in this signal's calculation
   * (e.g. because their decimals are unknown and no explicit `value` was
   * supplied). Empty when nothing was excluded.
   */
  excludedAssets: ExcludedAsset[];
}

export interface ThresholdConfig {
  /** Maximum acceptable share of portfolio value exposed to sBTC, 0-1. */
  maxSbtcExposure?: number;
  /** Maximum acceptable share of portfolio value in a single asset, 0-1. */
  maxConcentration?: number;
}

export interface TriggeredRule {
  rule: keyof ThresholdConfig;
  threshold: number;
  actual: number;
  explanation: string;
}

export interface ThresholdEvaluation {
  status: ThresholdStatus;
  triggeredRules: TriggeredRule[];
  explanation: string[];
}

export interface RiskScore {
  score: number;
  label: RiskLevel;
  explanation: string;
  isHeuristic: true;
}

export interface PortfolioAnalysis {
  portfolio: PortfolioSnapshot;
  signals: RiskSignal[];
  thresholds: ThresholdEvaluation;
  score: RiskScore;
}
