# Stacks RiskKit — Final Perfection Pass: Report

## 1. Repository structure

```
stacks-riskkit/
  README.md, LICENSE, package.json, package-lock.json, .env.example, .gitignore

  packages/riskkit/                  @stacks-riskkit/core
    src/
      index.ts, types.ts
      stacks/{client,balances,tokens}.ts
      risk/{valuation,exposure,concentration,thresholds,score}.ts
      explain/formatter.ts
    tests/
      exposure.test.ts (10) · concentration.test.ts (8) · balances.test.ts (6)
      score.test.ts (5) · thresholds.test.ts (7)                    = 36 tests

  apps/demo/                         @stacks-riskkit/demo (Vite + React)
    src/
      main.tsx, App.tsx, styles.css, vite-env.d.ts, test-setup.ts
      App.test.tsx                                                   = 7 tests

  docs/
    RESEARCH.md, ARCHITECTURE.md, RISK_MODEL.md, GRANT_SCOPE.md, SECURITY.md
```

No stray files: no `node_modules`, `dist`, logs, screenshots, editor
metadata, or archives are present outside `.gitignore`'s coverage.

## 2–3. What changed in this pass, and why

**UI/UX corrections (grant-reviewer-facing):**
- Synthetic sBTC fixture changed from **on** to **off by default** — a
  first-time reviewer now sees a real-data-first experience, per your
  explicit instruction that synthetic data must never be silently
  blended in.
- Provenance badge text changed to your exact wording:
  `REAL STACKS TESTNET DATA` / `INCLUDES SYNTHETIC DEMO DATA`.
- Added a compact **POC scope** block (two columns: what's real now vs.
  next development phase) directly under the masthead, deliberately not
  labeled "Grant" in the product UI, per your instruction that the UI is
  a product demonstration, not a grant advertisement.
- Fixed a genuine accessibility defect: risk levels (low/medium/high)
  were conveyed by **color alone**. Added a visible text label next to
  every colored value.
- Added a real `<label>` for the address input (previously
  placeholder-only, which fails a basic accessibility check).
- Added visible `:focus-visible` outlines for buttons and inputs,
  `role="alert"` on the error banner, and a horizontal-scroll wrapper
  around the positions table so it can't force page-level horizontal
  scroll on narrow screens.

**Why:** these are exactly the kind of small, concrete defects a careful
reviewer (or an accessibility-conscious developer evaluating the repo)
would notice in the first 60 seconds, and they were real gaps, not
hypothetical ones.

**New: a real reference-UI test suite (7 tests), not just code review.**
I have no browser/screenshot tool available in this environment, so I
could not literally verify the React app renders correctly by looking at
it. Rather than assert "the UI works" on the strength of reading the
JSX, I added `apps/demo/src/App.test.tsx`, which renders the actual
`<App/>` component (via `@testing-library/react` + `jsdom`) with a
mocked `fetch`, and asserts on real DOM output: the synthetic-fixture
checkbox is unchecked by default, the provenance badges say the right
thing in the real-data and synthetic-data paths, errors render as a
human-readable `role="alert"` banner (not a raw stack trace), an empty
portfolio shows an explicit message, and risk levels are never
represented by color alone.

**This caught two real bugs**, not zero:
1. The color-only risk-level issue above (confirmed by a failing test
   before the fix).
2. A **dependency-resolution bug**: an earlier `npm install` (during
   test-tooling setup) left a stale, conflicting `vitest@4.1.11` nested
   inside `apps/demo/node_modules`, separate from the root's
   `vitest@2.1.9`. This silently broke `@testing-library/jest-dom`'s
   matcher registration (`Invalid Chai property: toBeInTheDocument`)
   because the two `vitest` instances had separate `expect` registries.
   Root cause: `npm install --save-dev vitest ...` without a version
   pin, followed by manually editing `package.json` afterward — the
   lockfile didn't fully reconcile on a normal `npm install`. Fixed by
   pinning `vitest` to `^2.1.1` in `apps/demo/package.json` and doing a
   full `rm -rf node_modules package-lock.json && npm install`. Verified
   fixed via `npm ls vitest`, which now shows a single deduped instance.

**Dependency review:** removed `@testing-library/user-event`, which was
installed but never actually used (tests use `fireEvent` directly) —
per the "no unnecessary dependencies" instruction. `npm audit` shows 5
vulnerabilities, but `npm audit --omit=dev` shows **0** — all five are in
dev-only tooling (old ESLint 8's transitive dependencies: `glob`,
`inflight`, etc.), not in anything shipped to users or run in production.
Not upgraded in this pass, since ESLint 8 → 9 is a breaking flat-config
migration and none of the flagged issues affect a published package —
exactly the kind of "don't upgrade blindly" call the brief asked for.
Documented here rather than silently left unmentioned.

**`.gitignore`** extended to also cover `*.log`, `coverage/`,
`.vscode/`, `.idea/`, `*.zip` — editor metadata and generated artifacts
that weren't explicitly excluded before.

**README** quick start now lists all five commands
(`test`/`lint`/`typecheck`/`build`/`dev`), and the test count and "what
exists today" bullets were updated to reflect 43 total tests across both
packages, described accurately (36 engine tests + 7 UI render tests, not
just "36" with no context of what changed).

## 4–5. Stacks API verification (carried from the prior pass, re-confirmed unchanged)

Endpoint verification was done in the immediately preceding pass against
the live, current `hirosystems/stacks-blockchain-api` OpenAPI spec
(v9.0.2), fetched 2026-09-01. Full detail, including the exact endpoints,
the sBTC contract-identifier investigation (and why neither candidate
found was used), and the current Stacks.js repository note, is in
`docs/RESEARCH.md`. Nothing about the underlying Stacks facts changed in
this pass — this pass's work was UI/UX/test/repo-hygiene, not further
protocol research. **Live HTTP round-trip testing against
`api.testnet.hiro.so` remains unperformed** — this sandbox has no network
route to that host. This is stated plainly in `docs/RESEARCH.md`, not
worked around.

## 6. Real vs. synthetic data

Unchanged in substance, strengthened in UI clarity this pass: real STX
and fungible-token balances come from the verified live API; the sBTC
demo fixture (`demo:sbtc`, a string that cannot parse as a real Stacks
asset identifier) is opt-in, **off by default**, and labeled
`INCLUDES SYNTHETIC DEMO DATA` — never blended in silently, never called
"live."

## 7. Risk-engine capabilities

Unchanged from the prior pass: sBTC exposure, concentration, configurable
thresholds, and an explicitly-labeled heuristic score, all documented
formula-by-formula in `docs/RISK_MODEL.md`, including the
unknown-decimals exclusion behavior added last pass. No new risk
primitives were added in this pass, per the explicit instruction not to
add functionality just to look larger.

## 8. Test results

```
npm test
Core:  36 tests passed  (exposure 10, concentration 8, balances 6, score 5, thresholds 7)
Demo:   7 tests passed  (App.test.tsx — real component render + mocked-fetch smoke tests)
Total: 43 tests passed, 0 failed
```
Re-verified from a genuinely clean clone (no pre-existing `node_modules`
or lockfile) as the last step of this pass.

## 9. Lint results

```
npm run lint
core: eslint src tests --ext .ts    — 0 problems
demo: eslint src --ext .ts,.tsx     — 0 problems (includes App.test.tsx)
```

## 10. Typecheck results

```
npm run typecheck
core: tsc --noEmit                  — clean
demo: tsc --noEmit                  — clean
```
Strict mode, no `any`, no `@ts-ignore`, anywhere in the codebase.

## 11. Build results

```
npm run build
core: tsc -p tsconfig.build.json    — emits dist/ with .d.ts
demo: tsc --noEmit && vite build    — 156.09 kB JS (gzip 50.60 kB), 5.17 kB CSS (gzip 1.60 kB)
```

## 12. UI/UX review

First screen now answers your four framing questions directly: masthead
states what it is; the POC scope block states what's real vs. next-phase
without needing to click anywhere; the address input + Analyze button is
the obvious next action; and the provenance badge (which only appears
after analysis, by design — there's nothing to label as real/synthetic
before a query runs) makes data status unambiguous the moment results
exist. No fake KPIs, no "trusted by," no fabricated numbers anywhere —
confirmed by direct grep as well as manual read-through.

## 13. Accessibility review

Checked and fixed: form labels (address input now has a real `<label>`),
color-only meaning (risk levels now have a text label, not just color),
keyboard focus visibility (added `:focus-visible` outlines), semantic
headings (h1 → h2 hierarchy is intact throughout), error messaging
(`role="alert"`, human-readable, no stack traces — verified by an actual
test). Not independently checked: exact contrast ratios were reviewed by
eye against the token palette (dark ink `#171a1f` on light paper
`#f6f5f2`, plus semantic low/medium/high colors chosen for reasonable
contrast on white) but not run through an automated contrast-checking
tool, since none is available in this environment. This is a real
limitation, stated rather than silently skipped.

## 14. Mobile review

The CSS breakpoint at 480px was reviewed and extended (POC scope grid
now collapses to one column; the positions table now sits in a
horizontal-scroll wrapper so a wide table can't force page-level
scroll). **I do not have a browser or screenshot tool in this
environment**, so I could not literally verify rendering at
390×844 / 768×1024 / 1440×900 as pixels — this is a structural CSS review
and fix, not a verified visual test. This is the same limitation noted
under accessibility, and I'm stating it plainly rather than claiming a
visual check that didn't happen.

## 15. Security review

`docs/SECURITY.md` unchanged in substance from the prior pass: no
custody, no keys/seed phrases requested, no signing required for
analysis, testnet-only, read-only, synthetic data clearly labeled,
unknown decimals excluded rather than guessed, risk signals stated as
informational only, and a vulnerability-reporting note (no dedicated
process yet, since there's no public repo to attach one to).

## 16. Secret scan result

Re-run at the end of this pass across all `.ts`/`.tsx`/`.json`/`.md`/`.css`
files for API keys, secrets, private keys, seed phrases, passwords, and
PEM key headers: **0 matches** (excluding legitimate mentions like "no
API key required"). No `.env` file exists anywhere in the repo (only
`.env.example`).

## 17. Documentation review

Every relative link in `README.md` and `docs/*.md` was checked
programmatically — all four (`ARCHITECTURE.md`, `RISK_MODEL.md`,
`GRANT_SCOPE.md`, `SECURITY.md`) resolve to real files. No external
placeholder URLs exist anywhere (the one `<this-repo>` in the `git
clone` instruction is an obvious fill-in-the-blank, not a fake domain).

## 18. Exact local commands

```bash
npm install
npm test          # 36 core tests + 7 reference-UI render tests
npm run lint
npm run typecheck
npm run build
npm run dev         # http://localhost:5173
```

## 19. Remaining limitations (unchanged from prior pass unless noted)

- Only two risk primitives; no protocol-specific position tracking.
- No official, verifiable testnet sBTC contract identifier — tracked
  generically via real fungible-token balances plus the opt-in synthetic
  fixture.
- Unverified-decimals tokens are excluded from value-based calculations,
  not guessed.
- Live HTTP round-trip against the testnet API was never performed in
  this sandboxed environment (endpoint verified against the current
  official spec instead).
- **New this pass:** mobile/visual rendering and color-contrast were
  reviewed structurally (CSS) but not verified with an actual browser or
  automated accessibility/contrast tool — no such tool is available here.
- No external developer validation has been conducted.

## 20. What is deliberately reserved for the $5,000 grant

Unchanged — see `docs/GRANT_SCOPE.md` for the full Milestone 1 / Milestone
2 breakdown (confirmed sBTC identifier, real decimals lookup, additional
risk primitives, external developer validation, production-quality
reference app).

## 21. GitHub publishing checklist

- [x] `.gitignore` covers `node_modules/`, `dist/`, `.env`, logs,
      coverage, editor metadata, zip archives
- [x] No `.env` file present
- [x] Secret scan: 0 matches
- [x] No placeholder/fake external URLs
- [x] LICENSE present and correct (MIT)
- [x] `package.json` metadata has no unprofessional placeholders (no
      invented homepage/repository/author fields)
- [x] All local commands verified from a genuinely clean clone
- [ ] Add real `repository`/`homepage` fields to `package.json` **after**
      the GitHub URL exists (deliberately not invented now)
- [ ] Do the one live-network check this sandbox couldn't
      (`npm run dev`, analyze a real testnet address, confirm the API
      round-trip) before or immediately after publishing

## 22. Exact changes that should be reflected in the grant application

- The grant application should say the demo defaults to real data with
  an **opt-in, off-by-default** synthetic sBTC toggle — don't
  characterize the demo as "showing sBTC risk" without that caveat.
- It should not claim a specific sBTC testnet contract is integrated —
  say "generic fungible-token tracking, plus an opt-in synthetic sBTC
  fixture pending a verified contract identifier" (Milestone 1 work).
- Test count, if cited, should be described as "43 automated tests
  across the risk engine and reference UI," not just a bare number.

## 23. Is the repository at the maximum practical level for this stage?

Yes, with the specific, stated exceptions above (no browser tool for
literal visual/contrast verification, no live network route to
`hiro.so` in this sandbox). Both are honestly disclosed rather than
worked around or asserted away.

---

## Final four questions

**A. Is there ANY technical defect that could hurt a Stacks grant reviewer?**
No known ones remaining. The two real defects found in this pass (the
color-only risk level, and the nested-vitest dependency conflict) are
both fixed and covered by a regression-catching test. The unresolved
items are disclosed limitations (no live API round-trip test, no visual
mobile/contrast verification tool), not defects — a reviewer running
`npm run dev` themselves would need to do that one live check, which
`docs/RESEARCH.md` already tells them to do.

**B. Is there ANY UX defect that could hurt a Stacks grant reviewer?**
No known ones remaining after this pass's fixes (off-by-default
synthetic data, exact provenance wording, POC scope block, color-blind-safe
risk levels, labeled inputs, focus states, no horizontal table overflow).

**C. Is there ANY misleading claim that should be removed?**
No. Every check performed in this pass (secret scan, link check, fake-URL
search, provenance-labeling review) came back clean, and remaining
limitations are stated explicitly rather than smoothed over.

**D. Is there ANY additional change that has meaningful expected value for increasing grant acceptance probability?**

"Engineering and repository optimization are complete. Further work
should focus on external Stacks validation and final grant submission,
not additional coding."

The two genuinely load-bearing gaps left — a live API round-trip and a
real browser-based visual check — are things only you can do (this
sandbox has no route to `hiro.so` and no browser/screenshot tool), and
both take minutes once you run `npm run dev` yourself. Beyond that, more
engineering here would be effort spent past the point of marginal
credibility gain, which is exactly the condition the brief's stop
condition describes.
