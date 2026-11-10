# 0009. Share era-neutral result bases from the types package

- Status: Accepted
- Date: 2026-09-09
- Related: [ADR 0010](./0010-publish-era-handles-alongside-their-plain-data.md)

## Context

The framework answers a circuit call with one result shape per ledger era:
`Ledger9FinalizedCallTxData` and `Ledger8FinalizedCallTxData`, each with a `public` and a
`private` half. A caller must be able to read `private.result`, `public.txId` and
`public.status` the same way in both eras.

If each era declares its result by hand, nothing says which members the two must share. A
member can fall off one era and nobody notices. A type test written with `toHaveProperty`
cannot catch this: it confirms that a named member is present, but it never sees a member that
is missing.

The repo already has the fix for the read side. `Ledger9FinalizedTxData` and
`Ledger8FinalizedTxData` both extend `FinalizedTxRecord` (`packages/types/src/midnight-types.ts`),
so they differ only in `era` and in the era of `tx`.

Two constraints decide where a shared base can live:

- `packages/types` does not depend on `packages/contracts`, and must not. The dependency runs
  the other way.
- Some result members have era-specific types by construction: the circuit's return value and
  the contract's private state.

## Decision

We declare the members every era must carry as bases in `packages/types/src/call-result-base.ts`.
Each era's result extends them:

- `CallResultPublicBase`: `publicTranscript`, `partitionedTranscript`.
- `ContractCallPrivateBase`: `input`, `output`, `privateTranscriptOutputs`. This is the private
  half of one call entry.
- `CallResultPrivateBase<Result, PrivateState>`: extends `ContractCallPrivateBase` and adds
  `result`, `nextPrivateState`, `nextZswapLocalState`. It is generic over exactly the two members
  whose types differ by era.
- `UnsubmittedTxDataBase`: `newCoins`. Each era adds its own `unprovenTx` handle beside it.
- `SubmittedCallTxBase<CallTxData>`: `txId` and `callTxData`, what an asynchronous submission
  answers with before there is a finalized record.

**The rule: an era may add members to a base; an era may not drop one.** Where an era really
cannot carry a member, the absence is named, with its reason, in an allow-list of the era
key-set parity gate (`packages/contracts/src/test/typecheck/overloads.test-d.ts`). An era may add
only what the other era cannot answer. The gate also asserts that every allow-listed member still
exists, because `Exclude<keyof T, 'x'>` silently does nothing when `x` is absent.

The current era's call entry (`ContractCall`) comes from `compact-js`, which this repo does not
own. It cannot extend `ContractCallPrivateBase`, so the key-set equality between it and
`Ledger8ContractCall` in the parity gate is what keeps the two in step.

Base placement follows what a base names:

- **Data-shape bases go to `packages/types`.** They name only declarations that package already
  reaches.
- **Behaviour-bearing shapes stay in `packages/contracts`.** A base for a contract handle would
  name `callTx` and the maintenance interfaces, which reach `submitCallTx`.

The contract handles (`Ledger9FoundContract` / `Ledger8FoundContract`, `Ledger9DeployedContract`
/ `Ledger8DeployedContract`) get the key-set parity gate and no base. Almost every member they
share has an era-specific type: `era` (`'v9'` against `'v8'`), `callTx`, `deployTxData` and
`compiledContract`. A base over them would declare a key set and nothing else. Only
`contractAddress` has one shared type, and one member is not worth a base. The gate also checks
`deployTxData` one level down, in both eras.

Two members are deliberately not generic:

- `nextZswapLocalState` is the current era's `ZswapLocalState`. The two runtimes' declarations
  are mutually assignable, asserted in both directions in
  `packages/protocol/src/test/v8-executable.test.ts` (`packages/types` cannot reach the
  retained runtime).
- `newCoins` is `ShieldedCoinInfo[]`, on the same grounds.

We do not add a top-level `FinalizedCallTxDataBase`. The two eras' `public` and `private` have
different types, so one base over both would be a "cannot simultaneously extend" error. The
parity gate checks the top-level key sets directly.

## Consequences

- A member added to a base reaches both eras at once.
- The bases are where the shared contract is written down. A reader of either era's result can
  see what is shared and what that era adds.
- `packages/types` keeps its direction of dependency. The data-shape versus behaviour rule says
  where the next base goes.
- An era's result is declared across two packages. Reading `Ledger8CallResultPrivate` alone does
  not show every member.
- `packages/types` gains declarations, but no runtime values.

## Alternatives considered

- **Bases in `packages/contracts`.** Rejected: declarations on both sides of the `types`
  boundary want them, and `FinalizedTxRecord` already lives in `types`.
- **A third type parameter for the Zswap local state.** Rejected: the two declarations are
  mutually assignable, so the parameter would carry no information.
- **Derive one era's result from the other with mapped types.** Rejected: the eras differ by
  decision as well as by type (for example `logEvents`), and a derivation would hide exactly the
  differences that must be stated.
- **The parity gate alone.** Rejected as the only mechanism: a gate reports drift after it is
  written, a base prevents it. We keep both.
