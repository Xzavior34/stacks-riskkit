import { calculateConcentration } from "./risk/concentration.js";
import { calculateSbtcExposure } from "./risk/exposure.js";
import { calculateRiskScore } from "./risk/score.js";
import { evaluateThresholds } from "./risk/thresholds.js";
import { buildPortfolioSnapshot, fetchAddressPositions } from "./stacks/balances.js";
import { StacksClient } from "./stacks/client.js";
import { DEMO_SBTC_FIXTURE } from "./stacks/tokens.js";
import type {
  AssetPosition,
  PortfolioAnalysis,
  PortfolioSnapshot,
  ThresholdConfig,
} from "./types.js";

export * from "./types.js";
export { calculateConcentration } from "./risk/concentration.js";
export { calculateSbtcExposure } from "./risk/exposure.js";
export { calculateRiskScore } from "./risk/score.js";
export { evaluateThresholds } from "./risk/thresholds.js";
export { formatAnalysis } from "./explain/formatter.js";
export { StacksClient, StacksApiError, DEFAULT_TESTNET_API_URL } from "./stacks/client.js";
export { fetchAddressPositions, buildPortfolioSnapshot } from "./stacks/balances.js";
export { DEMO_SBTC_FIXTURE, createSbtcFixturePosition, SBTC_FIXTURE_ASSET_ID } from "./stacks/tokens.js";

/** Runs all risk signals + threshold evaluation + score on a snapshot. */
export function analyzePortfolioSnapshot(
  portfolio: PortfolioSnapshot,
  thresholds: ThresholdConfig = {},
): PortfolioAnalysis {
  const signals = [calculateSbtcExposure(portfolio), calculateConcentration(portfolio)];
  const thresholdEvaluation = evaluateThresholds(signals, thresholds);
  const score = calculateRiskScore(signals, thresholdEvaluation);

  return { portfolio, signals, thresholds: thresholdEvaluation, score };
}

export interface AnalyzePortfolioOptions {
  address: string;
  apiUrl?: string;
  thresholds?: ThresholdConfig;
  /**
   * When true, appends the deterministic sBTC demo fixture to whatever
   * live positions are found, so exposure/concentration signals have
   * something meaningful to compute even if the address holds no sBTC on
   * testnet. Defaults to false — callers get real data unless they
   * explicitly opt into the fixture.
   */
  useSbtcFixture?: boolean;
  fetchImpl?: typeof fetch;
}

/**
 * End-to-end convenience function: fetch real testnet balances for an
 * address, optionally blend in the sBTC demo fixture, and run the full
 * risk analysis. This is what the reference demo app calls.
 */
export async function analyzePortfolio(
  options: AnalyzePortfolioOptions,
): Promise<PortfolioAnalysis> {
  const client = new StacksClient({ apiUrl: options.apiUrl, fetchImpl: options.fetchImpl });
  const livePositions = await fetchAddressPositions(client, options.address);

  const positions: AssetPosition[] = options.useSbtcFixture
    ? [...livePositions, DEMO_SBTC_FIXTURE]
    : livePositions;

  const portfolio = buildPortfolioSnapshot(options.address, positions);
  return analyzePortfolioSnapshot(portfolio, options.thresholds ?? {});
}
