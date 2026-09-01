# Risk model

Every formula RiskKit uses is documented here. Nothing in the risk engine
is a black box — if a signal, threshold, or score value can't be traced
back to a line in this document, that's a bug.

All three primitives operate on a `PortfolioSnapshot`, which is just the
list of `AssetPosition`s RiskKit was given (whether from the live Stacks
API, a fixture, or supplied directly by a caller). None of these
calculations reason about a wallet's *total* net worth — only about the
positions actually present in the snapshot.

## 0. Weighing a position, and unknown-decimals exclusion

Every signal below is built on a shared `weight(p)` function
(`packages/riskkit/src/risk/valuation.ts`):

```
weight(p) = p.value                          if p.value is set (explicit USD-equivalent)
          = amount / 10^decimals             if p.value is unset AND p.decimals is known
          = EXCLUDED                          if p.value is unset AND p.decimals is null
```

**RiskKit never guesses a token's decimals.** The live Stacks API does
not return a `decimals` field for fungible-token balances (verified
against the current OpenAPI spec — see `docs/RESEARCH.md`), so every
fungible token fetched from the live API has `decimals: null` unless a
caller explicitly attaches a verified value. A position with `decimals:
null` and no explicit `value` is **excluded** from both the numerator and
denominator of every calculation below, rather than converted using an
assumed decimals value. Excluded positions are reported on the resulting
`RiskSignal.excludedAssets` array and named in the signal's
`explanation` string, so a developer (or the reference UI) can always see
which tokens were left out and why — never a silent gap.

STX is the one fungible balance with always-known decimals (`6`), because
that is a fixed Stacks protocol constant, not something read from (or
guessed against) this endpoint.

## 1. sBTC exposure (`calculateSbtcExposure`)

**Purpose:** how much of the tracked, computable portfolio depends on
sBTC specifically.

**Inputs:** `PortfolioSnapshot.positions`.

**Calculation:**

```
sbtc_weight   = sum(weight(p) for p in positions if is_sbtc(p) and weight(p) is not EXCLUDED)
total_weight  = sum(weight(p) for p in positions if weight(p) is not EXCLUDED)
exposure      = sbtc_weight / total_weight        (0 if total_weight == 0)
```

`is_sbtc(p)` matches on `p.symbol === "SBTC"` (case-insensitive) or
`p.assetId` containing `"sbtc"`.

**Output:** `value` in `[0, 1]`, a `level`, and `excludedAssets`:

| `value` | `level` |
|---|---|
| `< 0.40` | low |
| `0.40 – 0.69` | medium |
| `≥ 0.70` | high |

**Assumptions & limitations:**
- This is a **share-of-tracked-and-computable-portfolio** metric, not a
  share of the holder's total net worth, and not a share of everything
  RiskKit was handed — positions it couldn't safely value are excluded
  (see §0), which means the exposure percentage can shift simply because
  a token's decimals became verifiable, not because the holder's actual
  exposure changed. This is a known, documented tradeoff of "never guess"
  over "always produce a number."
- Using raw amounts as a value fallback (when `decimals` is known but
  `value` isn't supplied) is only mathematically meaningful when
  comparing assets of comparable per-unit value. Any real deployment
  should supply `value` (a USD-equivalent) for every position it cares
  about comparing across asset types.

## 2. Concentration (`calculateConcentration`)

**Purpose:** how much of the tracked, computable portfolio sits in a
single asset.

**Inputs:** `PortfolioSnapshot.positions`.

**Calculation:** positions are first grouped and summed by `assetId`
(excluding any position whose `weight(p)` is `EXCLUDED`), then:

```
largest_weight = max(sum of weight(p) for p in positions grouped by assetId, excluding EXCLUDED)
total_weight   = sum(weight(p) for p in positions, excluding EXCLUDED)
concentration  = largest_weight / total_weight    (0 if total_weight == 0)
```

**Output:** `value` in `[0, 1]`, a `level`, and `excludedAssets`:

| `value` | `level` |
|---|---|
| `< 0.50` | low |
| `0.50 – 0.79` | medium |
| `≥ 0.80` | high |

**Assumptions & limitations:** this is deliberately the simplest possible
concentration measure — a "largest single share" metric — chosen for
transparency in a proof of concept, not a Herfindahl-Hirschman Index or
similar. It does not account for correlation between different assets.
Like exposure, it only reasons over positions it could safely value —
see §0 and the exposure section above for the same caveat about excluded
positions.

## 3. Configurable thresholds (`evaluateThresholds`)

**Purpose:** let a developer define what "too much" means for their
application, rather than RiskKit imposing fixed limits.

**Inputs:** the `RiskSignal[]` produced by (1) and (2), plus a
`ThresholdConfig` (`{ maxSbtcExposure?, maxConcentration? }`, each `0–1`).

**Calculation:** for each configured rule, look up the matching signal by
metric name (`maxSbtcExposure` → `sbtc_exposure`, `maxConcentration` →
`concentration`) and trigger if `signal.value > threshold` (strict
inequality — a value exactly equal to the threshold does not trigger).

**Output:** `{ status: "ok" | "warning", triggeredRules, explanation }`,
where every triggered rule carries both the configured threshold and the
actual value, and a plain-English explanation of why it fired.

**Assumptions & limitations:** a rule with no corresponding signal present
is silently skipped rather than erroring, so adding a new threshold key
without a matching signal implementation fails open, not closed — this is
intentional for a small POC but should be reconsidered (e.g. logging a
warning) as more signals are added.

## 4. Risk score (`calculateRiskScore`) — optional, heuristic

**This is a prototype heuristic, not a predictive model. It does not
forecast losses and is not financial advice.** It exists to give the
reference demo a single glanceable number; the individual signals above
remain the actual source of truth and are always shown alongside it.

**Calculation:**

```
weights = { sbtc_exposure: 0.5, concentration: 0.5 }
relevant_signals = signals whose metric is a key in `weights`
weighted_average = sum(signal.value * weights[signal.metric] for signal in relevant_signals)
                    / sum(weights[signal.metric] for signal in relevant_signals)
score = min(100, round(weighted_average * 100 + 10 * count(triggered_threshold_rules)))
```

**Output:** `score` in `[0, 100]`, `label` (`low < 40 ≤ medium < 70 ≤ high`).

**Assumptions & limitations:**
- The 50/50 weighting between the two signals and the flat +10-per-trigger
  penalty are arbitrary POC choices, not derived from any backtested or
  empirical model. A funded milestone should either justify these weights
  with real analysis or make them fully developer-configurable rather than
  hardcoded.
- If a future signal is added without a corresponding weight, it is
  excluded from the score entirely (the remaining weights are used as-is,
  not renormalized to 100%) — see `calculateRiskScore`'s inline
  documentation.
