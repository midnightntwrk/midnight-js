---
title: RetainedEraNamespace
---

# How the retained era is published

The fork window is transitional; a duplicated public interface is not. This
package dispatches two Compact toolchains, so it carries two families of nearly
the same types -- `Ledger8FoundContract` and `Ledger9FoundContract`,
`Ledger8CallTxOptions` and `Ledger9CallTxOptions`. The retained era's family --
37 types and 18 error classes -- goes when the window closes.

It is published in two parts:

- the **types** as flat `Ledger8*` exports, the same way as the `Ledger9*` types;
- the **error classes** under one namespace, `Ledger8`.

```typescript
import { Ledger8, type Ledger8FinalizedCallTxData, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';

const result: Ledger8FinalizedCallTxData<C, 'increment'> = await submitCallTx(providers, options);

try {
  await submitCallTx(providers, options);
} catch (error) {
  if (error instanceof Ledger8.CallTxFailedError) {
    // the retained era's own failure class
  }
}
```

The flat unprefixed name (`FoundContract<C>`) picks between `Ledger8FoundContract`
and `Ledger9FoundContract` by contract type (#1536). Not every `Ledger8*` type has
a `Ledger9*` twin on this package's surface:

- `Ledger8Circuit`, `Ledger8CircuitContext`, `Ledger8CircuitId`,
  `Ledger8CircuitParameters`, `Ledger8CircuitResult`, `Ledger8CircuitReturnType`,
  `Ledger8ConstructorParameters`, `Ledger8InitialStateResult`,
  `Ledger8PrivateState` and `Ledger8Witness` describe the contract itself. The
  current era's equivalents live under `Contract.*` in `@midnight-ntwrk/compact-js`.
- `Ledger8CallTxTarget`, `Ledger8ContractCall` and `Ledger8ContractCallPublic`
  describe the retained call pipeline, which has no ledger 9 counterpart.
- `Ledger8DeployTxData` pairs with `Ledger9FinalizedDeployTxData`.

## Why the types are flat

The entry-point overloads return the retained types by their declared names
(`deployContract` with a ledger 8 contract returns
`Promise<Ledger8DeployedContract<C>>`). A dApp built with `declaration: true` that
exports a value inferred from such a call needs the compiler to write that name
into its own `.d.ts`. The compiler can only use a name the package exports flat.
A type reachable only through a namespace re-export fails with TS4023
("has or is using name ... but cannot be named"); see #1561.

The types are not optional decoration either. Inference alone does not let a
caller NAME a type: a consumer can make a retained-era call and still not write
`function handle(r: Ledger8FinalizedCallTxData<C, K>)` or constrain a helper of
its own by `Ledger8Contract`. Two things look like substitutes and are not:

- **A name in the emitted `.d.ts` is not an export.** This package publishes
  only a `"."` entry (`package.json` `exports`), so there is no subpath to reach
  an unexported type through.
- **`Awaited<ReturnType<typeof submitCallTx>>` resolves from the LAST overload**,
  which is a current-era overload, so it gives the wrong type for a retained-era
  call.

## Why the errors stay in a namespace

No entry point returns an error type. A consumer reaches one only by writing
`Ledger8.CallTxFailedError` itself, and the compiler prints that same path back
into the consumer's declarations. TS4023 does not apply, so the errors keep the
namespace and the "one import" property it gives.

The declarations keep their `Ledger8`-prefixed names
(`packages/contracts/src/errors.ts` declares `Ledger8CallTxFailedError`). The rule
for reading those references is mechanical:

> an error class declared as `Ledger8X` is published as `Ledger8.X`.

The renaming happens in one place, `packages/contracts/src/ledger8.ts`.

## What belongs to the retained era

A name belongs to the retained era's family when BOTH hold:

1. it disappears when the retained era does, and
2. it is part of the retained era's own API family -- its contract and result
   types, the refusals its pipeline raises. A function that takes both eras'
   contracts, such as `createCircuitCallTxInterface`, has no prefix.

A name that serves BOTH eras has no era prefix, so a consumer that only RECEIVES
results never imports the transitional half:

- `AnyFinalizedCallTxData`, `AnySubmittedCallTx`, `FinalizedMaintenanceTxData`,
  `FoundContract<C | L8>` and `DeployedContract<C | L8>`, and
  `isLedger8Result` -- the unions a shared handler declares, and the guard that
  narrows them.
- `TxFailedError` -- the base both eras' failure classes extend.
  `Ledger8.CallTxFailedError` still extends it, so a handler written against the
  base keeps catching the retained era without naming it.
- `UnknownResultEraError` -- raised for a result tagged with neither era,
  which is not a retained-era condition.
- `ProviderFailedError` -- a provider's rejection at `proveTx`, `balanceTx` or
  `submitTx`, sanitized the same way on every submit path, whatever the era.

## A `Ledger8` type that outlives the retained era

`Ledger8FoundDeployTxPublicData` fails both clauses. It is the v8 half of the
CURRENT era's `FoundDeployTxData.public`: the current pipeline returns it for a
contract that was deployed before the fork. Chain history does not go away, so
the type stays when the retained pipeline is removed. Its prefix names the era
that RECORDED the deployment, like `Ledger8FinalizedTxData` in
`@midnight-ntwrk/midnight-js-types`.

## The fork-window group

A second group passes clause 1 and fails clause 2, and it is published flat:
`ForkCrossedDuringOperationError`, `SubmitRejectionUndiagnosedError` and their two
payload types, `NetworkVersionStateMismatchError`, `EraArtifactMismatchError`,
`ScopedTransactionEraUnsupportedError`, `MixedEraScopeError`. These describe the
FORK WINDOW -- a head that moved under an operation, an artifact whose era does
not pair with the head, a scope the head era cannot compose -- and they are
removed in their own change. Putting them under a name that says `Ledger8` would
misfile them.

## The deploy overload's own members

`Ledger8DeployedContract` is published, under the rule that a caller who can
obtain a value must be able to name its type: `deployContract`, called with a
retained-era contract, composes, submits and hands one back. Its `deployTxData`
and the found handle's are published for the same reason, as
`Ledger8DeployTxData` and `Ledger8FoundDeployTxData`.

`Ledger8.DeployOnLedger9Error` is the era pairing table's refusal for a retained
artifact against a post-fork head: it is what a caller receives once the network
has crossed the fork. `Ledger8.DeployTxFailedError` is the refusal for a
deployment the node recorded with a non-success status.

The `AnyLedger8*` aliases stay internal: they widen the era-dispatching
IMPLEMENTATION signatures and are never a signature a caller sees.

## Withdrawing it

When the fork window closes, the retained era's family goes by deleting
`src/ledger8.ts`, its re-export line and the flat `Ledger8*` type export block in
`src/index.ts`, then the modules that serve only it (`src/ledger8-contract.ts`,
`src/internal/ledger8-*.ts`) and the retained members of the modules it SHARES
with the current era -- `errors.ts`, `tx-interfaces.ts`, `governance/errors.ts`
and `governance/tx-interfaces.ts` hold both eras and are not deleted. The
retained overloads on `submitCallTx`, `submitCallTxAsync`, `findDeployedContract`,
`deployContract`, `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`,
`submitReplaceAuthorityTx`, `createCircuitCallTxInterface`,
`createCircuitMaintenanceTxInterface(s)` and
`createContractMaintenanceTxInterface` go with them.

No ledger 9 name changes, and a consumer that never touched the retained era has
no import to rewrite. The flat aliases lose their `Ledger8` branch.

## What guards it

- `src/test/ledger8-declaration-emit.test.ts` compiles a consumer of the BUILT
  package with `declaration: true` and exports a value inferred from every
  ledger 8 entry point. A retained type that is not exported flat fails it with
  TS4023.
- `src/test/contracts-type-acl.test.ts` pins the flat `Ledger8*` types by name,
  and asserts the namespace has no type members.
- `src/test/ledger8-namespace.test.ts` pins the namespace's error classes by
  strict equality -- in the source and again in the built bundle -- and asserts
  that each is bound to the declaration it renames. The identity assertions
  matter: a transposed pair in the rename table passes every name-based check.
- `src/test/typecheck/ledger8-types.test-d.ts` asserts that what the entry points
  resolve to can be named with the flat types imported from the barrel.
