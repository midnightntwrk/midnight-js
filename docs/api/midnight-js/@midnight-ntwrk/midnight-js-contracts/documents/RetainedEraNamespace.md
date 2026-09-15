[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / RetainedEraNamespace

# The retained era is published under one name

The fork window is transitional; a duplicated public interface is not. This
package dispatches two Compact toolchains, so it carries two families of nearly
the same types -- `FoundContract` and `Ledger8FoundContract`, `CallTxOptions`
and `Ledger8CallTxOptions`. The current era's family is permanent. The retained
era's family -- 29 types, 7 error classes and one interface factory, 37 names --
goes when the window closes.

Published flat, side by side, those 37 would be 37 published API names, and
removing them would be a second breaking change after the one this release
already makes. They are published as ONE name instead:

```typescript
import { Ledger8, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const result: Ledger8.FinalizedCallTxData<C, 'increment'> = await submitCallTx(providers, options);

try {
  await submitCallTx(providers, options);
} catch (error) {
  if (error instanceof Ledger8.CallTxFailedError) {
    // the retained era's own failure class
  }
}
```

The era prefix is dropped inside the namespace, because the namespace carries
it. Where the current era publishes the same concept flat -- `FoundContract`,
`CallTxOptions`, `FinalizedCallTxData` -- `Ledger8.X` is its retained twin. Not
every member has such a twin: `Circuit`, `Witness`, `Contract`, `CircuitContext`
and the six error classes have no same-spelled name on this package's flat
surface, because the current era's equivalents live under `Contract.*` in
`@midnight-ntwrk/compact-js` or do not exist at all.

## Why a namespace rather than nothing

The retained-era types are not optional decoration. The entry-point overloads
select them by INFERENCE, and inference alone does not let a caller NAME one: a
consumer can make a retained-era call and still not write
`function handle(r: Ledger8.FinalizedCallTxData<C, K>)`, declare a variable of
the result type, or constrain a helper of its own by `Ledger8.Contract`.

Two things that look like substitutes and are not:

- **A name in the emitted `.d.ts` is not an export.** The overload signatures
  mention the retained types, so the declaration file contains them -- but this
  package publishes only a `"."` entry (`package.json` `exports`), so without a
  published name there is no subpath to reach them through either.
- **`Awaited<ReturnType<typeof submitCallTx>>` resolves from the LAST overload
  by design**, which is a current-era arm. It hands back the current-era shape:
  the wrong type for a retained-era call.

The whole family travels together rather than just the four result types: a
consumer who cannot also name `Ledger8.Circuit` and `Ledger8.Witness` cannot
declare a contract type that satisfies `Ledger8.Contract` in the first place.

## Naming, in these documents and in the source

The declarations keep their `Ledger8`-prefixed names
(`packages/contracts/src/ledger8-contract.ts` declares `Ledger8FoundContract`),
and every document in this directory refers to them that way when it explains
how the pipeline works. The rule for reading those references is mechanical:

> a declaration named `Ledger8X` is published as `Ledger8.X`.

The renaming happens in one place, `packages/contracts/src/ledger8.ts`. A member
joining or leaving the family is edited there and in the two pinned lists that
guard it (see "What guards it" below) -- and nowhere else.

## What qualifies for membership

A name belongs in the namespace when BOTH hold:

1. it disappears when the retained era does, and
2. it is part of the retained era's own API family -- its contract and result
   types, its interface factory, the refusals its pipeline raises.

The second clause is what the namespace's name commits to: it is `Ledger8`, the
ERA, not the fork window. The error classes pass both clauses and are inside: a
consumer catching `Ledger8.SeamFailedError` has written code that only means
anything while that pipeline runs.

A name that serves BOTH eras stays on the flat surface, so a consumer that only
RECEIVES results never imports the transitional half:

- `AnyEraFinalizedCallTxData`, `AnyEraSubmittedCallTx` and `isLedger8Result` --
  the union a shared handler declares, and the guard that narrows it.
- `AnyEraTxFailedError` -- the base both eras' failure classes extend.
  `Ledger8.CallTxFailedError` still extends it, so a handler written against the
  base keeps catching the retained era without naming it.
- `CURRENT_PIPELINE_ERA`, `RETAINED_PIPELINE_ERA`, `PipelineEra` and its two
  literal aliases -- the vocabulary both pipelines are named by.
- `UnrecognisedResultEraError` -- raised for a result tagged with neither era,
  which is not a retained-era condition.

## The fork-window group, which is NOT in here

A second group passes clause 1 and fails clause 2, and it is published flat:
`StaleHeadError`, `SubmitRejectionUndiagnosedError` and their two payload types,
`HeadStateEraMismatchError`, `EraArtifactMismatchError`,
`ScopedTxEraUnsupportedError`, `MixedEraScopeError`. These describe the FORK
WINDOW -- a head that moved under an operation, an artifact whose era does not
pair with the head, a scope the head era cannot compose -- and they will need
removing too, in their own change.

They are not folded in here because grouping them under a name that says
`Ledger8` would misfile them, and because inventing a second namespace for them
is a decision nobody has asked for yet. What this document must not do is claim
the property it does not have: withdrawing the retained era is ONE step for the
era's own family and a SECOND step for the fork-window group.

## What is held back

`Ledger8DeployedContract` is declared and NOT published, under the rule that a
caller who can obtain a value must be able to name its type -- and no caller can
obtain this one. `deployContract`'s retained arm refuses every retained-toolchain
artifact with `Ledger8.DeployUnmaintainableError` before any transaction is
composed or submitted (it does read the ZK config provider first, to establish
the artifact's declared runtime version), so nothing constructs the type.
Publishing it would document a handle nobody can hold and, because it extends
`Ledger8FoundContract`, would make every later repair of that handle a breaking
change to a published type with no users. Publish it in the commit that makes
the deploy arm produce one.

Both refusal ERRORS are published, but they are not in the same position:
`Ledger8.DeployUnmaintainableError` is the refusal a caller actually receives,
and `Ledger8.DeployOnV9Error` sits behind it in the era pairing table, so it is
dormant -- unreachable through `deployContract` today. Do not write a `catch`
for it; it is published for completeness and becomes reachable when the deploy
arm is wired.

The `AnyLedger8*` aliases stay internal: they widen the era-dispatching
IMPLEMENTATION signatures and are never a signature a caller sees.

## Withdrawing it

When the fork window closes, the retained era's own family goes by deleting
`src/ledger8.ts` and its one re-export line in `src/index.ts`, then the modules
that serve only it (`src/ledger8-contract.ts`, `src/internal/ledger8-*.ts`) and
the retained members of the modules it SHARES with the current era -- `errors.ts`
and `tx-interfaces.ts` hold both eras and are not deleted. The retained overload
arms on `submitCallTx`, `submitCallTxAsync`, `findDeployedContract` and
`deployContract` go with them, which narrows those entry points' overload sets.

No current-era NAME changes, and no consumer that never touched the retained era
has an import to rewrite. That is the property the flat family did not have: it
would have removed 37 published names instead of one.

## What guards it

- `src/test/ledger8-namespace.test.ts` pins the namespace's RUNTIME members by
  strict equality -- in the source and again in the built bundle -- asserts that
  each is bound to the declaration it renames, and that no retained-era runtime
  name has returned to the flat surface. The identity assertions are the ones
  that matter: `Ledger8.createCircuitCallTxInterface` has the same spelling as
  the flat current-era factory, so publishing the wrong one of the two passes
  every name-based check.
- `src/test/contracts-type-acl.test.ts` pins its TYPE members by name, read off
  the barrel with the compiler's own resolution, and its flat list is what
  catches a retained-era type re-exported flat.
- `src/test/typecheck/ledger8-namespace.test-d.ts` asserts that what the entry
  points resolve to is namable THROUGH the namespace -- the other compile-level
  suites import the source modules, which a consumer cannot -- and compares all
  29 type members against the declarations they rename, which is what catches a
  transposed pair in the rename table.
