# 0018. Name code bound to one ledger after that ledger; keep "current" and "retained" for era-generic code

- Status: Accepted
- Date: 2026-10-16
- Deciders: Szymon Paluchowski
- Related: #1490, #1489, #1533, #1536

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
  already does. String values name the ledger too (`ledger9-artifact-on-ledger8-network`,
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

## Amendment — the rule reaches the protocol subpaths (2026-10-29)

Issue #1536. The rule above covered names; one level down, the import paths did not follow it.
`@midnight-ntwrk/midnight-js-protocol/ledger` and its siblings meant "the current era": in 4.x they
served ledger 8, in 5.0.0 ledger 9, and after the next fork they would serve ledger 10. A type imported
through them changes meaning at every fork.

- Ledger 9 gets era-named subpaths symmetric with `./v8`: `./v9`, `./v9/compact-runtime`,
  `./v9/compact-js`, `./v9/compact-js/effect`, `./v9/compact-js/effect/Contract` and
  `./v9/onchain-runtime`. The scheme is `./vN`, because `./v8` already exists. Ledger 10 adds `./v10`
  and `./v10/*`.
- 5.0.0 removes the unnamed subpaths (`./ledger`, `./compact-runtime`, `./compact-js`,
  `./compact-js/effect`, `./compact-js/effect/Contract`, `./onchain-runtime`) and the root namespaces
  `ledger`, `compactRuntime`, `compactJs` and `onchainRuntime`. Their meaning already changes between
  4.x and 5.0.0, so an alias would keep the name but not the objects behind it; a build error tells the
  consumer to pick a ledger. A `@deprecated` alias would also not warn: the declaration bundler drops
  module-level JSDoc, and TypeScript does not flag a deprecated module path.
- `./compact-js/v8/effect` keeps its path: renaming it would break consumers for no gain.

## Amendment — era-generic type names pick the era from the contract (2026-10-28)

Issue #1536, part B. A ledger 9 result type without a prefix (`FoundContract`, `FinalizedTxData`)
broke the rule above: at the next fork it would have meant ledger 10. Two rules now apply:

- High-level types: the flat name is era-generic. With a contract parameter it is a conditional
  alias over the `Ledger8` / `Ledger9` variants, so it keeps its meaning at a fork; ledger 10 adds a
  branch. Without one it does not exist, and only the `Ledger9*` name remains.
- Low-level functions serve one era each, so they are named after it (#1527).

