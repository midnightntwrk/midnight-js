# 0009. Map protocolVersion to ledger eras via closed per-major ranges, failing fast only on unknown majors

- Status: Accepted
- Date: 2026-08-07
- Deciders: Szymon Paluchowski
- Related: [HF design spec v3.9](https://github.com/midnightntwrk/midnight-js/blob/docs/superpowers-specs/docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md) (OQ1/BC-1, QA-1), [#1005 answer 6](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5190024611) (confirmed [here](https://github.com/midnightntwrk/midnight-js/issues/1005#issuecomment-5202692002)), [indexer mapping](https://github.com/midnightntwrk/midnight-indexer/blob/main/indexer-common/src/domain/protocol_version.rs)

## Context

The indexer tags every record with a `protocolVersion` int encoding the
**node** version (`major·1_000_000 + minor·1_000`); midnight-js must narrow
that untrusted int to a ledger era (`LedgerVersion`). Upstream confirmed the
governing invariant: **a ledger era change always requires a node major
change, but node majors may rise faster than eras** — so same major ⇒ same
era, while an unknown major may genuinely be a new era. The indexer's own
mapping table is per-minor and fail-fasts on unmapped minors; mirroring that
client-side would mean a routine node minor upgrade (e.g. 2.2) bricks
construct/submit for every dApp until a framework patch ships.

## Decision

We will map with **closed, bounded per-major ranges**, e.g.:

```
22_000 ≤ v < 23_000  (node 0.22)  → v8
1_000_000 ≤ v < 2_000_000 (node 1.x) → v8
2_000_000 ≤ v < 3_000_000 (node 2.x) → v9
```

- An **unseen minor within a known major maps without error** (same-major ⇒
  same-era): routine node upgrades never brick dApps.
- The fail-fast else-branch fires **only on an unknown major** — where a new
  era is genuinely possible. No open-ended `>=`: the invariant's converse
  does not hold, so node 3.x must not silently map to v9.
- **Major 0 is exempt** from the whole-major rule: 0.x minors are
  semver-breaking and only node 0.22 is attested; a hypothetical 0.23
  fail-fasts by design.
- This mapping is the **sole narrowing point** from the untrusted int to the
  closed `LedgerVersion` set; the unknown-major error names the observed
  int and the supported set.

The table is extended once per node **major**, after confirming that major's
era. That fail-fast is the designed maintenance signal — not a bug.

## Consequences

- **Positive:** routine node minor upgrades are provably same-era and need
  no framework release; a possible new era can never be silently
  mis-mapped to the current one; the deliberate divergence from the
  indexer's per-minor table avoids amplifying its operational choice
  client-side.
- **Negative:** each new node major requires a small framework release to
  extend the table even when the era is unchanged; a malicious indexer
  reporting a wrong-but-*known* version still passes narrowing (bounded to
  DoS/griefing by the ledger's effects-equality backstop; an independent
  cross-check signal is tracked separately).
- **Follow-ups:** table test over boundary values including the major-0
  exemption; extend-per-major documented as the maintenance procedure.

## Alternatives considered

- **Mirror the indexer's per-minor table:** rejected — a routine node minor
  upgrade would hit the fail-fast branch and brick construct/submit for
  every dApp until a patch shipped.
- **Open-ended ranges (`>= 2_000_000 → v9`):** rejected — node majors may
  outpace eras, so a v10-era major would silently map to v9.
- **Trust the int without narrowing:** rejected — the indexer is outside
  the trust boundary; an unknown int must produce a typed error, never a
  silent default.
