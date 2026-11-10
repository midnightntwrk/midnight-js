# 0015. Execute the retained era through compact-js rather than by hand

- Status: Accepted
- Date: 2026-09-28
- Related: [ADR 0004](./0004-lazy-v8-era-access-via-protocol-subpath.md)

## Context

The framework must still execute circuits and constructors of contracts built for the retained
(v8) era. compact-js 3.x has an era-pinned entry for that era, `/v8/effect`, with a
`ContractExecutable` tested upstream. It also publishes what a cross-era call needs:

- `partitionInputs`, the state, block, effects and commitment indices a transcript's partition
  was built from. Without them a call that crosses the fork could not be re-partitioned in the
  target era.
- an injectable execution clock, so a recorded fixture is reproducible.

One gap remains. compact-js's retained `CompactRuntime` binding exports `ContractState` but not
`StateValue` or `ChargedState` as values. The framework needs both: a contract migrated by an
earlier post-fork call carries a current-era envelope while it still executes on the retained
runtime, so its state must be rebuilt from the era-neutral form, not decoded from one era's bytes.

The retained runtime fills the query context's `block.balance` only when it receives a whole
`ContractState`. Given anything less, it uses an empty map, and a circuit that reads a balance
sees zero while every guard passes.

## Decision

We will execute retained-era circuits and constructors through compact-js's `ContractExecutable`
on its `/v8/effect` entry. `packages/protocol/src/lib/v8/executable.ts` is the only retained-era
execution path. Three properties hold at that seam:

1. **Only plain data crosses it.** No `Effect` value reaches a caller; the module runs the effects
   itself.
2. **Execution takes the decoded contract state, with its balances on the same value.** The state
   is read by whichever era's reader the envelope names. `executableStateFrom` builds a whole
   `ContractState` from it and writes the balance onto it, so the runtime reads the balance
   natively. State and balance come from one decoded snapshot, so they cannot come from different
   reads. The state is decoded with a round-trip check: a value that does not re-encode to its
   source is refused with `StateConversionFailedError`.
3. **The cross-era partition stays in the framework.** compact-js partitions for the era that
   executed, which is the wrong one across the fork. `lib/shared/assemble-call.ts` re-partitions
   against the target era's ledger parameters, from the `partitionInputs` compact-js publishes.

`StateValue`, `ChargedState` and `ContractState` all come from the retained runtime glue,
`compact-runtime-ledger8` (an alias of `@midnight-ntwrk/compact-runtime@0.16.0`), so they come from
one module. Building them from ledger-v8's same-named classes instead would be a second WASM
instance of that era.

The retained era's public surface stays the constructed artifact the previous toolchain
generates. `containerFor` adapts it into compact-js's `CompiledContract` at the seam, in one place.

The execution clock is pinned with `Effect.withClock`.

## Consequences

- **Positive:** no hand-maintained execution layer; the retained era runs on code tested upstream.
- **Positive:** the empty-balance bug class is closed by construction, not by a guard.
- **Positive:** the clock is injectable, so recorded fixtures reproduce byte for byte.
- **Negative:** `Ledger8Engine.executeCircuit` and `executeConstructor` are asynchronous.
  compact-js builds its work on `Effect.tryPromise`, so `Effect.runSync` cannot run it. The
  production caller, `runLedger8CallPipeline` in `contracts`, is async anyway.
- **Negative:** a deploy fails earlier. `initialize` registers a verifier key for every declared
  entry point and refuses a missing one with a `ContractConfigurationError`. The pipeline derives
  the constructor's key reader from the deploy's own key map, so the two cannot disagree.
- **Follow-up:** `packages/protocol` keeps its direct retained-era dependencies:
  `@midnightntwrk/ledger-v8` backs the `./v8` subpath, `@midnight-ntwrk/onchain-runtime-v3` is
  named by `lib/era/envelope.ts`, and `compact-runtime-ledger8` supplies `StateValue` and
  `ChargedState`. The last one can go only when compact-js exports those two values (an upstream
  ask).

## Alternatives considered

- **Keep a hand-maintained execution layer.** Rejected: it would duplicate an entry compact-js
  now provides and tests.
- **Make `CompiledContract` the retained era's public surface too, for symmetry with v9.**
  Rejected: compact-js is not the sole owner of the retained runtime (the framework still needs
  the glue for `StateValue` and `ChargedState`), so symmetry buys little, and it would change the
  public surface of the retained era.
- **Pin the clock with a `Layer` over `Clock.Clock`.** Rejected: the clock is one of Effect's
  default services and lives on the fiber, not in the context, so the layer type-checks, runs and
  is silently ignored. `Effect.withClock` works.
