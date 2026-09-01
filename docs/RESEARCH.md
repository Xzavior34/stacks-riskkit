# Research notes

This document records the technical decisions made before writing
RiskKit's code, and — as of a grant-readiness verification pass — exactly
what was checked against current sources, when, and how.

**How this verification was done:** the assistant building this
repository does not have general web-browsing access to `docs.hiro.so` or
`docs.stacks.co`. It does have sandboxed network access to `github.com`,
`raw.githubusercontent.com`, `api.github.com`, and the npm registry. The
verification below was done by fetching the **live, current OpenAPI
specification** that the Hiro Stacks Blockchain API publishes in its own
GitHub repository — this is the same machine-readable spec `docs.hiro.so`
itself is generated from, so it is treated here as an authoritative,
current source, not a secondary one. Where something could not be
verified this way, that is stated plainly below rather than guessed.

## Endpoint verification (2026-09-01)

**Source:** `openapi.yaml` from `hirosystems/stacks-blockchain-api`
(branch `master`), fetched live at
`https://raw.githubusercontent.com/hirosystems/stacks-blockchain-api/master/openapi.yaml`.

**Spec version:** `9.0.2` (declared in the file's own `info.version`).
**Verified:** 2026-09-01 (see the `ETag`/`Date` response headers captured
during the fetch: `etag: "cfbe0f7ab39fd6bbdffb97900294dd9920298c6e8e3ad70c7de88e1f2bf350b4"`).

**Finding — the previously-used endpoint no longer exists.** An earlier
version of this codebase called
`GET /extended/v1/address/{principal}/balances`. That path **does not
appear anywhere in the current OpenAPI spec** (confirmed by grepping
every `/extended/...` path in the file). It has been superseded by
separate v3 principal-balance endpoints. This repository's code has been
updated accordingly (see `packages/riskkit/src/stacks/balances.ts`).

**Endpoints RiskKit now uses**, both confirmed present in the current spec:

| Endpoint | `operationId` | Purpose |
|---|---|---|
| `GET /extended/v3/principals/{principal}/balances/stx` | `get_principal_balances_stx` | Total/available/locked STX balance |
| `GET /extended/v3/principals/{principal}/balances/ft` | `get_principal_balances_ft` | Paginated list of fungible-token balances, sorted by balance descending |

The STX response schema (`PrincipalStxBalance`) requires `balance`,
`available`, `locked`, `mempool`. RiskKit reads only `balance` (total
micro-STX, as a string).

The FT response schema wraps a paginated `results: PrincipalFtPosition[]`
array; each `PrincipalFtPosition` requires exactly `asset_identifier` and
`balance` (a string-quoted base-unit integer) — **no other fields**.

**Finding — no `decimals` field exists anywhere in the current API.**
The full OpenAPI spec (52,000+ lines) was searched for the string
`decimals`; it does not appear once, in any schema. This is not specific
to the FT balance endpoints — the Stacks Blockchain API simply does not
expose fungible-token decimals at all. Consequently, **RiskKit no longer
assumes a fixed decimals value for fungible tokens fetched from the live
API.** `AssetPosition.decimals` is `null` for every live-fetched fungible
token (STX is the one exception, since 6 decimals is a fixed Stacks
protocol constant, not something read from this endpoint or guessed).
Positions with `decimals: null` and no caller-supplied `value` are
excluded from value/risk calculations rather than estimated — see
`docs/RISK_MODEL.md` for exactly how, and `packages/riskkit/src/risk/valuation.ts`
for the implementation.

A funded milestone that wants real decimals would need a different
source — e.g. a read-only `get-decimals` contract call against the
token's own contract via the Stacks node API (`/v2/contracts/call-read/...`),
which is a genuinely different endpoint family and was out of scope to
also verify in this pass.

**Testnet base URL:** `https://api.testnet.hiro.so` remains the
documented public testnet API host referenced throughout the spec (e.g.
in the STX/sBTC testnet faucet endpoints, which explicitly describe
testnet-only behavior). **Caveat:** this project's sandboxed network
access does not include `hiro.so`, so this could not be confirmed with a
live HTTP round-trip from within this environment — it is confirmed
against the spec's own documentation and examples, not by an actual
request/response. Before publishing, run the demo locally (`npm run dev`)
against a real testnet address to do that final live check yourself; the
code is written defensively (typed response parsing, explicit error
surfacing via `StacksApiError`) so a shape mismatch will fail loudly
rather than silently produce wrong numbers.

## sBTC contract identifier — could not be verified, so not used

The task was to find the current, official sBTC testnet asset/contract
identifier. Two candidates turned up during this verification pass, and
**neither was used**, for the reasons below:

1. An `example` value in the OpenAPI spec's FT balance schemas:
   `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token`.
   This is a **mainnet**-prefixed principal (`SM...`), given purely as an
   illustrative example value for the schema field, not asserted by the
   spec as "the" sBTC contract, and not testnet. It is not a reliable
   citation for a testnet identifier.
2. A deployer address, `SN3R84XZYA63QS28932XQF3G1J8R9PC3W76P9CSQS`, found
   in `stacks-network/sbtc`'s README, in the context of a **local devnet**
   bootstrap walkthrough (`localhost:3020?chain=testnet`), not a
   statement about the persistent public Stacks testnet deployment.

Neither is confirmed as *the* stable, official public testnet sBTC
contract. Rather than pick one and risk publishing a wrong or
locally-scoped address as if it were authoritative, RiskKit's sBTC demo
fixture uses a deliberately synthetic identifier, `demo:sbtc`, which
cannot be parsed as a real Stacks asset identifier (real ones are always
`{contract-principal}::{token-name}`) and so can never be mistaken for,
or silently matched against, a real onchain asset. See
`packages/riskkit/src/stacks/tokens.ts`.

There is, however, confirmed evidence that an official testnet sBTC
mechanism exists and is maintained by Hiro: `POST /extended/v1/faucets/sbtc`
is present in the current spec, described as performing "a SIP-010
`transfer` contract call on the configured testnet sBTC token contract."
The spec does not expose what that configured contract identifier
actually is, so this confirms the mechanism without confirming the
address.

## Package versions (confirmed live against the npm registry)

| Package | Latest version at time of writing |
|---|---|
| `@stacks/transactions` | 7.6.0 |
| `@stacks/network` | 7.6.0 |
| `@stacks/connect` | 8.2.7 |

## Current Stacks.js repository

`@stacks/transactions`'s own `package.json` `bugs.url` points to
`https://github.com/stx-labs/stacks.js/issues` — confirming the
authoritative Stacks.js monorepo has moved to the `stx-labs` GitHub org
(away from older `hirosystems`/`blockstack` branding used in some older
tutorials/READMEs). `@stacks/connect` similarly points to
`stx-labs/connect`. `@stacks/network`'s `bugs.url` still points to the
older `blockstack/blockstack.js` repo, which appears not to have been
updated to reflect the same move — worth a quick manual check before
citing a specific repo URL in the grant application, since the metadata
is inconsistent across these sibling packages.

The Stacks **Blockchain API** itself (the REST API this project actually
talks to) remains published under `hirosystems/stacks-blockchain-api` —
this is a separate repository from the Stacks.js client libraries, and it
is the one this project's endpoint verification above was performed
against.

## Decision: no `@stacks/transactions` or `@stacks/network` dependency in the POC

Unchanged from the original research: this prototype only needs
read-only balance data, never constructs or signs a transaction, and
never makes a read-only contract call — so it talks to the Stacks API
directly over `fetch()` rather than pulling in either package. This
should be revisited if a funded milestone adds read-only contract calls
(e.g. to look up real token decimals) or wallet connection.

## Address / transaction format

Unchanged: this POC does not parse or validate Stacks address format
itself — it passes the string straight to the API and surfaces whatever
error the API returns for a malformed address.

## Known limitations carried forward from this pass

- Only the first page of fungible-token balances is fetched (the `ft`
  endpoint paginates; RiskKit requests `limit=200` and does not follow
  `cursor.next`). A funded milestone should add pagination.
- Fungible-token `symbol` is derived by parsing the token-name segment of
  `asset_identifier` (e.g. `...::sbtc-token` → `SBTC-TOKEN`), which is
  string manipulation of already-real API data, not fabricated metadata —
  but it is not the same as a verified display symbol from token
  metadata, and may be misleading for contracts with non-descriptive
  token names.
