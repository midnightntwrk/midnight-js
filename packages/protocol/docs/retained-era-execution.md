---
title: RetainedEraExecution
---

# Running a contract on the retained pre-fork era

A contract compiled before the fork keeps running on the retained pre-fork
execution engine (`compact-runtime@0.16` and `@midnight-ntwrk/onchain-runtime-v3`)
after the fork. It runs through compact-js's own era-pinned entry rather than
through a layer this package maintains: `lib/v8/executable.ts` builds the state
the circuit or constructor runs against, drives compact-js's
`ContractExecutable`, and hands back plain data. The resulting call is bound
NATIVELY against the current ledger-v9 axis from the start — no v8-tx carrier,
no later re-bind.

This document collects the rationale behind that path: what the state a circuit
executes against is built from and what is refused while building it, why the
Merkle walk that used to sit there did not come back, what pins the execution
to the retained era, what the execution result has to carry, and what reaches
compact-js as configuration rather than as an argument.

The hand-maintained layer this replaced — `lib/v8/execute.ts`, which drove the
0.16 runtime directly, and `lib/v8/down-convert.ts`, which built the state it
ran against — is gone. Why, and what the move cost, is in
`docs/adr/0015-retained-era-execution-on-compact-js.md`.

The error classes named here are described in [FailClosedDecoding](./fail-closed-decoding.md), which owns
the division of labour between `DownConvertFailedError`,
`StateDecodeFailedError` and `Ledger8RuntimeInvalidError`; the refusal ordering
on the composition legs is in [ComposeRefusalOrder](./compose-refusal-order.md).

## The state a circuit executes against

`executableStateFrom` (`packages/protocol/src/lib/v8/executable.ts`) takes the
decoded `ContractStatePojo` the envelope's own reader produced and builds the
retained-era `ContractState` the runtime executes against. It refuses twice
before it builds anything:

1. **The balance**, by `isContractBalance`, described below.
2. **The primary state**, by `decodeExecutableStateValue`: decode through the
   retained runtime's `StateValue.decode`, re-encode the result, and refuse a
   value that did not come back as `DownConvertFailedError` at stage
   `'state down-convert'`.

That second check catches loss at every depth — a shortened array, a dropped
map entry, a changed cell, a substituted subtree — rather than only a wholesale
collapse to `null`. It costs one extra encode plus a deep comparison per call,
and that is deliberate: the alternative is a seam that can hand a circuit
silently wrong data.

It is CROSS-CODEC in production, which is the point. A contract an earlier
post-fork call migrated carries a current-era envelope while still executing on
the retained toolchain, so `readLedger8Snapshot`
(`packages/contracts/src/internal/ledger8-pipeline.ts`) reads it with the HEAD
era's reader — the state is then encoded by ledger-v9 and decoded here by the
retained runtime. A retained-era envelope is encoded by ledger-v8 and decoded
by the same retained runtime, which is still a different physical copy. Either
way a shape one side writes and the other merely tolerates would decode without
complaint.

It is also reachable with the REAL decoder, not only an injected one — which
matters, because the seam takes a bare `EncodedStateValue` a caller can
assemble by hand. Measured against the pinned runtime: a map whose entries are
in non-canonical order decodes and re-encodes canonicalised, and a value
carrying a member the decoder does not declare loses it. Both are refused.

A WHOLE `ContractState` is built, not the bare `ChargedState` its predecessor
produced. The retained runtime fills `block.balance` only when it is handed a
whole contract state and substitutes an empty map for anything less, so writing
the balance onto the state here is what makes it reach the circuit at all. It
used to be injected into the query context after the fact, which is what #1345
was; the substitution is now unreachable rather than detected.

`StateValue`, `ChargedState` and `ContractState` all come from the retained
glue rather than from compact-js's `CompactRuntime`, which re-exports none of
the three as a VALUE (midnightntwrk/midnight-sdk, spec finding E9). Building
them through ledger-v8's own same-named classes instead would be the dual
instantiation this era must not perform, so all three come from one module.

## The balance, and why it is required rather than defaulted

The balances a circuit reads arrive on the SAME value as the state it runs
against: `executableStateFrom` takes one decoded `ContractStatePojo` and writes
its balance onto the `ContractState` it builds, so there is no second argument
that could describe a different block or a different contract. They were two
independent options once, held together by a comment at the call site.

Required rather than defaulted, because an empty balance is a legitimate value
— a contract holding nothing has one — and defaulting would make "holds
nothing" indistinguishable from "the caller forgot", which is the shape #1345
took.

The refusal is a runtime one, not only a type. `tsc` reaches neither a
JavaScript caller nor an options object assembled dynamically, and both
`RunRetainedCircuitOptions` and `ContractStatePojo` are on the published
surface. It covers more than nullish: `new Map(...)` turns an empty array, an
empty `Set` and an empty string alike into an empty map, and a JSON round trip
turns a `Map` into a plain object — `structuredClone` carries a `Map`,
`JSON.stringify` does not. Each of those would reproduce the original defect
silently, so the guard tests the `ReadonlyMap` surface structurally rather than
with `instanceof`, which keeps a map from a worker or another realm acceptable.

The guard checks the ENTRIES too, and it is TOTAL. Entries, because a map
carrying amounts that are not `bigint`s answers every structural clause and then
feeds the circuit arithmetic it cannot do — the same silent wrong answer, one
layer in. Total, because `Map.prototype`'s members reject a foreign receiver: a
proxied map and an object that merely inherits the prototype both make `size`
and iteration throw, and a guard reading them plainly propagates that `TypeError`
instead of refusing. Neither can serve as a balance — `new Map(...)` throws on
the same receiver — so both are refused, carrying this seam's diagnosis rather
than the vendor's.

## Structural equality over the encoded algebra

`structurallyEqual` compares values in the `EncodedStateValue` algebra — plain
objects, arrays, `Map`s, `Uint8Array`s and primitives.

It is hand-rolled rather than `node:util`'s `isDeepStrictEqual`, which does not
resolve in a browser bundle.

`Map`s are compared pairwise in iteration order, deliberately: both runtimes
emit map entries in a deterministic, insertion-order-independent order that the
two of them agree on, so a value and its re-encoding iterate identically
whatever order the entries were inserted in. That order is not ascending by key
— it is a canonical hash order, so do not reason about it as sorted. The
agreement is a cross-runtime property, not a single-codec one — the source
encoding comes from ledger-v9 and the re-encoding from onchain-runtime-v3 — so
it is pinned by tests that build the two sides with the two different codecs,
not only by the same-codec round trip.

The record branch tests `key in bRecord` rather than only matching key counts.
Without it, two objects that share no key at all compare equal whenever the
diverging key's value in `a` is `undefined`, because both lookups then read
`undefined` and short-circuit. No *record* in today's algebra holds an
undefined-valued field — the one `undefined` it contains is the second slot of
a `boundedMerkleTree` leaf tuple (`[Uint8Array, undefined]`), which arrives
through the array branch and never reaches this comparison. So the check guards
against a record gaining one rather than fixing a live defect. That it is a
partial guard rather than a total one, and what `Object.hasOwn` would close, is
part of the package-wide discipline in [SharedTableDiscipline](./shared-table-discipline.md).

## Why the Merkle walk did not come back

The retired layer carried `assertMerkleTreesRehashed`, which walked a decoded
`StateValue` and refused any bounded Merkle tree whose node hashes had not been
computed. It did not come back with the round trip, and the reason is not that
the condition became unlikely — it is that the condition cannot be expressed in
what this seam receives.

Execution takes an already-encoded `EncodedStateValue`. A tree's rehash state
does not survive that encoding. Measured against the pinned runtime: a
never-rehashed tree and a rehashed one encode IDENTICALLY, and decoding either
yields the same root. Being un-rehashed is a property of a live in-memory
handle only.

The retired suite had already recorded the same fact from the other side —
"a real `encode()`/`decode()` round trip materializes tree hashes, so the only
way a never-rehashed tree can reach the walk is an injected decode" — and every
negative test it had for the walk drove it through a fake decoder. The current
seam has no injection point, so a guard here would be one that cannot fire.

`MerkleNotRehashedError` stays on the published surface with its code, rather
than disappearing from a consumer's error taxonomy as a side effect of an
internal refactor. Its docstring records that nothing raises it.

## What the round trip does not cover

Anything the retained encoder re-derives rather than carries. A bounded Merkle
tree encodes as its height and leaves, never its node hashes, so a tree whose
internal hashes were re-materialized differently across the fork boundary still
re-encodes byte-identically here — which is the same vendor property the
section above rests on, read from the other direction. Comparing roots across
the boundary needs the source-side tree, which this seam never sees; it belongs
at the envelope seam.

## The era pin

Nothing in this module names the retained runtime by a version. Two things pin
it, and neither is a runtime check:

- **The import specifier.** `compact-runtime-ledger8` is an alias this package
  declares (`npm:@midnight-ntwrk/compact-runtime@0.16.0`), so the three
  `StateValue`/`ChargedState`/`ContractState` values come from the 0.16 line by
  resolution rather than by assertion.
- **compact-js's own era entry.** `@midnight-ntwrk/compact-js/v8/effect`
  supplies `ContractExecutable`, `CompiledContract` and `ZKConfiguration` for
  the retained era; the current era has its own entry, and the two cannot be
  mixed up by a member name.

The construction-time guard that used to sit beside them
(`lib/v8/instance-guard.ts`) is gone, and deliberately: it compared two
runtimes this package imported directly, and compact-js owns both now, so it
had no subject left. What replaced it is narrower and runs at install time —
`single-instance.test.ts` reads the resolved version set out of `yarn info` and
fails on a second physical copy of either line. The remaining
dual-instantiation reasoning, including the axis that check does NOT cover, is
in [DualInstantiationGuard](./dual-instantiation-guard.md).

## Circuit dispatch

`runRetainedCircuit` runs one circuit by asking compact-js's
`ContractExecutable` for it, by branded `ProvableCircuitId`. compact-js indexes
`provableCircuits`, so that — not `impureCircuits` — is the map
`RetainedContract` declares and the one a caller's artifact is read through.

A caller still passes the CONSTRUCTED artifact the previous toolchain
generates, which is not compact-js's `CompiledContract`: that container is a
recipe, a class plus witnesses instantiated fresh per operation, while this
era's callers hold an instance whose witnesses are already bound. `containerFor`
adapts one to the other at this seam, in one place, so the adaptation does not
land on every consumer — and it is the single type assertion the module needs.

The retained era has no cross-contract call, so its execution adapter
synthesises a single-entry trace. `soleCall` reads that one entry by name
rather than indexing `[0]` and carrying an `undefined` into a composition.

A circuit that moved coins runs like any other: its post-call Zswap local state
leaves on the result for the caller to turn into the transaction's Zswap offer.

Failures come back with the runtime's own reason, not just compact-js's
wrapper. `Effect.runPromise` alone rejects with a `FiberFailure`, which carries
neither the failure's class nor its `cause`; `runOrRethrow` uses
`runPromiseExit` plus `Cause.squash` to recover the real error and rethrows it
with the whole `causeChain` spelled out in the message and the original on
`cause`. Without that, `Error executing circuit 'x'` is all a caller sees and
the actual diagnostic — a block-time refusal, an out-of-gas, a failed assertion
— is lost at exactly the moment someone needs it.

## What a `TranscriptPojo` carries, and why

`TranscriptPojo` is the result of one circuit's invocation: the primary result
plus every artifact `wrapKeepStateCall`
(`packages/protocol/src/lib/v9/wrap.ts`) needs to assemble a v9-native
`ContractCallPrototype`.

`preContractState` and `postContractState` are LIVE HANDLES from the retained
runtime — the state the call bound to and the state it left. They are valid
only while the runtime that produced them is loaded, so they survive neither a
clone, a worker transfer nor storage. `postContractStateEncoded` is published
beside them for exactly that reason: it is the same value as
`postContractState` in the `EncodedStateValue` form that outlives the process,
and it is what era-agnostic code reads.

`partitionContext` is the query-context state the call ran with, which the
carried state bytes do not hold. Composing a call without it partitions the
transcript against a context the circuit never ran on; a call that received a
coin in-contract cannot be partitioned at all. `PartitionContext` carries three
members. `block` and `effects` are read off the PRE-call context, because the
partitioner recomputes both from the program it replays — post-call values would
be counted twice; `comIndices` is read off the POST-call one, because the
runtime registers a received coin's commitment as the circuit produces it. All
three arrive on the `partitionInputs` compact-js publishes alongside the call
(midnightntwrk/midnight-sdk#400); before it did, they had to be scraped off a
query context by hand.

`zswapLocalState` is the post-call Zswap local state, DECODED into the
runtime's public shape: the coins the circuit spent and produced. A caller turns
it into the transaction's segmented Zswap offer (`zswapStateToSegmentedOffer`,
`packages/contracts/src/internal/utils/zswap-utils.ts`) and hands that offer to whichever
composition leg it targets. Carrying it is what makes a coin-moving circuit
composable on the retained era at all — omitting it would leave the caller
composing a transaction that is missing the coin movements the circuit recorded,
and the node rejects that as unbalanced on submission.

`gasCost` is absent from the result shape because nothing here reads it.

## Constructor execution

`runRetainedConstructor` runs a retained contract's constructor through the
same `ContractExecutable`, as `initialize`.

It FAILS EARLIER AND HARDER than the leg it replaced. `initialize` registers a
verifier key against every declared entry point and refuses one the reader
answers nothing for, before a state is built at all; the hand-written
constructor left every slot blank and the deploy composition was the only thing
that ever checked coverage. That is why this entry point takes a
`VerifierKeyReader` at all, and why it is required rather than optional.

A malformed signing key is refused BEFORE the constructor runs, as
`ComposeOptionError` naming option `'signingKey'`. The retained runtime's own
refusals name neither the option, the era nor the caller — a short key reads
back as `failed to fill whole buffer`, a non-hex one as `Invalid character 'z'
at position 0` — and the refusal never renders the key itself, which on the
sampled path is the only copy in existence.

`contractState` on the result is a retained-era HANDLE, so it does not go
straight into a deploy: both `composeV8DeployTx` and the era facade's
`composeDeployTx` take the state as bytes, which is what `.serialize()` on that
handle produces. The deploy-side consequences — and why the address cannot be
recomputed — are in [VerifierKeys](./verifier-keys.md) and [ComposeRefusalOrder](./compose-refusal-order.md).

## Binding the result back onto v9

`wrapKeepStateCall` wraps a `TranscriptPojo` into a v9-native
`ContractCallPrototype`, ready for `Intent.new(ttl).addCall(...)`, via
`assembleCallPrototype` against the ledger-v9 module. This is the "keep-state"
leg: execution stays on the retained pre-fork engine, but the call it produces
is bound natively against the current ledger-v9 axis from the start.

The retained execution leg partitions nothing. It hands over the raw op
sequence the circuit emitted, against the state it ran on, plus the context it
recorded while running which the state bytes do not carry — so it always
submits its transcript as `kind: 'unpartitioned'` and lets the ledger module do
the split. The counterpart shape, a transcript already partitioned by
compact-js, and the refusal of a partitioned transcript that carries neither
half (`ComposeFailedError`, stage `'call-transcript-empty'`) rather than
composing a call that records nothing, belong to [ComposeRefusalOrder](./compose-refusal-order.md).

A keep-state call never registers a new verifier key, unlike a deploy: it reuses
whichever key was already registered on-chain by the contract's original
(pre-fork) deploy and carried through the migration. So `options.contractState`
— the migrated, post-fork v9 `ContractState`, read from chain or otherwise
carrying the contract's real registered operations — must already carry the
operation for the circuit, or this throws `ComposeFailedError` rather than
silently falling back to a blank, unverifiable operation: stage `'wrap-call'`
when no operation is registered for the circuit at all, and
`'call-verifier-key'` when the one registered carries no verifier key.

## What reaches compact-js as configuration

Three things a retained execution needs are not arguments to it. They reach
compact-js as Effect services, assembled in this module so no `Effect` value
touches a caller.

`keysLayer` supplies the coin public key and the optional signing key as
platform-js's `Configuration.Keys`, built with `Layer.succeed` rather than
through `Configuration.layer` and a `ConfigProvider`: the service is a plain
tag with two members, so a config round trip would add nothing but a second
place for the values to disagree.

`zkConfigurationLayer` adapts a plain `VerifierKeyReader` into the service
`initialize` reads keys through, so no Effect type reaches a caller. A circuit
call substitutes `refuseVerifierKeyRead`, which refuses by name: a call reuses
the key already registered on-chain and has no business reading one.

The clock is pinned with `Effect.withClock`, NOT with a `Layer` over
`Clock.Clock`. The clock is one of Effect's DEFAULT services — it lives on the
fiber rather than in the context — so providing a layer for it type-checks,
runs, and is silently ignored, leaving the wall clock in place. That was
measured here, by a test that asserted a pinned second and got `Date.now()`.
Making the clock an input at all is midnightntwrk/midnight-sdk#403, and it is
what makes a recorded fixture reproducible.
