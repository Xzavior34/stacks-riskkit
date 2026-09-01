# Security

## Custody and keys

- This proof of concept **does not custody funds**.
- RiskKit **never requests a private key, seed phrase, or wallet
  connection** for its core analysis functionality — `analyzePortfolio()`
  only needs a public testnet address (a string) to run.
- **No transaction signing or broadcasting occurs anywhere in this
  repository.** RiskKit reads public account/token balance data and
  computes risk signals from it; it never constructs or submits a
  transaction.

## Network scope

- All Stacks data access is **read-only**, over HTTPS, against the public
  Stacks testnet API.
- **Testnet only.** This POC is not configured for mainnet and does not
  claim to be safe or validated for mainnet use.
- No API key or credential is required for the request volume this demo
  generates against the public Hiro API tier.

## Known limitations (see also `docs/GRANT_SCOPE.md`)

- This is experimental, unaudited software. It has not undergone a
  security review or formal audit.
- The risk calculations are a proof-of-concept heuristic, explicitly
  documented as such in `docs/RISK_MODEL.md`; they should not be relied
  on for real capital-allocation decisions in their current form.
- Tokens whose decimals cannot be verified from the live Stacks API are
  deliberately excluded from value-based risk calculations rather than
  estimated — this is a safety choice, not a bug, but it does mean a risk
  signal may not reflect every token an address holds. Excluded tokens
  are always listed explicitly (`RiskSignal.excludedAssets`), never
  silently dropped.
- Token amounts are validated as non-negative integers via `BigInt(...)`
  parsing, but user-supplied addresses are not otherwise validated
  client-side — malformed input is surfaced as whatever error the Stacks
  API itself returns.
- No rate limiting or abuse protection is implemented in the reference
  demo; it is a local development / demonstration app, not a hosted
  production service.

## Reporting a vulnerability

This is a pre-grant proof of concept without a dedicated security contact
yet. Please open a GitHub issue on this repository describing the concern
at a high level, or contact the repository maintainer directly for
anything sensitive enough that it shouldn't be filed publicly. A
dedicated disclosure process will be established alongside the funded
milestones in `docs/GRANT_SCOPE.md`.
