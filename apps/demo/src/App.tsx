import { useState } from "react";
import {
  analyzePortfolio,
  formatAnalysis,
  DEFAULT_TESTNET_API_URL,
  type PortfolioAnalysis,
  type ThresholdConfig,
} from "@stacks-riskkit/core";

const API_URL = import.meta.env.VITE_STACKS_API_URL || DEFAULT_TESTNET_API_URL;

const EXAMPLE_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

export function App() {
  const [address, setAddress] = useState(EXAMPLE_ADDRESS);
  const [useSbtcFixture, setUseSbtcFixture] = useState(false);
  const [maxSbtcExposure, setMaxSbtcExposure] = useState("70");
  const [maxConcentration, setMaxConcentration] = useState("80");
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const thresholds: ThresholdConfig = {};
    if (maxSbtcExposure.trim() !== "") thresholds.maxSbtcExposure = Number(maxSbtcExposure) / 100;
    if (maxConcentration.trim() !== "") thresholds.maxConcentration = Number(maxConcentration) / 100;

    try {
      const result = await analyzePortfolio({
        address: address.trim(),
        apiUrl: API_URL,
        thresholds,
        useSbtcFixture,
      });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed for an unknown reason.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <h1>Stacks RiskKit</h1>
        <p>Open-source risk primitives for sBTC and Bitcoin-native applications on Stacks.</p>
      </header>

      <section className="poc-scope" aria-label="Proof-of-concept scope">
        <div className="poc-scope-col">
          <h2>POC scope</h2>
          <ul>
            <li>Live Stacks account-data integration</li>
            <li>2 core risk primitives</li>
            <li>Configurable thresholds</li>
            <li>Explainable risk signals</li>
          </ul>
        </div>
        <div className="poc-scope-col">
          <h2>Next development phase</h2>
          <ul>
            <li>Verified sBTC coverage</li>
            <li>Additional risk primitives</li>
            <li>Developer validation</li>
            <li>Expanded SDK functionality</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <h2>Analyze a testnet address</h2>
        <div className="field-row">
          <div className="field-with-label">
            <label htmlFor="testnet-address">Stacks testnet address</label>
            <input
              id="testnet-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ST... testnet address"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <button onClick={handleAnalyze} disabled={loading || address.trim().length === 0}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        <label className="fixture-toggle">
          <input
            type="checkbox"
            checked={useSbtcFixture}
            onChange={(e) => setUseSbtcFixture(e.target.checked)}
          />
          Use synthetic sBTC demonstration data (most testnet addresses hold no real sBTC, and no
          official testnet sBTC contract identifier could be verified — see docs/RESEARCH.md).
          Off by default so you see real data first.
        </label>
      </section>

      <section className="section">
        <h2>Thresholds</h2>
        <div className="threshold-grid">
          <div className="threshold-field">
            <label htmlFor="max-exposure">Max sBTC exposure</label>
            <div className="unit-row">
              <input
                id="max-exposure"
                type="number"
                min={0}
                max={100}
                value={maxSbtcExposure}
                onChange={(e) => setMaxSbtcExposure(e.target.value)}
              />
              <span>%</span>
            </div>
          </div>
          <div className="threshold-field">
            <label htmlFor="max-concentration">Max concentration</label>
            <div className="unit-row">
              <input
                id="max-concentration"
                type="number"
                min={0}
                max={100}
                value={maxConcentration}
                onChange={(e) => setMaxConcentration(e.target.value)}
              />
              <span>%</span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          Could not analyze this address: {error}. The Stacks API endpoint used is{" "}
          <code>{API_URL}</code>.
        </div>
      )}

      {analysis && <AnalysisResult analysis={analysis} />}

      <footer>
        Data provenance is always disclosed above. Real balances come from the Stacks testnet
        API at <code>{API_URL}</code>; the optional sBTC fixture (<code>demo:sbtc</code>, off by
        default) is a clearly synthetic demo value, not an onchain contract, used only to make
        exposure/concentration calculations demonstrable. Fungible tokens fetched from the live
        API whose decimals could not be verified are excluded from value-based calculations
        rather than estimated. This is a proof-of-concept research tool, not financial advice,
        and it does not custody funds or request keys. See <code>docs/RISK_MODEL.md</code> in
        this repository for the exact formulas.
      </footer>
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: PortfolioAnalysis }) {
  const { portfolio, signals, thresholds, score } = analysis;
  const lines = formatAnalysis(analysis);

  return (
    <section className="section" aria-live="polite">
      <h2>Result</h2>

      <div className="snapshot-meta">
        <span className="address">{portfolio.address}</span>
        <span className={`provenance ${portfolio.isLiveData ? "live" : "fixture"}`}>
          {portfolio.isLiveData ? "REAL STACKS TESTNET DATA" : "INCLUDES SYNTHETIC DEMO DATA"}
        </span>
      </div>

      {portfolio.positions.length === 0 ? (
        <p>No tracked positions were found for this address.</p>
      ) : (
        <div className="table-scroll">
          <table className="positions">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Amount</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((p, i) => (
                <tr key={`${p.assetId}-${i}`}>
                  <td className="symbol">{p.symbol}</td>
                  <td>
                    {p.decimals === null
                      ? `${Number(p.amount).toLocaleString()} raw units (decimals unverified)`
                      : (Number(p.amount) / 10 ** p.decimals).toLocaleString()}
                  </td>
                  <td>{p.source === "stacks-api" ? "Stacks API" : "Synthetic"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(() => {
        const excluded = [...new Map(
          signals.flatMap((s) => s.excludedAssets).map((a) => [a.assetId, a]),
        ).values()];
        return excluded.length > 0 ? (
          <p className="score-explanation" style={{ marginTop: "0.5rem" }}>
            {excluded.length} token{excluded.length === 1 ? "" : "s"} excluded from value-based
            calculations because decimals could not be verified:{" "}
            {excluded.map((a) => a.symbol).join(", ")}. Raw balances are still shown above.
          </p>
        ) : null;
      })()}

      {signals.map((signal) => (
        <div className="signal" key={signal.metric}>
          <div className="signal-main">
            <div className="signal-metric">{signal.metric}</div>
            <div className="signal-explanation">{signal.explanation}</div>
          </div>
          <div className="signal-value-col">
            <div className={`signal-value level-${signal.level}`}>
              {Math.round(signal.value * 100)}%
            </div>
            <div className={`signal-level-label level-${signal.level}`}>{signal.level}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: "1.75rem" }}>
        <div className={`threshold-status ${thresholds.status}`}>
          {thresholds.status === "warning" ? "Threshold warning" : "Within configured thresholds"}
        </div>
        <ul className="explanation-list">
          {thresholds.explanation.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="score-row">
        <span className={`score-number level-${score.label}`}>{score.score}</span>
        <span>/ 100 risk score ({score.label}, prototype heuristic)</span>
      </div>
      <p className="score-explanation">{score.explanation}</p>

      <details style={{ marginTop: "1.5rem" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          Plain-text summary
        </summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.82rem", lineHeight: 1.6 }}>
          {lines.join("\n")}
        </pre>
      </details>
    </section>
  );
}
