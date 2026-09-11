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

The rulings live in a DATA table, `ERA_PAIRING`, rather than in a chain of
switches: one row per `PipelineEra`, one column per `LedgerVersion`. Each cell
holds one `EraPairing` verdict, `'run'`, `'call-only'` or
`'artifact-newer-than-head'`, and `assertEraCompatible` turns that verdict and
the operation kind into the refusal. `'call-only'` is where the deploy asymmetry
above lives, and it refuses anything that is not positively a call — the one
asymmetric cell in the fork window must not admit a `kind` nobody anticipated.

### Where the build-time gate actually is

The table is built through two one-line constructors whose PARAMETER types are
`EraPairingTable` and `EraRulings`. That is deliberate and it is the whole gate:
a literal handed to one is checked against a total `Record`, so a missing cell,
an excess cell and a verdict outside the set are all build failures — reported
at the literal, where the mistake is.

Annotating `ERA_PAIRING` itself cannot carry that. The table is re-homed onto a
null prototype, and `Object.create(null) as T` asserts the rows into existence
before the annotation is ever checked; an empty table would satisfy it. So the
constructors are not ceremony to be simplified away — delete them and the gate
goes with them, silently, while every test stays green.

What the gate does and does not say: every pair of the two vocabularies has to
be ruled, so a member added to either one is a build failure here. It does NOT
bind the two sets to each other — a further artifact era can be added without a
further head era, and the reverse. What cannot happen is either one arriving
unruled.

### Why the vocabularies stay separate

`PipelineEra` and `LedgerVersion` name different facts. One says which era built
the caller's artifact, the other which era the network head is on, and after the
fork they DISAGREE: a retained-era call is recorded as a keep-state transaction
tagged `'v9'` while `era` on its result says `'ledger8'`
(`docs/adr/0011-tag-every-result-with-the-pipeline-that-produced-it.md`).
Spelling both with one alphabet would put two identically-typed members holding
different values on one result, and the disagreement the tag exists to express
would read as a bug.

### Why the lookups are still checked at run time

Both arguments are checked before and after the lookup, and neither check is
redundant with the build-time gate.

The `typeof` check is the load-bearing one. A member access coerces its key —
`ToPropertyKey` runs `toString` — so an object with a `toString`, a `String`
wrapper, or anything carrying `Symbol.toPrimitive` selects a REAL row and gets
ruled on. The nested switches this table replaced compared with `===` and
refused all of those. Reading a ruling for a key that merely stringifies to an
era is the one way a table is weaker than the switch it replaces, and it is why
the guard is not optional.

The `undefined` check is the ordinary one, and the null prototype is what makes
it sufficient: on a plain object literal `constructor`, `toString`, `valueOf`
and `__proto__` all come back as truthy non-cells. Note what that would and
would not cost. No prototype member is a valid verdict, so no such key reaches a
wrong RULING; the refusal simply moves to the other axis and blames a value that
was never at fault, or falls to the closing arm and reports a function where an
era should be. The null prototype buys a correct diagnosis, not a correct
verdict — which is why the test that pins it asserts which era gets blamed
rather than asserting the prototype.

Neither guard is a live boundary today: both call sites pass literals, and this
module is not reachable from outside the package. They are here so a future call
site threading a value through cannot quietly widen what the table admits.

`packages/protocol/docs/shared-table-discipline.md` prescribes the null
prototype and the freeze for a table indexed by a value, which this one is.
Not every era-keyed table in the tree qualifies — `NODE_MAJOR_TO_LEDGER` is
keyed by `number`, an open domain, so it is a `Partial` lookup and is neither
frozen nor null-prototyped.

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

## Refusing a provider set before it costs anything

The table above pairs the ARTIFACT's era with the NETWORK's. A third pairing
exists and is checked separately: the era an operation runs on against the eras
the three write seams say they serve.

`assertSeamsSupportEra(era, providers)` from `@midnight-ntwrk/midnight-js-types`
reads `supportedEras` off `proofProvider`, `walletProvider` and
`midnightProvider`, in that order, and refuses with `SeamEraUnsupportedError`
naming the first that does not list `era`.

This package calls it in exactly two places, one per pipeline:

| pipeline | call site | era checked |
| -------- | --------- | ----------- |
| retained | `acquireLedger8Runtime`, immediately after `assertEraCompatible` | `resolved.head` |
| current | `submitTxCore`, before the first seam call | `CURRENT_LEDGER_VERSION` |

Two things about that table are easy to get wrong.

The era checked on the retained pipeline is the HEAD era, not the artifact's.
That is not a shortcut — it is what `submitLedger8Tx` switches on to pick the
seam arm. A pre-fork head crosses as `{ version: 'v8', txBytes }`; a post-fork
head is keep-state, which composes on the CURRENT era and crosses as
`{ version: 'v9', tx }`, because the tag names the runtime that produced the
bytes and never the toolchain that produced the contract. Checking the artifact's
era — `'ledger8'`, so `'v8'` — would refuse every keep-state operation whose
wallet serves only the current era, which is the ordinary post-fork wallet.
`seam-era-support.test.ts` pins both directions of that: keep-state with
current-era-only seams is ADMITTED, and the same head with a seam serving
neither is refused naming `'v9'`.

One call site per pipeline, not one per entry point. `acquireLedger8Runtime` is
the single funnel every retained-era operation passes through — `runLedger8Call`
and `runLedger8Deploy` both — so the check sits there rather than being spread
across its callers, where a third caller would eventually forget it. That is also
why acquisition takes the provider set (`Ledger8RuntimeProviders`) rather than
just the read surface. That type is deliberately narrow: the head source plus the
three declarations, and nothing else, so a reader can see that acquisition reads
no more than it says.

### Why the pre-flight check does not replace the per-seam narrowing

`supportedEras` is a CLAIM by an implementation, and nothing verifies it. A
provider that lists an era it cannot serve still fails at the seam, with
`V8PayloadUnsupportedError` — the narrowing at each seam is unchanged and is what
actually upholds the arm. The two errors stay distinct because their remedies
differ: `SeamEraUnsupportedError` means wire a different provider,
`V8PayloadUnsupportedError` means the provider you wired does not do what it
said.

What the check buys is WHERE the refusal lands. Proving is the expensive step
and the first of the three seams, so a wallet that cannot balance a retained-era
transaction otherwise costs a full proving cycle before anything notices. Read up
front, the same gap costs one comparison. `v8-native.test.ts` pins that
directly: the wallet-gap and submitter-gap cases assert `proveTx` was never
called.
