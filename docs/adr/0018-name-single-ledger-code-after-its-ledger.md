# 0018. Name code bound to one ledger after that ledger; keep "current" and "retained" for era-generic code

- Status: Accepted
- Date: 2026-10-16
- Deciders: Szymon Paluchowski
- Related: #1490, #1489

## Context

"Current" and "retained" describe a ledger relative to now: today "current" is ledger 9 and "retained"
is ledger 8. At the next hard fork ledger 9 becomes retained. A name such as `CurrentEraProver`, whose
signature uses ledger-v9 types, would then point at a different ledger than the one it was written for.
Error messages that say "the retained toolchain" have the same problem, and the README never defined
either term.

## Decision

For each name, we ask: is the code behind it bound to one ledger, or does it follow
`CurrentLedgerVersion` / `RetainedLedgerVersion`?

- Bound to one ledger: name it with the `Ledger8*` / `Ledger9*` prefix, as `Ledger8DeployOnLedger9Error`
  already does. String values name the ledger too (`ledger9-artifact-on-ledger8-head`,
  `unwrapped-ledger9-contract`). This applies even when the code fills an era-generic slot:
  `Ledger9Prover` fills `currentEra` and its signature uses ledger-v9 types. At the next fork the slot
  takes a new ledger-named type; `Ledger9Prover` keeps its meaning.
- Era-generic: keep "current" / "retained". Its type comes from `CurrentLedgerVersion` /
  `RetainedLedgerVersion`, so it stays true after the next fork. Examples: `currentEra` / `retainedEras`,
  `RetainedEraEntries`, `RetainedEraProver`.

Error messages name the ledger ("the ledger 8 (pre-fork) Compact toolchain"), never only "retained" or
"current".

## Consequences

- A name bound to one ledger never changes meaning at a fork. At the next fork, only era-generic names
  move, and they move by design.
- The pre-release names were renamed before 5.0.0 final; see section 15 of
  `docs/releases/v5.0.0/breaking-changes.md`.
- "Current era" and "retained era" are defined in the README glossary and on `CURRENT_LEDGER_VERSION` /
  `RetainedLedgerVersion`.

## Amendment — the era-generic handler names are gone (2026-10-26)

Issue #1533. The examples above (`currentEra` / `retainedEras`, `RetainedEraEntries`,
`RetainedEraProver`, and `Ledger9Prover` filling `currentEra`) no longer exist: the provider
factories take one handler per ledger era, keyed `v8` / `v9`
([ADR-0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md)). The rule itself stands.
