# Architecture

## Data flow

```
Stacks API (Hiro testnet REST API)
        │  GET /extended/v1/address/{principal}/balances
        ▼
Stacks Adapter               packages/riskkit/src/stacks/{client,balances}.ts
        │  normalizes raw balances into AssetPosition[]
        ▼
Normalized Portfolio         PortfolioSnapshot (types.ts)
        │  optionally blended with the sBTC demo fixture (tokens.ts)
        ▼
Risk Engine                  packages/riskkit/src/risk/{exposure,concentration}.ts
        │  produces RiskSignal[] — each with a value, level, and explanation
        ▼
Threshold Evaluator          packages/riskkit/src/risk/thresholds.ts
        │  compares signals against developer-supplied ThresholdConfig
        ▼
Risk Score (optional)        packages/riskkit/src/risk/score.ts
        │  a documented heuristic aggregate, never the source of truth
        ▼
Developer Application        apps/demo (reference React app) or any consumer
                              of @stacks-riskkit/core
```

`analyzePortfolio()` in `packages/riskkit/src/index.ts` is the single
entry point that runs this whole pipeline for a given address; each stage
is also exported individually so a developer can call `fetchAddressPositions`,
`calculateSbtcExposure`, `evaluateThresholds`, etc. directly against their
own data — for example, an application that already has portfolio data
from its own indexer doesn't need to go through the Stacks adapter at all,
it can build a `PortfolioSnapshot` itself and call
`analyzePortfolioSnapshot()`.

## Why this shape

**The Stacks Adapter is a thin, isolated layer.** All Stacks-API-specific
code lives in `src/stacks/`. If the API's response shape changes, or a
future milestone adds support for pulling positions from a different
source (a specific lending protocol's contract state, for example), only
this layer needs to change — the risk engine below it only ever sees the
internal `AssetPosition` / `PortfolioSnapshot` types, never a raw API
response.

**The risk engine has no knowledge of Stacks at all.** `src/risk/*.ts`
operates purely on `AssetPosition[]` / `PortfolioSnapshot`. This means new
risk primitives can be added without touching the data-fetching code, and
the existing primitives could be reused for other chains' wrapped-BTC
representations if RiskKit ever expanded beyond Stacks.

**Every stage produces something with an `explanation`.** `RiskSignal`,
`ThresholdEvaluation`, and `RiskScore` all carry a human-readable
explanation alongside their numeric output. This is a deliberate
constraint that runs through the whole architecture: a caller (or the
reference UI) should never have to introspect a raw number to understand
why RiskKit flagged something.

**Adding a new risk signal is a three-step change:** write a
`calculate<Signal>(portfolio): RiskSignal` function in `src/risk/`, add it
to the `signals` array in `analyzePortfolioSnapshot()`, and (optionally)
add a corresponding rule to `ThresholdConfig` /
`SIGNAL_FOR_RULE` in `thresholds.ts`. No other layer needs to change.

## Package boundaries

- `packages/riskkit` (`@stacks-riskkit/core`) — the reusable toolkit.
  Framework-agnostic, runs in Node or the browser, has no UI dependency.
- `apps/demo` (`@stacks-riskkit/demo`) — a Vite + React reference
  application that imports `@stacks-riskkit/core` the same way an external
  developer would. It intentionally contains no risk-calculation logic of
  its own — it only calls `analyzePortfolio()` and renders the result.
