---
title: RetainedEraNamespace
---

# The retained era is published under one name

The fork window is transitional; a duplicated public interface is not. This
package dispatches two Compact toolchains, so it carries two families of nearly
the same types -- `FoundContract` and `Ledger8FoundContract`,
`CallTxOptions` and `Ledger8CallTxOptions`, thirty-seven names in all. The current
era's family is permanent. The retained era's goes when the window closes.

Published flat, side by side, those thirty-seven names would be thirty-seven
published API names, and removing them would be a second breaking change after
the one this release already makes. They are published as ONE name instead:

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
it. `Ledger8.FoundContract` is the retained twin of the flat `FoundContract`,
name for name.

## Naming, in these documents and in the source

The declarations keep their `Ledger8`-prefixed names
(`packages/contracts/src/ledger8-contract.ts` declares `Ledger8FoundContract`),
and every document in this directory refers to them that way when it explains
how the pipeline works. The rule for reading those references is mechanical:

> a declaration named `Ledger8X` is published as `Ledger8.X`.

The renaming happens in one place, `packages/contracts/src/ledger8.ts`, which
is the only file that has to change when a member joins or leaves.

## What qualifies for membership

A name belongs in the namespace when it disappears with the retained era. That
is the whole test, and it puts the error classes inside it too: a consumer
catching `Ledger8.SeamFailedError` has written code that only means anything
while the window is open.

A name that serves BOTH eras stays on the flat surface, so a consumer that only
RECEIVES results never imports the transitional half:

- `AnyEraFinalizedCallTxData`, `AnyEraSubmittedCallTx` and `isLedger8Result` --
  the union a shared handler declares, and the guard that narrows it.
- `AnyEraTxFailedError` -- the base both eras' failure classes extend.
  `Ledger8.CallTxFailedError` still extends it, so a handler written against
  the base keeps catching the retained era without naming it.
- `CURRENT_PIPELINE_ERA`, `RETAINED_PIPELINE_ERA`, `PipelineEra` and its two
  literal aliases -- the vocabulary both pipelines are named by.
- `UnrecognisedResultEraError` -- raised for a result tagged with neither era,
  which is not a retained-era condition.

## What is held back

`Ledger8DeployedContract` is declared and NOT published, under the rule that a
caller who can obtain a value must be able to name its type -- and no caller
can obtain this one. `deployContract`'s retained arm refuses every
retained-toolchain artifact with `Ledger8.DeployUnmaintainableError` before it
touches a provider, so nothing constructs the type. Publishing it would
document a handle nobody can hold and, because it extends
`Ledger8FoundContract`, would make every later repair of that handle a breaking
change to a published type with no users. Publish it in the commit that makes
the deploy arm produce one.

The two refusal ERRORS are published, because a caller does receive those and
has to catch them by class.

The `AnyLedger8*` aliases stay internal: they widen the era-dispatching
IMPLEMENTATION signatures and are never a signature a caller sees.

## Withdrawing it

When the fork window closes, the retained era is removed by deleting
`src/ledger8.ts`, its one re-export line in `src/index.ts`, and the modules
behind them. No current-era signature is touched, and no current-era name
changes -- which is the property the flat family did not have.

## What guards it

- `src/test/ledger8-namespace.test.ts` pins the namespace's RUNTIME members by
  strict equality, and asserts that no retained-era name has returned to the
  flat surface.
- `src/test/contracts-type-acl.test.ts` pins its TYPE members, read off the
  barrel with the compiler's own resolution.
- `src/test/typecheck/ledger8-namespace.test-d.ts` asserts that what the entry
  points resolve to is namable THROUGH the namespace -- the other compile-level
  suites import the source modules, which a consumer cannot, and would keep
  passing with the family unreachable from the published surface.
