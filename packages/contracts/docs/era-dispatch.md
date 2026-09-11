---
title: EraDispatch
---

# Deciding which pipeline an operation takes

Across the ledger hard fork the same entry point can run one of three ways, and
which one it takes is decided by two independent facts: the ERA THE ARTIFACT
BELONGS TO, read from what the artifact DECLARES, and the ERA THE NETWORK HEAD
IS ON, read from the public data provider. This document records how each is
established, why neither may be guessed, and the rules that pair them.

The code lives in `packages/contracts/src/internal/era.ts`. The verifier-key
half of the same admission path is a separate thread — see
[VerificationPath](./verification-path.md).

## The pipeline is named by the ledger era, not the toolchain

`PipelineEra` is `'ledger8' | 'ledger9'`. Each member names the LEDGER ERA the
pipeline executes against, never a toolchain version, because the toolchain
moves independently of the ledger and a name pinned to it goes stale on the next
compiler bump.

A member names its era and nothing else — not which era is native, current, or
newest. Those are all relative to a fork that moves: the moment ledger 10 lands,
a name like `'v9native'` describes the era before last. A further era ADDS a
member (`'ledger10'`) and leaves every existing member meaning exactly what it
meant before.

A pipeline era is not a statement about the network. It says only which era's
artifact the caller handed over; whether that artifact can run at all is the
pairing rule below.

## Reading the artifact's era: never from the generated code

The era is a consensus-level fact, so it is never inferred from the shape of the
code the compiler generated: a consumer's build is free to rewrite that shape,
and this framework never sees the setting that did.

The two eras are answered differently, and it is worth being exact about why:

| era | what answers it | why a build cannot change it |
| --- | --------------- | ---------------------------- |
| current | the `CompiledContract` container it arrives in, recognised by its own `tag` | the property is an OWN one, and only that container has this shape |
| retained | the `runtime-version` its artifact set declares | it is data on disk, not code |

The current era's answer is a CONTAINER CHECK, not a statement by the compiler.
The `tag`'s value is chosen by the caller — `CompiledContract.make(tag, ctor)` —
and carries no era information. What places the object is that nothing else has
this shape, and that the property survives both a bundler and the object spread
the container's own combinators perform. The retained era has no such container,
which is why it is the arm that has to ask the artifact set.

So only the retained arm reads the bundle, through
`ZKConfigProvider.getArtifactRuntimeVersion()`; a current-era caller buys no
round trip and needs no file it does not already ship. `resolveArtifactEra` in
`packages/contracts/src/internal/era.ts` holds both halves.

### Which file the retained answer comes from

The provider prefers the INTEGRITY MANIFEST (`compiler/contract-manifest.json`),
which already records `runtime-version`. That file is the only one in a bundle
an application can anchor to a digest it controls, via `expectedManifestHash`;
everything else is served from the same place as the artifacts it describes.
Since this value selects which ledger pipeline executes a call, whoever serves
the artifacts must not be the one who decides it.

`compiler/contract-info.json` is the fallback, because `compactc` only began
emitting a manifest in 0.33 and the retained toolchain (0.31) never did. When a
manifest IS present it vouches for that file too, so the fallback passes through
the same integrity gate as every key and ZKIR — under the default `require` an
unvouched-for description is refused rather than trusted.

`@midnight-ntwrk/compact-js` also brands its `CompiledContract` with the
registered symbol `Symbol.for('compact-js/CompiledContract')`, which looks like
the obvious discriminator for the current era and is not usable as one.

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

The `tag` survives precisely because it is an OWN property — the distinction the
brand loss turns on: a value rebuilt by an object spread keeps its own
properties and loses everything it only inherited.

### What the shape is still read for

The shape decides an era for exactly one input — the current-era container,
which carries its marker on the object itself. For everything else it decides
only which declaration to consult, or refuses outright.

| shape | own `tag` | own `impureCircuits` | `initialState` | verdict |
| ----- | --------- | -------------------- | -------------- | ------- |
| current-era container | string | absent | absent | `'ledger9'`, from the container itself |
| retained-era candidate | absent | present | `Function` | ask the bundle |
| raw current-era instance | absent | present | `AsyncFunction` | refused, by name |
| anything else | — | — | — | refused as neither era |

Requiring the `tag` as well as the ABSENCE of `impureCircuits` is what stops an
arbitrary object — `{}` included — from being routed into the current-era
pipeline by default.

`tag` and `impureCircuits` are checked with `Object.hasOwn`, because both are
assigned as own properties — `tag` by the container's constructor,
`impureCircuits` by the generated contract's.

`initialState` is NOT an own property and must not be checked as one. It is a
class method, so it lives on the generated contract's PROTOTYPE — measured:
`Object.hasOwn(contract, 'initialState')` is `false` on both eras' real
artifacts, while `'initialState' in contract` is `true`. Requiring it to be own
would refuse every real contract. That is not the same hazard as the brand: a
class instance's prototype is fixed at construction and nothing here rebuilds
it.

### Why `constructor.name` may refuse and may not route

The two `constructor.name` values on the eras' generated code — `'Function'` and
`'AsyncFunction'` — are asymmetric, and the asymmetry is the whole rule.

A build step can ERASE an `AsyncFunction`: targeting below ES2017 lowers `async`
to a generator-driven plain function, and the name then reads `'Function'`. No
build step can FABRICATE one. So:

- `'AsyncFunction'` is conclusive proof of the current era and is allowed to
  REFUSE a raw instance on its own, before the bundle is consulted;
- `'Function'` proves nothing. It is what a real retained artifact reads AND
  what a transpiled current-era contract reads, so it only earns the artifact
  the right to have its bundle asked;
- anything else — a generator, an async generator, a future codegen shape — is
  refused rather than routed anywhere by default.

This replaces a rule that matched `'Function'` POSITIVELY as the retained era.
That rule was fail-closed against every shape it could name and fail-OPEN
against the one it could not: a current-era contract whose `async` a consumer's
bundler had erased was routed into the retained pipeline instead of being
refused. The `class`-as-`initialState` hole closed with it, because a class's
own constructor is `Function` and that reading no longer decides anything.
`docs/adr/0012-read-the-artifact-era-from-what-the-artifact-declares.md` records
the decision.

### Placing a declared runtime version

`RUNTIME_VERSION_TO_ERA` maps `major.minor` to a pipeline era, frozen, in one
place. A patch release never moves a toolchain across the fork, so the patch
component is not read. A compile-time gate refuses to build if a pipeline era
exists that no declared version reaches.

Two refusals have no default between them, deliberately:

- `artifact-era-undeclared` — the provider could not report a version. Its own
  failure is kept on `cause`.
- `unknown-artifact-runtime-version` — a toolchain this framework cannot place,
  named in the message.

A retained SHAPE whose bundle declares the CURRENT toolchain is reported as
`unwrapped-current-era-contract`: it is a current-era contract passed raw, with
its `async` erased by the caller's build. That is the case the old check let
through.

### One decision, in two forms

`resolveArtifactEra` makes the decision; `isLedger8Request` is that same,
already-resolved answer in the narrowing form each era-dispatching entry point
needs, so an entry point's body can drop the retained-era arm from its parameter
union without a cast. It is not a second decision — it takes the era as an
argument and only gives it a type predicate, because a type predicate cannot be
asynchronous and the decision now is.

It replaces the provisional structural check that tested for `impureCircuits`
alone and so answered `true` for a raw CURRENT-era contract instance, which
carries that member too. That was the blind spot the provisional check
documented and could not close; see [OverloadTyping](./overload-typing.md) for
the shape of the family it was serving.

The failure mode changed with it, deliberately. Where the provisional check
returned `false` for an object belonging to neither era and let it fall into the
current-era pipeline to fail somewhere unrelated, `resolveArtifactEra` raises
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
`docs/adr/0007-never-latch-the-network-head-version.md`, and it is why
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
rather than left to fall through — in the FUNCTION. Read the note below the
table before relying on that for the system as a whole:

| artifact | head | `'call'` | `'deploy'` |
| -------- | ---- | -------- | ---------- |
| current-era | `v9` | ledger9 | ledger9 |
| retained-era | `v9` | keep-state | refused |
| retained-era | `v8` | ledger8 | ledger8 |
| current-era | `v8` | refused | refused |

A retained-era DEPLOY on a post-fork head is the one cell where the two kinds
differ: calls against contracts already on chain are what the retained era
exists to keep working, and a new deployment has no such history to preserve.

Only the two RETAINED rows are enforced in production. Every call site passes
the literal `'ledger8'`, so the current-era rows are reachable from tests alone,
and the `current-era` + `v8` refusal — `EraArtifactMismatchError` with reason
`'current-era-artifact-on-pre-fork-head'` — is not raised by any shipped path.

That is a deliberate consequence of a cost decision, not an oversight: the
current era's single-call path buys no head read, so it has nothing to compare
an artifact against. The scoped path does pay for one, which is why a scope on a
pre-fork head is refused (`ScopedTxEraUnsupportedError`) and a single call on the
same head is not. A current-era call against a pre-fork head therefore fails
LATE — at a provider seam or at the node — rather than at this table.

Do not read the table as a guarantee that all four cells fail fast. Lifting that
means buying a head read on the current era's single-call path, and the cost is
the reason it has not been.

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
   (`docs/adr/0007-never-latch-the-network-head-version.md`).
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
