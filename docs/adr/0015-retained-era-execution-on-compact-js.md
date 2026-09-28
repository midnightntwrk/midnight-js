# 0015. Execute the retained era through compact-js rather than by hand

- Status: Accepted
- Date: 2026-09-28
- Deciders: Szymon Paluchowski
- Related: #1218 (the dual-ledger layer this retires), midnightntwrk/midnight-sdk#400, #401, #402, #403

## Context

`packages/protocol` carried a hand-maintained ledger-8 execution layer, built
when compact-js had no era-pinned entry for that era. `lib/v8/execute.ts` drove
`compact-runtime@0.16` directly and `lib/v8/down-convert.ts` built the state it
ran against — together 626 lines of source and 1 777 of test.

compact-js 3.0.0-rc.2 closes the four gaps that kept it there:

- **#400** publishes `partitionInputs` — the `state`, `block`, `effects` and
  `comIndices` a transcript's partition was built from. Without them a
  fork-crossing call could not be re-partitioned in the target era, which is
  what `lib/shared/assemble-call.ts` exists to do.
- **#403** makes the execution clock an input, so a recorded fixture is
  reproducible.
- **#402** fixes `CircuitParameters` under a branded circuit id.
- **#401** widens the `Ledger` facade to 37 names.

One gap is still open and turned out not to matter: `CompactRuntime` exports
neither `StateValue` nor `ChargedState` as values. The replacement path takes
the chain's own serialized `ContractState` instead of a bare state value, so it
never needs them.

## Decision

We will execute retained-era circuits and constructors through compact-js's
`ContractExecutable` on its `/v8/effect` entry, and delete the hand-maintained
layer. `lib/v8/executable.ts` is the only retained-era execution path.

Three properties hold at that seam:

1. **Plain data crosses it.** No `Effect` value reaches a caller; the effects
   are discharged with `Effect.runPromise` inside the module.
2. **Execution takes the chain's SERIALIZED contract state**, not an extracted
   primary state.
3. **The cross-era partition stays here.** compact-js partitions for the era
   that executed, which across a fork window is the wrong one. `assemble-call.ts`
   still re-partitions against the target era's `LedgerParameters`, from the
   `partitionInputs` compact-js now publishes.

The retained era takes a `CompiledContract`, the same container the current era
takes. The two eras no longer disagree on how a contract is handed over.

## Consequences

- **Positive:** 2 689 lines removed. The balance bug class is closed by
  construction rather than by a guard — see below. The clock is injectable, so
  `era-record-coin-receiver.test.ts` no longer substitutes two fields into its
  own recording after the fact. Both eras share one contract container.
- **Positive:** the committed golden transcript and the recorded coin-receiver
  fixture are reproduced byte-identically by the new path. Re-minting the
  recording changed only its `documentation` string.
- **Negative — `executeCircuit` is asynchronous.** compact-js builds a circuit
  call on `Effect.tryPromise`, so `runSync` cannot discharge it. The design spec
  promised the engine interface would keep its shape (G2); that promise is not
  satisfiable and is withdrawn here. The only production caller,
  `runLedger8CallPipeline`, was already `async`.
- **Negative — a deploy now fails earlier and harder.** `initialize` registers a
  verifier key against every declared entry point and REFUSES a missing one. The
  hand-written constructor left every slot blank and `composeV8DeployTx` was the
  only thing that checked coverage. The pipeline derives the constructor's
  reader from the deploy's own key map, so the two cannot disagree.
- **Negative — the retained ledger module now loads for a keep-state call.**
  `Ledger` on compact-js's ledger-8 entry IS ledger-v8, and the state decode
  goes through it. The previous engine deliberately never acquired it. What is
  still gated is that there is exactly ONE acquisition path.
- **Negative — the Merkle-rehash guard is gone.** `assertMerkleTreesRehashed`
  refused a state whose bounded Merkle trees had no computed root. It could only
  fire on a bare `EncodedStateValue` a caller assembled by hand; the new path
  takes a whole serialized contract state read off a chain, where the trees are
  rehashed by construction.
- **Follow-ups:** `packages/protocol` keeps `@midnightntwrk/ledger-v8` (the
  published `/v8` subpath re-exports it) and `@midnight-ntwrk/onchain-runtime-v3`
  (`lib/era/envelope.ts` names it). Only `compact-runtime-ledger8` became a
  development dependency.

### Why the contract state travels as bytes

The retained runtime populates the query context's `block.balance` only when it
is handed a whole `ContractState`:

```js
const balance = contractState instanceof ocrt.ContractState ? contractState.balance : new Map();
```

The retired `execute.ts` handed it a `ChargedState`, so the balance fell to an
empty map and a circuit reading one saw nothing, with every guard green. That is
#1345, and #1349 patched it by writing the balance into the context after the
fact. Passing the chain's own bytes makes the substitution unreachable rather
than detected.

## Alternatives considered

**Keep the hand-maintained layer.** Rejected: it exists only because compact-js
had no ledger-8 entry, and it now duplicates one that is tested upstream.

**Take an instance and wrap it in a synthetic constructor.** This would have
kept the retained-era public API unchanged, at the cost of one `as` assertion
and a wrapping pattern found nowhere else in the repo. Rejected in favour of
consistency with the current era, which already publishes `CompiledContract` on
ten public options types. It is also not merely cosmetic: `CompiledContract` has
no public accessor for the contract it holds, so the deploy arm could not have
recovered an instance once the call arm took a container — the two arms would
have had to disagree.

**Pin the clock with a `Layer` over `Clock.Clock`.** Measured and rejected: the
clock is one of Effect's DEFAULT services, living on the fiber rather than in
the context, so the layer type-checks, runs, and is silently ignored. The test
asserting a pinned second got `Date.now()`. `Effect.withClock` is the working
form.
