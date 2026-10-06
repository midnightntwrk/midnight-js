[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../README.md) / InjectedVendorSlices

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
[ModuleGraphAndLazyLoading](ModuleGraphAndLazyLoading.md): a value import
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
the pre-fork era, so a post-fork module cannot satisfy it. That consequence is
recorded in [RetainedEraExecution](RetainedEraExecution.md).

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

## The retained engine no longer injects its runtime

It used to. Three slices — `Ledger8CompactRuntime` (down-convert),
`Ledger8ExecutionRuntime` (circuit execution) and `Ledger8ConstructorRuntime`
(constructor execution) — reached the retained engine's seams by injection, and
`createLedger8Engine` assembled all three out of one acquisition so that
nothing on the engine's public surface took a runtime parameter.

All three are gone with the hand-maintained execution layer
(`docs/adr/0015-retained-era-execution-on-compact-js.md`). compact-js owns the
retained runtime now, `lib/v8/executable.ts` imports the 0.16 glue directly
under this package's own alias, and what a test would once have substituted by
injecting a fake is now supplied as an Effect service instead — the verifier-key
reader, the key configuration and the pinned clock. Which service carries what,
and why the clock is not one of them, is in
[RetainedEraExecution](RetainedEraExecution.md).

`createLedger8Engine` (`lib/v8/engine.ts`) survives and still takes no
parameters, but it no longer assembles anything: it builds the public surface
over the module's own entry points.

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
`Transcript` payload types are declared once against ledger-v9, because they
are structurally identical across onchain-runtime-v3, ledger-v8 and ledger-v9.
The recorded query context travels the same way: `PartitionContext`'s
`CallContext` and `Effects` (`lib/shared/compose-types.ts`) are likewise
declared once against ledger-v9 and identical on all three axes.

That identity is pinned. The compile-time drift gate that asserts it across
the three axes — `_CallContextUnchanged`, `_EffectsUnchanged`,
`_V8CallContextUnchanged`, `_V8EffectsUnchanged` and the payload-type
assertions beside them — lived at the bottom of `v8-down-convert.test.ts` and
went with that file when the hand-maintained execution layer was retired. It
was restored at the bottom of `v8-executable.test.ts`, which is where it now
lives. It is evaluated by `yarn typecheck:tests`, run both by the pre-push hook
and by CI's `typecheck:tests:core` job — not by the test run itself, which
transpiles without type-checking.

What does survive is narrower: `shared-contract-state.test.ts` pins `TokenType`
across ledger-v8, onchain-runtime-v3 and ledger-v9 with
`Assert<MutuallyAssignable<…>>`, and pins that `any` does not satisfy the
comparison — which is the canonical form a restored gate should copy.

## The byte crossing a dual-instantiation cannot affect

Not every era crossing in the engine is exposed to a dual-instantiation. A
crossing that passes BYTES rather than a handle is immune by construction,
because no object is handed between the two physical copies at all.

The deploy path is that case: `.serialize()` is how a caller turns the state
handle `runRetainedConstructor` returned into the bytes every deploy leg takes,
and `ConstructorResultPojo.contractState` is typed off compact-js's own result
rather than restated. This is why the guard's blast radius is the crossings
that pass handles, and why widening it to cover the byte crossings would assert
something already true. The guard itself is in
[DualInstantiationGuard](DualInstantiationGuard.md).

## What holds each slice to its vendor

A narrowing is only worth having while it still describes the runtime it stands
for, so each one is held to its vendor by something that fails rather than by
prose:

- `v8-load-engine.test.ts` exercises the assembled engine end-to-end against
  the real glue, and `v8-executable.test.ts` and `v8-deploy.test.ts` drive the
  real 0.16 artifacts through it, so a member the vendor moved fails there
  rather than in production.
- The blank-operation refusals in `v9-wrap.test.ts` and `v8-compose.test.ts`
  pin the `verifierKey`-reads-back-`undefined` behaviour the operation
  constraint is written for.
- `shared-contract-state.test.ts` pins `TokenType` across all three axes.
- The payload types have NO gate at present — see the section above. Restoring
  one is outstanding work, not a decision.

Those compile-time assertions are evaluated by `yarn typecheck:tests` on the
pre-push hook rather than by CI, so a failure there is the only signal a drifted
slice will give.
