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

One gap is still open, and the spec's judgement that it was moot was WRONG.
`CompactRuntime` exports neither `StateValue` nor `ChargedState` as values
(finding E9). The spec reasoned that `execute.ts` and `down-convert.ts` retire
together, so nothing would need them. They are needed: a contract an earlier
post-fork call has migrated carries a CURRENT-era envelope while still executing
on the retained runtime, so its state has to be rebuilt from the era-neutral
form rather than decoded from one era's bytes — and rebuilding it needs exactly
those two values. `compact-runtime-ledger8` supplies them and stays a
dependency of this package for that reason alone.

## Decision

We will execute retained-era circuits and constructors through compact-js's
`ContractExecutable` on its `/v8/effect` entry, and delete the hand-maintained
layer. `lib/v8/executable.ts` is the only retained-era execution path.

Three properties hold at that seam:

1. **Plain data crosses it.** No `Effect` value reaches a caller; the effects
   are discharged with `Effect.runPromise` inside the module.
2. **Execution takes the DECODED contract state**, read by whichever era's
   reader the envelope named, with the balances on the same value.
3. **The cross-era partition stays here.** compact-js partitions for the era
   that executed, which across a fork window is the wrong one. `assemble-call.ts`
   still re-partitions against the target era's `LedgerParameters`, from the
   `partitionInputs` compact-js now publishes.

The retained era's PUBLIC surface is unchanged: a caller still passes the
constructed artifact the previous toolchain generates. `containerFor` adapts it
into compact-js's `CompiledContract` at the seam, in one place, so the
adaptation does not land on every consumer.

## Consequences

- **Positive:** 2 689 lines removed. The balance bug class is closed by
  construction rather than by a guard — see below. The clock is injectable, so
  `era-record-coin-receiver.test.ts` no longer substitutes two fields into its
  own recording after the fact.
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
- **Negative — the Merkle-rehash guard is gone.** `assertMerkleTreesRehashed`
  refused a state whose bounded Merkle trees had no computed root. It could only
  fire on a bare `EncodedStateValue` a caller assembled by hand; the new path
  takes a whole serialized contract state read off a chain, where the trees are
  rehashed by construction.
- **Follow-ups:** `packages/protocol` keeps all three direct ledger
  dependencies. `@midnightntwrk/ledger-v8` backs the published `/v8` subpath,
  `@midnight-ntwrk/onchain-runtime-v3` is named by `lib/era/envelope.ts`, and
  `compact-runtime-ledger8` supplies the two values E9 leaves unavailable. Step
  5 of the phase-2 scope — dropping them — is therefore not done, and cannot be
  until E9 is closed upstream.

### Why the state and its balances travel as one value

The retained runtime populates the query context's `block.balance` only when it
is handed a whole `ContractState`:

```js
const balance = contractState instanceof ocrt.ContractState ? contractState.balance : new Map();
```

The retired `execute.ts` handed it a `ChargedState`, so the balance fell to an
empty map and a circuit reading one saw nothing, with every guard green. That is
#1345, and #1349 patched it by writing the balance into the context after the
fact.

`executableStateFrom` builds a whole `ContractState` and writes the balance onto
it, so the runtime reads it natively and the substitution is unreachable rather
than detected. The state and the balance arrive as ONE value — the decoded
snapshot — so they cannot come off different reads either.

They are NOT the chain's own bytes, and that is deliberate: a contract migrated
by an earlier post-fork call carries a current-era envelope while still
executing on the retained runtime, so bytes would have to be decoded by the era
that wrote them. The era-neutral form is what lets one path serve both.

## Alternatives considered

**Keep the hand-maintained layer.** Rejected: it exists only because compact-js
had no ledger-8 entry, and it now duplicates one that is tested upstream.

**Make `CompiledContract` the retained era's public surface too**, for symmetry
with the current era. Attempted first, and reverted. Two things decided it.

The symmetry argument rested on compact-js being the sole owner of the retained
runtime; E9 above means it is not, so the premise failed. And the migration was
not free: `resolveArtifactEra` short-circuits a container straight to the
current era in order to skip a provider round trip, so placing both eras behind
one container makes every current-era call read `getArtifactRuntimeVersion()` —
a provider that does not implement it would newly be refused.

An honest note on how this was found: the first implementation DID take a
container in `packages/protocol` while `packages/contracts` still passed a raw
instance, with `unknown` at the seam between them. Both packages' suites were
green — contracts' tests run against a double that never reaches the engine —
and every retained-era call failed at run time. The seam is typed now, and
`keep-state.test.ts` pins that the request's contract satisfies what the engine
accepts.

**Pin the clock with a `Layer` over `Clock.Clock`.** Measured and rejected: the
clock is one of Effect's DEFAULT services, living on the fiber rather than in
the context, so the layer type-checks, runs, and is silently ignored. The test
asserting a pinned second got `Date.now()`. `Effect.withClock` is the working
form.
