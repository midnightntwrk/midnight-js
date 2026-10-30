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
- **Follow-ups:** the FORK-WINDOW group -- `ForkCrossedDuringOperationError`,
  `SubmitRejectionUndiagnosedError` and their payload types,
  `NetworkVersionStateMismatchError`, `EraArtifactMismatchError`,
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

## Amendment — consistent member names, and one `Ledger8` name that stays flat (2026-10-14)

Issue #1489. The decision is unchanged.

- Two members are renamed: `Ledger8.SeamFailedError` is
  `Ledger8.ProviderFailedError`, and `Ledger8.DeployOnV9Error` is
  `Ledger8.DeployOnLedger9Error`. The era prefix is `Ledger8` / `Ledger9`
  everywhere, never `V8` / `V9`.
- `FoundDeployTxPublicDataV8` is `Ledger8FoundDeployTxPublicData`, and it stays
  on the flat surface. It is the v8 half of the CURRENT era's
  `FoundDeployTxData.public`, which the current pipeline returns for a contract
  deployed before the fork. Chain history outlives the retained pipeline, so the
  type fails both membership clauses in
  `packages/contracts/docs/retained-era-namespace.md`. A `Ledger8` prefix
  therefore does not by itself mean "inside the namespace": it names the era,
  and here the era that recorded the deployment.
- `ScopedTxEraUnsupportedError`, one of the fork-window refusals published flat,
  is `ScopedTransactionEraUnsupportedError`.

## Amendment — one flat `Ledger8` error is removed (2026-10-26)

Issue #1533. Of the two errors the Follow-ups name, the instance-mismatch error and its code are
removed. Its job is done by `ForeignLedgerTransactionError` in `types`, raised by
`LedgerTransaction.seal` ([ADR-0019](./0019-carry-transactions-as-opaque-era-carrying-handles.md)).
`Ledger8RuntimeMissingError` stays flat in `protocol`.

## Amendment — ledger 9 gets flat `Ledger9*` names, and flat names pick the era (2026-10-28)

Issue #1536. Every ledger 9 result, option and interface type that has a `Ledger8` member is now
named `Ledger9*` (`Ledger9FoundContract`, ...). The unprefixed name of a type with a contract
parameter is an alias that picks the variant from the contract type, `Ledger8` branch first:
`Ledger9Contract` is `Contract.Any`, which a ledger 8 artifact also satisfies, so only
`Ledger8Contract` tells the eras apart. Inside a generic function `C` is unknown and the alias stays
unresolved, so generic code names the era. A type without a contract parameter keeps only its
`Ledger9*` name.

The ledger 9 variants are flat exports, not a `Ledger9` namespace. The entry points return them,
and a dApp that emits declarations must be able to name what it infers: a type reachable only
through a namespace re-export fails with TS4023 ("cannot be named"). The `Ledger8` namespace has
the same defect; flat `Ledger8*` exports are a follow-up.


## Amendment — ledger 8 types are flat `Ledger8*` names; the namespace keeps the errors (2026-10-28)

Issue #1561. The decision changes for types.

- The 37 retained-era types are flat exports under their declared names (`Ledger8FoundContract`,
  `Ledger8DeployedContract`, ...). The `Ledger8` namespace has no type members.
- The 18 retained-era error classes stay in the `Ledger8` namespace (`Ledger8.CallTxFailedError`).

Why types: the entry points return the retained types by their declared names. A dApp built with
`declaration: true` that exports a value inferred from a ledger 8 call must be able to name that
type, and a type reachable only through a namespace re-export fails with TS4023. This is the same
reason the ledger 9 types are flat (#1536).

Why not errors: no entry point returns an error type. A consumer reaches one only through its own
`Ledger8.X`, which declaration emit prints back unchanged. Moving the errors is left to #1557.

Consequences: the "one name instead of 37" benefit is gone for types; withdrawing the retained era
now also deletes the flat `Ledger8*` type block in `src/index.ts`. The declaration names and the
published names agree for types, so the "divergent names" negative applies only to the errors.

## Amendment — the namespace is removed (2026-10-29)

Issue #1557. The decision changes for errors. There is no `Ledger8` namespace any more, and no
`Ledger8.X` name of any kind.

- The 18 retained-era error classes are gone as 18 classes. Most are merged into the 12 classes below
  ([ADR 0017](./0017-error-codes-are-the-contract.md) has the rule). Five stay as flat `Ledger8*Error`
  exports, with the four types on their public fields (`Ledger8SigningKeyReason`,
  `Ledger8KeyedOperation`, `Ledger8NotStoredStage`, `Ledger8CallUnsupportedReason`).
- `packages/contracts/docs/retained-era-namespace.md` is deleted. Its membership rule has nothing left
  to decide. `error-taxonomy.md` explains the ledger 8 names now.

| Class | Package | Category | Replaces |
|---|---|---|---|
| `TxFailedError` | contracts | REJECTED | `AnyEraTxFailedError`, `TxFailedError`, `CallTxFailedError`, `DeployTxFailedError`, `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`, `ReplaceMaintenanceAuthorityTxFailedError`, and the five `Ledger8.*TxFailedError` classes |
| `EraMismatchError` | contracts | USAGE | `EraArtifactMismatchError`, `Ledger8.DeployOnLedger9Error`, `Ledger8.MaintenanceOnLedger9Error`, `Ledger8.ArtifactOnLedger9StateError`, `Ledger8.ContractStateUnsupportedError`, `ScopedTransactionEraUnsupportedError`, `MixedEraScopeError`, `UnknownResultEraError` |
| `UnknownLedgerVersionError` | protocol | ENVIRONMENT | itself, `UnrecognisedEraTagError` |
| `Ledger8SigningKeyError` | contracts | USAGE | `Ledger8.SigningKeyUnusableError`, `Ledger8.SigningKeyUnavailableError` |
| `Ledger8UnconfirmedError` | contracts | UNCERTAIN | `Ledger8.DeployUnconfirmedError`, `Ledger8.ReplaceAuthorityUnconfirmedError` |
| `Ledger8NotStoredError` | contracts | ENVIRONMENT | `Ledger8.DeployNotStoredError`, `Ledger8.SigningKeyNotStoredError` |
| `Ledger8CallUnsupportedError` | contracts | USAGE | `Ledger8.ShieldedSpendUnsupportedError`, `Ledger8.RecipientUnmappableError` |
| `Ledger8AmbiguousEntryPointError` | contracts | INTEGRITY | itself; it now carries `contractAddress` |
| `EraInvariantViolationError`, `PublicStatesEraMismatchError`, `IndexerInconsistencyError`, `TransactionEraMismatchError` | contracts, types | INTERNAL, INTEGRITY, USAGE | unchanged |

`Ledger8ValueUnsupportedError` and `requireLedger9` are removed with no replacement. Code that handles
one era narrows with `switch (value.era)`, closed by `assertNever`.

Why: the namespace existed so the retained era could be withdrawn in one step. The errors were the
only members left, and 18 classes for two eras was more than a caller could tell apart. A merged class
carries a `reason` or `operation` field, so one `catch` handles the fault and the field says which case
it was. A `TxFailedError` thrown by a ledger 8 call is now caught by the same `instanceof` as in v4.

Consequences: withdrawing the retained era now deletes the flat `Ledger8*` block in `src/index.ts` and
the reasons that name ledger 8. Nothing else is published under a `Ledger8` name that has to be
removed as a group.
