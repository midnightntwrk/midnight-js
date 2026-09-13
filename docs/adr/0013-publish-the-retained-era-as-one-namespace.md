# 0013. Publish the retained era as one namespace

- Status: Accepted
- Date: 2026-09-11
- Deciders: Szymon Paluchowski
- Related: #1302, #1218 (the dual-ledger dispatch this sits on), #1004

## Context

`@midnight-ntwrk/midnight-js-contracts` dispatches two Compact toolchains
through one set of entry points, so it carries two families of nearly the same
types. The current era's family is permanent. The retained era's family exists
only while the fork window is open: 29 types (`Ledger8FoundContract`,
`Ledger8CallTxOptions`, ...), 7 error classes, and one interface factory --
37 names.

Those 37 have to be REACHABLE. The entry-point overloads select them by
inference, and inference alone does not let a caller name one: a consumer can
make a retained-era call and still not declare a parameter for the result or
constrain a helper of its own by the contract type. Two apparent substitutes do
not work. A name mentioned in the emitted `.d.ts` is not an export, and this
package publishes only a `"."` entry, so there is no subpath to reach it
through; and `Awaited<ReturnType<typeof submitCallTx>>` resolves from the LAST
overload by design, which is a current-era arm.

Published flat, they are 37 published API names on a package whose consumers
read the flat surface as the permanent one. Withdrawing them when the window
closes would then be a second breaking change, after the one this release
already makes.

The eventual shape is an era-scoped subpath export (`./ledger8`), which would
also move the retained ENTRY points off `"."`, drop one `submitCallTx` overload
arm, and let the retained runtime load lazily. That change moves call sites and
needs a matching entry in the `midnight-js` barrel, so it is not this decision.

## Decision

We will publish the retained era's family as ONE name: a curated module,
`packages/contracts/src/ledger8.ts`, re-exported from the barrel as
`export * as Ledger8`, with the `Ledger8` prefix dropped inside each member.

Membership is two-clause. A name goes in when it disappears with the retained
era AND is part of the retained era's own API family -- its contract and result
types, its interface factory, the refusals its pipeline raises. A name that
serves both eras stays flat, so a consumer that only receives results never
imports the transitional half: `AnyEraFinalizedCallTxData`,
`AnyEraSubmittedCallTx`, `isLedger8Result`, `AnyEraTxFailedError`, and the
pipeline-era vocabulary.

The declarations keep their `Ledger8`-prefixed names. The renaming happens in
one file, and a declaration named `Ledger8X` is published as `Ledger8.X`.

## Consequences

- **Positive:** the permanent published surface grows by one name instead of 37.
  Withdrawing the retained era's family becomes one file plus one re-export
  line, changing no current-era name and leaving nothing to rewrite for a
  consumer that never touched it.
- **Positive:** the transitional half is visibly quarantined. A reader of an
  import list can see whether a consumer depends on the fork window at all.
- **Negative:** the declaration names and the published names diverge. The API
  reference renders `{@link Ledger8X}` labels a consumer cannot import, and
  compiler diagnostics name the namespace after its file (`ledger8`, lowercase).
  The mapping rule is stated on the namespace's own doc comment so it lands on
  the generated page.
- **Negative:** `Ledger8.CallTxFailedError` reads as a subtype of the flat
  `CallTxFailedError` and is a sibling -- both extend `AnyEraTxFailedError`, and
  both answer the same error code. That hierarchy pre-dates this decision; the
  qualified spelling makes the wrong reading easier.
- **Negative:** importing the namespace to catch one error retains all eight
  runtime members. The object is frozen and `#__PURE__`-annotated, but it is one
  object.
- **Negative:** a type-only consumer cannot use `import type { Ledger8 }` and
  then `instanceof Ledger8.CallTxFailedError` (TS1361). One import now serves
  both positions.
- **Follow-ups:** the FORK-WINDOW group -- `StaleHeadError`,
  `SubmitRejectionUndiagnosedError` and their payload types,
  `HeadStateEraMismatchError`, `EraArtifactMismatchError`,
  `ScopedTxEraUnsupportedError`, `MixedEraScopeError` -- also disappears when the
  window closes and stays flat here, because filing it under a name that says
  `Ledger8` would misname it. Its removal is a separate change, and whether it
  earns a namespace of its own is an open question.
- **Follow-ups:** `@midnight-ntwrk/midnight-js-protocol` still publishes
  `Ledger8RuntimeMissingError` and `Ledger8InstanceMismatchError` flat, so the
  umbrella package shows both policies side by side. Deciding whether protocol
  follows is deferred.

## Alternatives considered

- **Leave the family flat.** Rejected: it makes the transitional surface
  permanent in the only way that matters, by publishing it, and pays for the
  removal twice.
- **An era-scoped `./ledger8` subpath export.** The stronger end state, and
  compatible with this decision -- `src/ledger8.ts` is the file that would
  become its entry. Deferred because it moves call sites (testkit, consumer
  e2e), changes the entry-point overload set, and needs a matching barrel entry;
  none of that is required to stop publishing 37 names.
- **A separate package.** Rejected: the dispatching entry points stay in this
  package and reference the retained types in their signatures, so the
  dependency would point the wrong way and the retained package could not be
  removed independently anyway.
- **One era-parameterized family (`CallTxOptions<E>`).** Rejected on the code:
  `Ledger8Contract` is structurally different from the current era's `Contract`
  (a raw instance with `impureCircuits`, against a `CompiledContract`
  container). A shared generic would be a facade over two unrelated shapes.
