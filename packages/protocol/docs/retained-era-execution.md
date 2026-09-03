---
title: RetainedEraExecution
---

# Running a contract on the retained pre-fork era

A contract compiled before the fork keeps running on the retained pre-fork
execution engine (`compact-runtime@0.16` and `@midnight-ntwrk/onchain-runtime-v3`)
after the fork. The post-fork state it must execute against is down-converted
into the pre-fork algebra, the circuit or constructor is run there, and the
resulting call is bound NATIVELY against the current ledger-v9 axis from the
start — no v8-tx carrier, no later re-bind.

This document collects the rationale behind that path: what each
down-conversion stage is for, why a tree that was not rehashed is refused
rather than repaired, what pins the bridge to the pre-fork era, what the
execution result has to carry, and why the runtime the seams call is injected.

The error classes named here are described in `FailClosedDecoding`, which owns
the division of labour between `DownConvertFailedError`,
`StateDecodeFailedError` and `Ledger8RuntimeInvalidError`; the refusal ordering
on the composition legs is in `ComposeRefusalOrder`.

## The down-conversion stages

`downConvertForExecution` (`packages/protocol/src/lib/v8/down-convert.ts`)
takes an already-extracted post-fork `EncodedStateValue` and produces the
pre-fork state a v8-era circuit executes against. It runs in stages, and each
stage exists to make one class of failure legible:

1. **The injected runtime is checked first**, before anything is decoded, for
   the same reason `extractEncodedStateValue` checks the runtime it is handed:
   a runtime missing a binding this function dereferences would otherwise raise
   a bare `TypeError` that the catch below relabels
   `DownConvertFailedError` — an error whose message sends the caller to audit
   input bytes that are not the problem. Only the two members the function
   actually calls are checked; `ContractState` is on `Ledger8CompactRuntime` to
   pin the era, and is never dereferenced here.
2. **Decode through the injected pre-fork `StateValue.decode`.**
3. **Structural integrity**, by re-encoding the decoded value and comparing it
   to the input. This catches loss at every depth — a shortened array, a
   dropped map entry, a changed cell, a substituted subtree — rather than only
   a wholesale collapse to `null`. It costs one extra encode plus a deep
   comparison per call, and that is deliberate: the alternative is a bridge
   that can hand a circuit silently wrong data.
4. **The Merkle rehash walk**, described below.
5. **`ChargedState` construction.**

Never returns a silently empty or partial state. Every failure leaves as a
`DownConvertFailedError` carrying `{ cause }`, or a `MerkleNotRehashedError` —
including failures from the Merkle walk and from `ChargedState` construction,
so no uncoded error escapes a seam whose whole contract is code-based
discrimination.

`DownConvertedState` is deliberately not a full pre-fork `ContractState`: this
bridge produces only the `ChargedState`, so it does not fabricate blank
defaults for `.operations`, `.maintenanceAuthority`, or `.balance`. Those
remain the caller's to carry — execution receives balances via
`CallContext.balance`, not via this state.

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
part of the package-wide discipline in `SharedTableDiscipline`.

## The Merkle walk, and why a rootless tree is refused

`assertMerkleTreesRehashed` asserts that every bounded Merkle tree in a
`StateValue` tree already has its node hashes computed, recursing through the
only two container variants in the algebra (`array` and `map`) and ignoring the
leaf variants (`cell`, `null`, and `boundedMerkleTree`'s own contents).

`checkRoot` treats three shapes of "no root" alike, because all three mean the
same thing to a caller and only one is in the vendor's type: `undefined` (what
the typings document), `null` (what a `None` can serialize to), and a throw —
the wasm-bindgen shim for `root()` rethrows a Rust `Err` rather than always
resolving to a value. Letting that throw escape would demote it to a generic
down-convert failure and tell the caller to check its envelope bytes when the
actual remediation is to rehash the tree.

The walk is fail-fast by design rather than reparative. An `encode()`/`decode()`
round trip materializes a tree's hashes on the pinned
onchain-runtime-v3/ledger-v9 versions, and every state reaching
`downConvertForExecution` has crossed one — so a rootless tree here can only
mean an upstream programming error, which this surfaces loudly instead of
silently repairing. That round-trip behaviour is a vendor property rather than
a guarantee, so it is pinned by a test (`materializes the hashes of a tree that
was never rehashed`) that fails if a vendor bump changes it.

Accepting one instead — or repairing it in passing — would hand a circuit a
state whose hashes this bridge quietly supplied, which is the
silent-wrong-data outcome the module exists to prevent.

The walk does not mutate or rebuild the state. It is not allocation-free: each
`asArray()`/`asMap()` step marshals fresh wrapper objects out of WASM.

Its non-null assertions are guarded by the preceding `type()` call: the `as*`
accessors return `undefined` only on a variant mismatch, which the switch has
already excluded. `map.get(key)` is likewise asserted because a key marshalled
out by `keys()` resolves back through `get()`. Both are observed behaviour of
onchain-runtime-v3 rather than vendor-documented invariants — the vendor's own
types are not authoritative about definedness here (`asCell()` is declared
non-optional yet returns `undefined` for a `null` state value) — so they are
pinned by tests over a multi-entry map rather than by prose alone.

The walk's `default` arm carries both a compile-time exhaustiveness assertion
and a runtime throw; why neither is redundant with the other is in
`SharedTableDiscipline`, alongside the same form in `version.ts` and
`loadLedgerEra`.

## What the down-convert does not cover

Anything the pre-fork encoder re-derives rather than carries. A bounded Merkle
tree encodes as its height and leaves, never its node hashes, so a tree whose
internal hashes were re-materialized differently across the fork boundary still
re-encodes byte-identically here. `assertMerkleTreesRehashed` establishes only
that each tree has a readable root, not that the root matches the source's.
Comparing roots across the boundary needs the source-side tree, which
`downConvertForExecution` never sees — it belongs at the envelope seam.

## The era pin

`Ledger8CompactRuntime` names three members:

```
ContractState   StateValue   ChargedState
```

`ContractState` is there to pin the *era*, not because
`packages/protocol/src/lib/v8/down-convert.ts` calls it.

`StateValue.decode` and `new ChargedState(...)` are structurally identical
across the fork — that identity is what makes the bridge possible at all, and
it is asserted directly by the wire-shape drift detectors in
`v8-down-convert.test.ts`. So neither member can tell a pre-fork runtime from a
post-fork one. Without a third member the interface is satisfied by
onchain-runtime-v4 and by `compact-runtime` (which re-exports it) — both public
barrel exports of this very package. A caller reaching for the wrong one gets
no error: decode and re-encode then use the same post-fork codec, so the
structural comparison passes, the Merkle walk passes, and a v4 `ChargedState`
is returned typed as a v3 one, to surface later as an opaque wasm-bindgen
rejection deep inside execution.

`ContractState` closes that hole, and the closing happens in
`Ledger8ContractState` (`packages/protocol/src/lib/era/envelope.ts`). The
narrowing there carries the era pin `Ledger8CompactRuntime` depends on: the
static's RETURN type is the v3 instance, whose `query()` returns a
`GatherResult` whose `log` variant gained fields after the fork, so a post-fork
module fails to satisfy the type.

That divergence is incidental to this bridge, so it is pinned by a compile-time
negative assertion rather than trusted:
`_PostForkOnchainRuntimeIsRejected` in `v8-down-convert.test.ts` pins exactly
that a post-fork runtime is not assignable. A vendor bump that realigned the
two shapes would otherwise silently reopen the hole.

Why the assembled object may take `ContractState` from onchain-runtime-v3 while
the other two members come from the 0.16 glue is a dual-instantiation question,
and belongs to `DualInstantiationGuard`.

## Circuit dispatch

`executeCircuit` (`packages/protocol/src/lib/v8/execute.ts`) runs one impure
circuit, following the exact `createCircuitContext` /
`impureCircuits[id](ctx, ...args)` sequence the retained toolchain expects (the
spike's `runCircuit`).

`Ledger8ContractLike` names only `impureCircuits`, the map every generated
contract exposes its callable entry points under. The other own properties a
real compiled contract carries (`witnesses`, `circuits`, `provableCircuits`,
`initialState`) are never read here — execution only ever dispatches through
`impureCircuits`.

An unknown `circuitId` throws a plain `Error`, not a
`PROTOCOL_ERROR_CODES`-carrying class. This is a caller-programming-error case
(an unknown circuit name passed by the caller), not one of the decode/
runtime-instance failure modes this engine wraps elsewhere; it mirrors the plain
`Error` the spike itself throws for the analogous "operation missing on contract
state" case. Why the lookup is an own-property one is in
`SharedTableDiscipline`.

A circuit that moved coins runs like any other: its post-call Zswap local state
leaves on the result for the caller to turn into the transaction's Zswap offer.

## What a `TranscriptPojo` carries, and why

`TranscriptPojo` is the result of one impure circuit's invocation: the primary
result plus every artifact `wrapKeepStateCall`
(`packages/protocol/src/lib/v9/wrap.ts`) needs to assemble a v9-native
`ContractCallPrototype`.

`preContractState`/`postContractState` are `DownConvertedState`s — the same
execution-only state shape `downConvertForExecution` already produces — not
full pre-fork `ContractState`s: they carry only `.data`, so a consumer cannot
reach `.operations`, `.maintenanceAuthority` or `.balance` through them.

`partitionContext` is the query-context state the call ran with, which the
carried state bytes do not hold. Composing a call without it partitions the
transcript against a context the circuit never ran on; a call that received a
coin in-contract cannot be partitioned at all. Of the four members the pre-fork
query context exposes, `block` and `effects` are read off the PRE-call context,
because the partitioner recomputes both from the program it replays — post-call
values would be counted twice; `comIndices` is read off the POST-call one,
because the runtime registers a received coin's commitment as the circuit
produces it (`createZswapOutput` in the retained 0.16 glue). All four are
declared on one type because the runtime exposes them on the same object; which
one each is read from is `executeCircuit`'s choice, not the type's.

`zswapLocalState` is the post-call Zswap local state, DECODED into the
runtime's public shape: the coins the circuit spent and produced. A caller turns
it into the transaction's segmented Zswap offer (`zswapStateToSegmentedOffer`,
`packages/contracts/src/utils/zswap-utils.ts`) and hands that offer to whichever
composition leg it targets. Carrying it is what makes a coin-moving circuit
composable on the retained era at all — omitting it would leave the caller
composing a transaction that is missing the coin movements the circuit recorded,
and the node rejects that as unbalanced on submission.

The decoding happens through the injected 0.16 glue rather than in the caller,
so a caller never has to acquire the retained glue itself just to read which
coins a call moved. `currentZswapLocalState` as the glue really puts it on a
`CircuitContext` is the runtime's own BYTE-encoded shape, and is declared as the
vendor type rather than an opaque one, because `executeCircuit` hands it on to a
caller instead of only testing it for emptiness.

`gasCost` is absent from the result shape because nothing here reads it.

## Constructor execution

`executeConstructor` (`packages/protocol/src/lib/v8/deploy.ts`) runs a pre-fork
contract's constructor (`initialState`), following the
`createConstructorContext` / `contract.initialState(cc, ...args)` sequence the
retained toolchain expects. `Ledger8ConstructorContractLike` names only
`initialState`, the constructor every generated contract exposes to build its
initial ledger state.

`contractState` on the result is a pre-fork HANDLE, so it does not go straight
into a deploy: both `composeV8DeployTx` and the era facade's `composeDeployTx`
take the state as bytes, which is what `.serialize()` on that handle produces.
The deploy-side consequences — the blank verifier-key slots a constructor-built
state carries, and why the address cannot be recomputed — are in `VerifierKeys`
and `ComposeRefusalOrder`.

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
composing a call that records nothing, belong to `ComposeRefusalOrder`.

A keep-state call never registers a new verifier key, unlike a deploy: it reuses
whichever key was already registered on-chain by the contract's original
(pre-fork) deploy and carried through the migration. So `options.contractState`
— the migrated, post-fork v9 `ContractState`, read from chain or otherwise
carrying the contract's real registered operations — must already carry the
operation for the circuit, or this throws `ComposeFailedError` rather than
silently falling back to a blank, unverifiable operation: stage `'wrap-call'`
when no operation is registered for the circuit at all, and
`'call-verifier-key'` when the one registered carries no verifier key.

## The injected runtime slices

Three structural slices of the retained toolchain reach these seams by
injection rather than by import: `Ledger8CompactRuntime` (down-convert),
`Ledger8ExecutionRuntime` (circuit execution) and `Ledger8ConstructorRuntime`
(constructor execution). Injection is what lets a caller target a specific
WASM-backed instance, and what lets a test substitute a controlled fake instead
of standing up real WASM. `createLedger8Engine`
(`packages/protocol/src/lib/v8/engine.ts`) assembles all three out of one
acquisition and captures them in closure, so nothing on the engine's public
surface takes a runtime parameter.

`Ledger8ExecutionRuntime` carries exactly what building and running a circuit
context needs: `decodeZswapLocalState`, `createCircuitContext`, and `CostModel`
narrowed to `initialCostModel` — the only static this seam calls, and the
narrowing is what lets a test inject a stub cost model. The cost model is not a
caller choice: `executeCircuit` always builds the context with the glue's own
`initialCostModel()` and passes no gas limit.

`v8-load-engine.test.ts` pins that the real glue still satisfies the execution
slice, and `v8-deploy.test.ts` does the same for the constructor slice, so a
narrowing cannot drift away from the runtime it stands for.

Why each slice is DERIVED from the vendor's own class where it can be, rather
than restated as a hand-written mirror, and why each is narrowed to the members
its seam actually calls, is in `ModuleGraphAndLazyLoading`; the trade the
constructor slice makes is in `ComposeRefusalOrder`.
