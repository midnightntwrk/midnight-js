---
title: EraDispatch
---

# Deciding which pipeline an operation takes

Across the ledger hard fork the same entry point can run one of three ways, and
which one it takes is decided by two independent facts: the ERA THE ARTIFACT
BELONGS TO, read off the caller's contract object, and the ERA THE NETWORK HEAD
IS ON, read from the public data provider. This document records how each is
established, why neither may be guessed, and the rules that pair them.

The code lives in `packages/contracts/src/internal/era.ts`. The verifier-key
half of the same admission path is a separate thread — see
[VerificationPath](./verification-path.md).

## The pipeline is named by the ledger era, not the toolchain

`PipelineEra` is `'ledger8' | 'v9native'`. Both names are the LEDGER ERA the
pipeline executes against, never a toolchain version, because the toolchain
moves independently of the ledger and a name pinned to it goes stale on the next
compiler bump.

A pipeline era is not a statement about the network. It says only which era's
artifact the caller handed over; whether that artifact can run at all is the
pairing rule below.

## Reading the artifact's era: why the check is structural

`@midnight-ntwrk/compact-js` brands its `CompiledContract` with the registered
symbol `Symbol.for('compact-js/CompiledContract')`, which looks like the obvious
discriminator and is not usable as one.

`CompiledContract.make` installs the brand on a PROTOTYPE
(`Object.create(CompiledContractProto)`), and every combinator that makes a
container usable — `withWitnesses`, `withVacantWitnesses`,
`withCompiledFileAssets` — returns `{ ...self, ... }`, an own-enumerable-only
spread that drops the prototype. A container only becomes usable once witnesses
are attached, so by the time any real container reaches an entry point the brand
is gone, and a brand test would report `false` for EVERY current-era caller.
(`pipe` is lost to the same spread.)
`packages/contracts/src/test/era-dispatch.test.ts` pins that fact so this
reasoning stays checkable.

The internal `TypeId` symbol that DOES survive is a bare `Symbol()`, whose value
differs between two copies of the package, so it is not duplicate-install safe
and is not used either.

What is left is the properties a spread preserves, plus one it cannot:

| shape | own `tag` | own `impureCircuits` | `initialState` | verdict |
| ----- | --------- | -------------------- | -------------- | ------- |
| current-era container | string | absent | absent | `'v9native'` |
| retained-era instance | absent | present | `Function` | `'ledger8'` |
| raw current-era instance | absent | present | `AsyncFunction` | refused, by name |
| anything else | — | — | — | refused as neither era |

The third row is the mistake a JavaScript caller actually makes — passing the
generated contract where its container belongs — and it is why `impureCircuits`
alone cannot decide the era. It is refused by name, never silently routed into
the retained pipeline.

Requiring the `tag` as well as the ABSENCE of `impureCircuits` is what stops an
arbitrary object — `{}` included — from being routed into the current-era
pipeline by default.

### Which checks are own-property checks, and the one that deliberately is not

`tag` and `impureCircuits` are checked with `Object.hasOwn`, because both are
assigned as own properties — `tag` by the container's constructor,
`impureCircuits` by the generated contract's — and an own check is what makes
them immune to the spread hazard above. Own-versus-prototype is exactly the
distinction the brand-loss hazard turns on: a value rebuilt by an object spread
keeps its own properties and loses everything it only inherited.

`initialState` is NOT an own property and must not be checked as one. It is a
class method, so it lives on the generated contract's PROTOTYPE — measured:
`Object.hasOwn(contract, 'initialState')` is `false` on both eras' real
artifacts, while `'initialState' in contract` is `true`. Requiring it to be own
would refuse every real contract.

That is not the same hazard as the brand: a class instance's prototype is fixed
at construction and nothing here rebuilds it, whereas the brand was lost because
a combinator rebuilt a container with a spread. So the era is decided by an own
property (`impureCircuits`) and only then refined by a prototype lookup.

### Recognising the retained era positively

The two `constructor.name` values that separate the eras' generated code —
`'Function'` and `'AsyncFunction'` — are properties of the real generated
artifacts rather than conventions.
`packages/contracts/src/test/era-dispatch-ledger8.test.ts` and
`packages/contracts/src/test/era-dispatch.test.ts` each assert them against a
real compiled contract before anything relies on them.

`'Function'` is matched POSITIVELY, and that direction is load-bearing. The
retained era is the era whose codegen is synchronous, so it must be recognised
by what it IS. Treating it as "anything that is not async" would route a
generator, an async generator, or any future codegen shape into the retained
pipeline by default — a fail-open in the one function whose whole job is to fail
closed. Generator and async-generator functions report their own names and are
refused.

The one shape this cannot separate is a `class` used as `initialState`: a
class's own constructor is `Function`, so it reads as the retained era.

### One predicate, in two forms

`pipelineEraOf` makes the decision; `isLedger8Request` is the same decision in
the narrowing form each era-dispatching entry point needs, so an entry point's
body can drop the retained-era arm from its parameter union without a cast. It
is not a second predicate — the decision is made in exactly one place.

It replaces the provisional structural check that tested for `impureCircuits`
alone and so answered `true` for a raw CURRENT-era contract instance, which
carries that member too. That was the blind spot the provisional check
documented and could not close; see [OverloadTyping](./overload-typing.md) for
the shape of the family it was serving.

The failure mode changed with it, deliberately. Where the provisional check
returned `false` for an object belonging to neither era and let it fall into the
current-era pipeline to fail somewhere unrelated, `pipelineEraOf` raises
`EraArtifactMismatchError` with remediation text at the entry point.

## Reading the network's era: exactly one head read per operation

`resolveOperationEra` makes EXACTLY ONE head read, and that is the whole point.
Asking `networkHeadVersion` for the era and then asking the provider again for
the raw integer is two network round trips, and during the fork window the
second one can answer differently from the first — leaving one operation built
half against each era. The era, the integer it was resolved from, and the era
facade all come from the same reading.

The facade is acquired at the operation's asynchronous start so every era
operation downstream is synchronous and nothing deeper in the pipeline has to
await a runtime; see `packages/protocol/docs/era-seam.md`.

Nothing is cached across calls. Two operations read the head twice,
deliberately, because an era reading that has fallen behind cannot be recognised
as stale from the integer itself. That is the rule recorded in
`docs/adr/0008-never-latch-the-network-head-version.md`, and it is why
`ResolvedOperationEra` is threaded down as a plain value resolved once per
operation rather than held anywhere.

The raw integer is retained alongside the era because it distinguishes node
minor versions that the era deliberately collapses, and an operation that has to
report or log what it saw needs the value it actually read rather than a second
reading of it.

`HeadVersionSource` is declared as a `Pick` of the real provider rather than as
the whole interface: a full `PublicDataProvider` satisfies it, so nothing at a
call site changes, while a test — and a reader — sees exactly which member is
consulted, and the head read is not confused with the many other reads the
provider offers.

## Pairing the two: which combinations may run

`assertEraCompatible` holds the whole dispatch table, and every cell is ruled
rather than left to fall through:

| artifact | head | `'call'` | `'deploy'` |
| -------- | ---- | -------- | ---------- |
| current-era | `v9` | v9-native | v9-native |
| retained-era | `v9` | keep-state | refused |
| retained-era | `v8` | v8-native | v8-native |
| current-era | `v8` | refused | refused |

A retained-era DEPLOY on a post-fork head is the one cell where the two kinds
differ: calls against contracts already on chain are what the retained era
exists to keep working, and a new deployment has no such history to preserve.

The function returns nothing. Which pipeline runs is the `(pipeline, head)` pair
the caller already holds; this decides only whether that pair may run, so it does
not restate the pair as a third value that could disagree with it.

Each `default` arm carries a compile-time exhaustiveness gate AND a runtime
throw, and the runtime throw is not redundant with it: a new era reaches the
switch from a real head integer before the switch is updated.

## Pairing the head against the fetched state

`assertHeadStateEraAgreement` refuses an operation whose network head and
fetched contract state belong to different ledger eras.

`RawContractState.version` cannot answer this. It is derived from the record's
`protocolVersion` alone and is explicitly not a verified statement about the
envelope the bytes carry — see its own documentation in
`packages/types/src/raw-contract-state.ts`. The gap is closed by reading the
envelope itself.

The order is load-bearing:

1. The envelope tag is read BEFORE any decode, on both pipelines, so a state that
   cannot be decoded at all is still dated and a decoder is never handed bytes
   from the wrong era. The tag-to-era mapping is NOT declared here: it decides
   which era's decoder is handed attacker-supplied bytes, so it lives in exactly
   one place, as `contractStateEnvelopeVersion` in
   `@midnight-ntwrk/midnight-js-utils`, beside the tag parser it is built on
   (`packages/protocol/docs/shared-table-discipline.md`).
2. ERAS are compared, never raw `protocolVersion` integers — a same-era node
   minor bump (2_000_000 to 2_001_000) is not a disagreement and must not be
   reported as one.
3. On a disagreement the head is re-read, FRESH. The provider issues an uncached
   request per call, so a re-read really is a second reading of the network
   (`docs/adr/0008-never-latch-the-network-head-version.md`).
4. If the fresh head now agrees with the state, the first reading was merely
   stale: the caller can fix it by re-running, so `HeadStateEraMismatchError`
   says how.
5. If the fresh head still disagrees, the head was not stale and the two served
   answers cannot both describe one chain: `IndexerInconsistencyError`, with
   retry-later text and never a claim that a fork is under way.

A transport failure on the step-3 re-read is not swallowed — it propagates on
`cause` — but on its own it arrives with no trace that an era disagreement was
under investigation, which is the most diagnostic fact available in the fork
window. So it is rethrown wrapped, naming both eras that disagreed.

## Refusing a v8 answer on a v9-only flow

`requireV9` and `requireV9Record` narrow a provider's versioned payload to its
v9 arm. The flows in this package only ever send v9 payloads, so a v8 response
cannot be handled.

Both are distinct from `unwrapV9` in `@midnight-ntwrk/midnight-js-types`, which
guards the INBOUND direction of a v9-only provider. These guard the outbound
direction: a v8 answer here is a broken provider, not an unsupported request, so
it reports `EraInvariantViolationError` rather than `V8PayloadUnsupportedError`.

The seam types do not tie a provider's output era to its input era, so this
runtime check is what upholds that invariant for these flows. `PublicDataProvider`
reports both eras, and the v9-only flows reject a v8-era record here rather than
widening their own public return types.
