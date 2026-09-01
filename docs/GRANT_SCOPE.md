# Grant scope

This document draws an explicit line between what exists in this
repository today (pre-grant proof of work) and what the proposed $5,000
Stacks Endowment Getting Started grant would fund.

## Pre-grant proof of concept (this repository, already built)

- Modular architecture separating a Stacks data adapter, a
  chain-agnostic risk engine, a threshold evaluator, and a reference
  application (`docs/ARCHITECTURE.md`).
- A real, working TypeScript risk engine — not stubs — with:
  - sBTC exposure calculation
  - concentration calculation
  - configurable threshold evaluation
  - an explicitly-labeled heuristic aggregate risk score
  - documented formulas for every one of the above (`docs/RISK_MODEL.md`)
- A real connection to the Stacks testnet API: given a testnet address,
  RiskKit fetches actual STX and fungible-token balances and normalizes
  them into its internal data model.
- A clearly labeled, opt-in, **synthetic** sBTC demo fixture
  (`demo:sbtc`) for when live testnet sBTC data isn't available or
  verifiable for a given address, with the real-vs-fixture distinction
  surfaced in both the data model
  (`PortfolioSnapshot.isLiveData`, `AssetPosition.source`) and the UI.
- 36 automated unit tests covering exposure, concentration, threshold
  triggering (including boundary conditions), and score calculation,
  including empty-portfolio and large-token-amount edge cases.
- A working reference demo application (Vite + React) that exercises the
  full pipeline end to end.
- Initial documentation: this file, `RESEARCH.md`, `ARCHITECTURE.md`,
  `RISK_MODEL.md`, and `SECURITY.md`.

## What does NOT exist yet

This is intentionally a small, honest proof of concept, not a production
risk platform. In particular:

- Only two risk primitives are implemented (sBTC exposure, concentration).
  No liquidation-risk modeling, no protocol-specific position tracking
  (lending, LPs, perps), no correlation-aware portfolio risk.
- The Stacks integration covers plain STX/fungible-token balances only,
  via the current, verified `/extended/v3/principals/{principal}/balances/*`
  endpoints (see `docs/RESEARCH.md`). It does not read DeFi protocol
  contract state and does not track LP positions.
- **No official, verifiable testnet sBTC contract identifier could be
  confirmed** as of this writing (see `docs/RESEARCH.md` for exactly what
  was checked). RiskKit therefore does not claim to track real sBTC
  specifically — it tracks whatever real fungible tokens an address holds
  (via the live API) plus, optionally, one clearly synthetic sBTC-shaped
  fixture (`demo:sbtc`) for demonstration. Confirming and integrating the
  real identifier is explicitly scoped into Milestone 1 below.
- **Fungible-token decimals are not available from the live balances API
  at all** (confirmed by inspecting the full current OpenAPI spec — the
  field does not exist). RiskKit does not guess a decimals value for any
  live-fetched fungible token; such positions are excluded from
  value-based risk calculations and explicitly reported as excluded (see
  `docs/RISK_MODEL.md §0`) rather than silently mis-valued. A real
  decimals lookup (e.g. a read-only `get-decimals` contract call) is
  scoped into Milestone 1.
- The `value` (USD-equivalent) field on each position must currently be
  supplied by the caller or is approximated by raw token amount — there is
  no price-feed integration.
- The risk score's weighting (50/50, +10 per triggered rule) is an
  unvalidated POC choice, not derived from empirical analysis.
- No alerting, no webhook/notification integration, no persistence layer.
- No external developer validation has been conducted yet.

## Proposed Milestone 1 — RiskKit Core: Stacks/sBTC Risk Engine

**Target:** November 20, 2026
**Allocation:** $2,500

- Harden data ingestion: replace unknown-decimals exclusion with a real
  token-decimals lookup (e.g. a verified read-only contract call) so more
  fungible tokens become usable in risk calculations, not just STX and
  the sBTC fixture; add pagination for accounts holding many fungible
  tokens.
- Improve sBTC/position coverage: confirm the current, official testnet
  (and mainnet, where relevant) sBTC token contract identifier directly
  from Stacks/sBTC maintainers or official documentation, and replace the
  synthetic `demo:sbtc` fixture's role in the demo with real sBTC
  detection once that identifier is confirmed.
- Finalize the initial risk model: either justify the score's weighting
  with real analysis or make weights developer-configurable; add at least
  one additional risk primitive beyond exposure/concentration.
- Configurable thresholds: extend beyond the two current rules as new
  signals are added.
- Robust automated tests for all of the above.
- Stronger Stacks testnet integration: reduce reliance on the sBTC
  fixture as real coverage improves.
- Developer-facing documentation for the hardened SDK.

## Proposed Milestone 2 — Reference Application, Developer Validation & Open-Source Release

**Target:** January 31, 2027
**Allocation:** $2,500

- A production-quality reference application (beyond the current POC
  demo): actionable alerts, clearer guidance, and a polish pass informed
  by Milestone 1's hardened core.
- Integration examples for at least one real class of Stacks/sBTC
  application (e.g. a lending frontend, a treasury dashboard).
- External developer validation: at least 3 independent Stacks/Web3
  developers run, review, or test RiskKit and provide documented
  feedback.
- At least 1 of those developers identifies a concrete integration or
  continued-use case.
- Feedback-driven improvements based on that validation.
- A tagged, versioned open-source release.

## Adoption target

At least 3 independent Stacks/Web3 developers successfully run, review, or
test RiskKit and provide documented feedback, with at least 1 identifying
a concrete integration or continued-use case.
