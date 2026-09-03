---
title: InjectedVendorSlices
---

# How an injected vendor slice is typed

Several seams in this package take a vendor's class by injection rather than
importing it: the era arms take the ledger module they compose against, and the
retained-engine seams take the pre-fork runtime they execute through. A seam
that takes a class by injection still has to name the shape it expects, and
this document records how that shape is written down.

There are three choices, and each one is made for a reason:

- **Derived** from the vendor's own class, where exactly one era can satisfy
  the shape.
- **Structural** — a hand-written declaration — where the seam genuinely serves
  both eras.
- **Narrowed** to the members the seam actually calls, which every slice is,
  and which sometimes buys something beyond a smaller surface.

Injection itself is a separate rule from any of this, and belongs to
[ModuleGraphAndLazyLoading](./module-graph-and-lazy-loading.md): a value import
of either era's module would statically link that era's WASM into whatever
bundle reaches the importing module, so a seam that needs a vendor's classes at
runtime takes them by injection. Naming a type links nothing — the
`import type * as` every declaration below reads through is erased with the rest
of the type layer — so deriving a slice from the vendor's class leaves the lazy
acquisition path the caller owns untouched. Derivation is orthogonal to the
import rule, and injection stays required either way.

## Derived from the vendor's own class

Where exactly one era can satisfy the shape, the type is derived from the
vendor's class rather than restated, so a vendor signature change fails this
build instead of quietly leaving a hand-written mirror describing a shape the
runtime no longer has.

`Ledger8ContractState` (`lib/era/envelope.ts`) is
`Pick<typeof OnchainRuntimeV3.ContractState, 'deserialize'>` — the pre-fork
`ContractState` statics, so a signature change in onchain-runtime-v3 fails the
build here. It is narrowed to `deserialize` because that is the only member its
seam calls. That narrowing carries one further consequence: it pins the slice to
the pre-fork era, which is what `Ledger8CompactRuntime` depends on. That
consequence is recorded in
[RetainedEraExecution](./retained-era-execution.md).

`Ledger8CompactRuntimeStateValue` (`lib/v8/down-convert.ts`) is derived the same
way from the pre-fork `StateValue` statics, by reading its one member's type
straight off `typeof OnchainRuntimeV3.StateValue` rather than by a `Pick`: a
`decode` whose signature moves fails this build instead of leaving a mirror
describing a static the runtime no longer has. It is narrowed to `decode`
because that is the only static its seam calls, and because the narrowing is
what lets `v8-down-convert.test.ts` drive the decode safety net with a
one-member double (`StateValue: { decode }`) instead of a whole WASM class.

`Ledger8DeployableContractState` (`lib/v8/deploy.ts`) is a `Pick` of the
vendor's own class rather than a restatement of its one member, so a change to
`serialize` in onchain-runtime-v3 fails this build; but picking one member keeps
it structurally loose enough that unrelated serializables satisfy it, which is
what lets the constructor test in `v8-deploy.test.ts` hand `executeConstructor`
a plain `{ serialize: () => … }` object instead of invoking real WASM. The type
therefore does not enforce that the bytes are a contract state at all —
whichever deploy leg receives them is what turns that residual risk into a
legible error rather than a raw decoder failure.

`CostModel` on `Ledger8ExecutionRuntime` (`lib/v8/execute.ts`) is a `Pick` of
the vendor's class narrowed to `initialCostModel`, the only static this seam
calls, and the narrowing is what lets `v8-execute.test.ts` inject a stub cost
model. The cost model is not a caller choice: `executeCircuit` always builds the
context with the glue's own `initialCostModel()` and passes no gas limit.

## Structural where a seam serves both eras

The counterpart to derivation is a hand-written structural declaration, and the
contrast is the point: derived where there is one era, structural where there
are two. Naming either era's type on a two-era seam would pick a side.

`ContractStateDecoder` (`lib/shared/contract-state.ts`) is declared structurally
rather than derived from one era's class, because that decoder genuinely serves
BOTH axes — the v9 arm passes ledger-v9, the v8 leg passes the module
`loadLedger8` handed it. `Ledger8ContractState` is the single-era counterpart,
and IS derived from the vendor for that reason.

`UnshieldedOfferLedger` (`lib/shared/unshielded.ts`) stays a hand-written slice
for the same reason: the function above it runs on both eras, the v9 arm passing
ledger-v9 and the v8 leg passing the module `loadLedger8` handed it, so
deriving the shape from either era's class would pick a side. Its `inputs` and
`signatures` are typed `never[]` rather than the ledger's own parameter types,
because this seam only ever aggregates OUTPUTS, so `[]` is the only value that
can be passed and the type says so instead of a comment.

## Narrowed instead of derived

Two slices could have been derived and deliberately are not, because the
vendor's own shape drags in a value no test can build.

`createCircuitContext` on `Ledger8ExecutionRuntime` is the sharper case. The
glue's own version is generic in the private state and returns a
`CircuitContext` carrying a real `QueryContext`, a WASM class no test double can
satisfy. Deriving it would make every execution test stand up real WASM just to
check plumbing, so the seam narrows it to return `Ledger8CircuitContext`
instead — whose own `currentQueryContext` is a `Pick` of the vendor's
`QueryContext`, so the narrowing cannot drift away from the class it stands for.

`Ledger8ConstructorRuntime` (`lib/v8/deploy.ts`) is narrowed rather than derived
from the retained glue's own `createConstructorContext`: that one is generic in
the private state and returns a `ConstructorContext`, a shape this seam never
inspects, since it only hands the value straight back to the contract's
`initialState`. Typing it as the glue's would force every constructor test to
build a real context to check plumbing it does not read, so the return stays
`unknown`.

## The three injected runtime slices of the retained engine

Three slices of the retained toolchain reach the engine's seams by injection
rather than by import: `Ledger8CompactRuntime` (down-convert),
`Ledger8ExecutionRuntime` (circuit execution) and `Ledger8ConstructorRuntime`
(constructor execution). Injection is what lets a caller target a specific
WASM-backed instance, and what lets a test substitute a controlled fake instead
of standing up real WASM. `createLedger8Engine` (`lib/v8/engine.ts`) assembles
all three out of one acquisition and captures them in closure, so nothing on
the engine's public surface takes a runtime parameter.

`Ledger8CompactRuntime` names `ContractState`, `StateValue` and `ChargedState`,
each typed off onchain-runtime-v3; why `ContractState` is there at all is the
era pin, in [RetainedEraExecution](./retained-era-execution.md).
`Ledger8ExecutionRuntime` carries exactly what building and running a circuit
context needs: `decodeZswapLocalState`, `createCircuitContext` and `CostModel`.

## Type parameters callers never spell out

`CallAssemblyLedger` (`lib/shared/assemble-call.ts`) is satisfied by both ledger
modules with every type parameter inferred from the module namespace itself, so
callers pass the module and never spell out type arguments.

`Transcript` is spelled out rather than left as a type parameter because a call
can arrive with its transcript ALREADY partitioned, in which case the pair comes
from the caller rather than from the module's own partitioner — so there is no
module-bound type left to infer it from.

`PartitionableQueryContext` is generic in `TSelf` because `insertCommitment`
returns a NEW context rather than mutating, which keeps the fold typed as the
module's own context instead of widening to the interface.

`CallOperationRegistry` leaves `TOperation` open; `assembleCallPrototype`
constrains it to `VerifiableOperation`, the one property the assembler inspects.
Both eras' `ContractOperation` declare `verifierKey` as a required
`Uint8Array`, but a slot that was never assigned one reads back `undefined` —
pinned by the blank-operation refusals in `v9-wrap.test.ts` and
`v8-compose.test.ts`, so a vendor change fails a test rather than silently
disabling the verifier-key check.

The `version` every failure names is passed rather than inferred from the ledger
module, for the same reason the type parameters are inferred: the assembler is
generic over the module, so it has no way to ask which axis it was handed.

## Payload types declared once against ledger-v9

`CallAssemblyLedger`'s `AlignedValue` / `Op` / `EncodedStateValue` /
`Transcript` payload types are declared once against ledger-v9: they are
structurally identical across onchain-runtime-v3, ledger-v8 and ledger-v9,
pinned by the compile-time drift gate at the bottom of
`v8-down-convert.test.ts`, which covers all three axes.

The recorded query context a call carries travels the same way.
`PartitionContext`'s `CallContext` and `Effects`
(`lib/shared/compose-types.ts`) are likewise declared once against ledger-v9
and are structurally identical on all three axes, pinned by the same gate —
`_CallContextUnchanged`, `_EffectsUnchanged`, `_V8CallContextUnchanged` and
`_V8EffectsUnchanged`.

## The byte crossing a dual-instantiation cannot affect

Not every era crossing in the engine is exposed to a dual-instantiation. A
crossing that passes BYTES rather than a handle is immune by construction,
because no object is handed between the two physical copies at all.

`Ledger8DeployableContractState` is that case: `.serialize()` is how a caller
turns the handle `executeConstructor` returned into the bytes every deploy leg
takes. This is why the guard's blast radius is the crossings that pass handles,
and why widening it to cover the byte crossings would assert something already
true. The guard itself is in
[DualInstantiationGuard](./dual-instantiation-guard.md).

## What holds each slice to its vendor

A narrowing is only worth having while it still describes the runtime it stands
for, so each one is held to its vendor by something that fails rather than by
prose:

- `createLedger8Engine` (`lib/v8/engine.ts`) annotates all three engine slices
  against the real glue and the real onchain-runtime-v3, so a member the vendor
  moved fails to type-check there. `v8-load-engine.test.ts` then exercises that
  assembled engine end-to-end against the real glue.
- `v8-deploy.test.ts` annotates the real glue's `createConstructorContext` as a
  `Ledger8ConstructorRuntime` directly, pinning that the glue still satisfies
  the narrowing.
- The compile-time drift gate at the bottom of `v8-down-convert.test.ts` pins
  the payload types across all three axes. The negative assertion in the same
  file that keeps a post-fork runtime out of `Ledger8CompactRuntime` belongs to
  the era pin, in [RetainedEraExecution](./retained-era-execution.md).
- The blank-operation refusals in `v9-wrap.test.ts` and `v8-compose.test.ts`
  pin the `verifierKey`-reads-back-`undefined` behaviour the operation
  constraint is written for.

Those compile-time assertions are evaluated by `yarn typecheck:tests` on the
pre-push hook rather than by CI, so a failure there is the only signal a drifted
slice will give.
