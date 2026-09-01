# Stacks RiskKit

Open-source risk primitives for Bitcoin-native applications on Stacks.

> **STATUS: Pre-grant proof of concept.**
>
> **Real:**
> - Stacks testnet balance retrieval (verified, current API endpoints — see `docs/RESEARCH.md`)
> - Risk calculation engine (sBTC exposure, concentration)
> - Configurable thresholds
> - 43 automated tests (36 in the core risk engine, 7 rendering the actual reference UI)
>
> **Demonstration only:**
> - A synthetic sBTC fixture (`demo:sbtc`, clearly not an onchain contract) used when real sBTC data is unavailable or unverifiable for an address
>
> **Grant-funded next phase:**
> - Verified, broader sBTC coverage (a confirmed official contract identifier)
> - Real token-metadata handling (decimals lookup, replacing today's exclude-rather-than-guess behavior)
> - Additional risk primitives
> - A hardened SDK
> - External developer validation
> - A production-quality reference implementation

## Why RiskKit

As Bitcoin capital becomes programmable through sBTC, applications built
on Stacks — lending protocols, treasuries, wallets, trading tools — need
better ways to reason about exposure and risk. Today, every team that
wants basic risk monitoring (how concentrated is this portfolio? how much
is riding on sBTC specifically? has some configured limit been crossed?)
has to build that logic from scratch.

RiskKit explores a reusable, open-source, explainable layer for this: a
small TypeScript toolkit that turns raw wallet/sBTC/position data into
risk signals a developer — and their users — can actually understand,
with the exact math behind every number documented.

## Q3 2026 relevance: Market Efficiency & Risk + sBTC Utility

RiskKit is developer-facing risk infrastructure, not another trading
platform, yield dashboard, wallet, or payment product. It targets the
**Market Efficiency & Risk** track directly, and **sBTC Utility** by
making sBTC-denominated exposure a first-class, explainable signal that
any Stacks application can compute for its users.

## What exists today

**This repository contains an early proof of concept, not a production
risk platform.** Current capabilities:

- Real Stacks testnet data retrieval — STX and fungible-token balances
  via the current, verified Stacks Blockchain API v3 principal-balance
  endpoints (see `docs/RESEARCH.md` for exactly what was verified and
  when)
- A normalized, chain-agnostic portfolio representation
- sBTC exposure calculation
- Concentration calculation
- Configurable, developer-defined thresholds
- Explainable risk signals — every number ships with a plain-English
  explanation, never a bare score
- Honest handling of unknown token decimals: the live balances API does
  not expose fungible-token decimals at all, so RiskKit **never guesses**
  — a token with unverified decimals is excluded from value-based
  calculations and explicitly listed as excluded, rather than silently
  mis-valued
- An optional, clearly-labeled **synthetic** sBTC demo fixture
  (`demo:sbtc`) for when real sBTC data isn't available or verifiable for
  a given address — never presented as onchain data
- An optional, clearly-labeled heuristic aggregate risk score
- A reference developer interface (Vite + React) with a live "REAL STACKS
  DATA" vs. "INCLUDES DEMO FIXTURE" data-provenance indicator
- 43 automated tests: 36 covering the risk engine and Stacks data adapter
  (boundary conditions, unknown-decimals exclusion, empty portfolios), and
  7 rendering the actual reference React component with a mocked API to
  catch real runtime/rendering bugs — including a check that risk levels
  are never conveyed by color alone

## What does NOT exist yet

See `docs/GRANT_SCOPE.md` for the full breakdown. In short: only two risk
primitives are implemented, DeFi-protocol-specific position tracking
doesn't exist, no official testnet sBTC contract identifier could be
confirmed as of this writing (so RiskKit tracks real fungible tokens
generically, not sBTC specifically, plus the synthetic fixture), real
token-decimals lookup doesn't exist yet (unverified-decimal tokens are
excluded rather than valued), and no external developer validation has
been conducted. Grant funding would support broader, verified sBTC
coverage, real token metadata handling, additional risk primitives,
hardened SDK ergonomics, developer validation, and a production-quality
reference implementation.

## Quick start

Requires Node.js 18+.

```bash
git clone <this-repo>
cd stacks-riskkit
npm install
npm test          # runs the core risk-engine suite and the reference UI's render tests
npm run lint       # lints both packages
npm run typecheck  # typechecks both packages
npm run build      # builds both packages
npm run dev         # launches the reference demo at http://localhost:5173
```

No environment variables or API keys are required to run the demo — see
`.env.example` for the (optional) Stacks API URL override.

## Example

```ts
import { analyzePortfolio } from "@stacks-riskkit/core";

const result = await analyzePortfolio({
  address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  thresholds: { maxSbtcExposure: 0.7, maxConcentration: 0.8 },
  useSbtcFixture: true, // blend in the synthetic demo:sbtc fixture — see docs/RESEARCH.md
});

console.log(result.signals);
// [{ metric: "sbtc_exposure", value: 0.72, level: "medium", explanation: "...", excludedAssets: [...] }, ...]
console.log(result.thresholds);    // { status: "ok" | "warning", triggeredRules: [...], explanation: [...] }
console.log(result.score);         // { score: 61, label: "medium", explanation: "...", isHeuristic: true }
```

Each risk primitive is also exported individually
(`calculateSbtcExposure`, `calculateConcentration`, `evaluateThresholds`,
`calculateRiskScore`) so a developer who already has portfolio data from
their own source can skip the Stacks adapter entirely and call these
directly against a `PortfolioSnapshot` they build themselves.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow
and package boundaries.

## Risk model

See [`docs/RISK_MODEL.md`](docs/RISK_MODEL.md) for every formula, input,
output, assumption, and limitation — nothing here is a black box.

## Roadmap / grant scope

See [`docs/GRANT_SCOPE.md`](docs/GRANT_SCOPE.md) for the explicit line
between this pre-grant proof of work and the proposed $5,000 Getting
Started grant's two milestones.

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md). In short: no custody, no keys
requested, no transaction signing, testnet-only, read-only.

## Disclaimer

RiskKit is experimental developer infrastructure. It is **not financial
advice**, and nothing in this repository or its outputs should be
interpreted as investment guidance or a prediction of losses. Do not treat
this proof of concept as production-ready.

## License

MIT — see [`LICENSE`](LICENSE).
