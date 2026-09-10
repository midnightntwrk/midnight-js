# 0010. Share era-neutral result bases from the types package

- Status: Accepted
- Date: 2026-09-09
- Deciders: Szymon Paluchowski

## Context

The framework answers a circuit call with two result shapes, one per era:
`CallResult` / `FinalizedCallTxData` for the current era and
`Ledger8CallResultPublic` / `Ledger8CallResultPrivate` /
`Ledger8FinalizedCallTxData` for the retained pre-fork one. A caller is meant
to read `private.result`, `public.txId` and `public.status` the same way in
both eras — that uniformity is the reason the retained arms were given the same
two-level structure in the first place.

They were written as hand-copied mirrors. Nothing declared the members the two
eras must share, so the copy could be incomplete and stay incomplete: four
members were on one era's surface and not the other, and three docblocks
described a correspondence that no longer held. Two of the four —
`nextZswapLocalState` and `newCoins` — are plain data in both runtimes and were
simply unobtainable in the retained era, with no way to recover them after
submission short of re-running the circuit and composing a second transaction.

The gate that should have caught this could not. The era-parity assertions in
`packages/contracts/src/test/typecheck/overloads.test-d.ts` were written with
`toHaveProperty`, which confirms a named member is PRESENT and can never
observe one that is ABSENT — the one-directional assertion this repo's own
contributor guide lists as a common mistake.

There is a precedent for the fix inside the repo. `FinalizedTxData` and
`FinalizedTxDataV8` both extend `FinalizedTxRecord`
(`packages/types/src/midnight-types.ts`), so the two arms differ in exactly the
`version` discriminant and the type of `tx`, and cannot drift apart as members
are added to the record. Nothing equivalent existed for the execution half.

Two constraints shape where such a base can live:

- `packages/types` depends on `midnight-js-protocol`, `effect`, `pino` and
  `rxjs`. It does **not** depend on `packages/contracts`, and must not start:
  the dependency runs the other way.
- The eras' result members are not all the same type. The circuit's return
  value and the contract's private state are era-specific by construction
  (`Contract.CircuitReturnType` versus `Ledger8CircuitReturnType`,
  `Contract.PrivateState` versus `Ledger8PrivateState`).

## Decision

We will declare the members both eras must carry as shared bases in
`packages/types/src/call-result-base.ts`, and have each era's arm extend them:

- `CallResultPublicBase` — `publicTranscript`, `partitionedTranscript`.
- `CallResultPrivateBase<Result, PrivateState>` — the six execution members,
  generic over exactly the two whose types are era-specific.
- `ContractCallPrivateBase` — the private half of ONE call entry. Unlike the
  others this base has a single implementor: the current era's call entry comes
  from `compact-js`, which this repo does not own and cannot make extend a base.
  It therefore records the shared shape rather than enforcing it, and the
  call-entry key-set assertion in the parity gate is what holds the two in step.
- `UnsubmittedTxDataBase` — `newCoins`, the one member both eras carry
  alongside the transaction they composed.
- `SubmittedCallTxBase<CallTxData>` — `txId` and `callTxData`, the two members
  an asynchronous submission answers with before there is a record to pair the
  execution data against.

**The invariant: an era MAY add members to a base; an era may NOT drop one.**
That is what makes the whole class of defect unrepresentable rather than merely
detectable. Where an era genuinely cannot carry a member, the absence is named
in the allow-list of the era key-set parity gate, with its reason, rather than
being silently absent.

We will split base placement by what a base names:

- **Data-shape bases go to `packages/types`.** They name only declarations that
  package already reaches.
- **Behaviour-bearing bases stay in `packages/contracts`.** A base for
  `FoundContract` or `DeployedContract` names `CircuitCallTxInterface` and the
  maintenance interfaces, which reach `submitCallTx`. Moving those to `types`
  would require `types` to depend on `contracts`.

### The contract HANDLES get the gate and no base

`FoundContract` / `Ledger8FoundContract` and `DeployedContract` /
`Ledger8DeployedContract` are held in step by the key-set parity gate ALONE.
There is no base for them and there will not be one.

Every member the two arms share has an era-specific type: `era` is
`CurrentPipelineEra` against `RetainedPipelineEra`, `callTx` is
`CircuitCallTxInterface<C>` against `Ledger8CircuitCallTxInterface<C>`, and
`deployTxData` is `FinalizedDeployTxDataBase<C>` against
`VersionedFinalizedTxData`. A base over those three declares a key set and
nothing else — the same shape this ADR already rejected for a top-level
`FinalizedCallTxDataBase`, and for the same reason: two arms narrowing one
base's member to different types is a "cannot simultaneously extend" error
rather than a guarantee. Where the shared members carry no shared type, the
gate is not the weaker of the two tools; it is the only one.

The gate for these types lives beside the result-shape one in
`packages/contracts/src/test/typecheck/overloads.test-d.ts`, with the same
allow-list discipline and the same backstop asserting an excused member still
EXISTS.

Two members of the base set are deliberately NOT generic:

- `nextZswapLocalState` is declared once, as the current era's
  `ZswapLocalState`. The two runtimes' declarations are mutually assignable, so
  a third type parameter would only ever be filled with structurally equal
  arguments. That is asserted with the compiler in BOTH directions, in
  `packages/protocol/src/test/v8-execute.test.ts` — `packages/types` cannot host
  the check because it may not reach the retained runtime. This is the *decoded* post-call state, not
  `Ledger8CircuitContext.currentZswapLocalState`, which is the runtime's
  byte-encoded form and does fall under ADR-0007.
- `newCoins` is `ShieldedCoinInfo[]`, on the same grounds.

Moving a member from an era's own declaration into a base it extends is not a
breaking change: TypeScript is structural, so an interface with an unchanged
total member set is indistinguishable from the flat one it replaced. Every name
`packages/contracts` exported before is still exported from it.

We will NOT create `packages/types/src/v8/`. The rule stands — a retained-era
declaration that lands in `types` belongs in that directory — but the bases are
era-neutral and each era's arm stays with its own era's other declarations, so
nothing retained-specific moves into `types` and an empty directory would be
symmetry for its own sake. The same reasoning excludes a speculative `v9/`.

We will NOT introduce a top-level `FinalizedCallTxDataBase`. The current era's
`FinalizedCallTxData` already reaches `public` and `private` through
`UnsubmittedCallTxData` and narrows `public` on the way; a second base
declaring the same two members with different types is an
"cannot simultaneously extend" error rather than a guarantee. Top-level parity
is what the key-set gate asserts directly.

## Consequences

- **Positive:** a member added to a base reaches both eras at once. The retained
  era gained `nextZswapLocalState` and `newCoins` as a consequence of extending
  the bases, not as two separate fixes.
- **Positive:** the bases are where the guarantee is written down, so a reader
  of either era's arm can see what is shared and what that arm adds.
- **Positive:** `packages/types` keeps its direction of dependency; the rule
  that separates a data-shape base from a behaviour-bearing one says where the
  next base goes without re-deciding.
- **Negative:** the declaration of an era's result is now split across two
  packages. Reading `Ledger8CallResultPrivate` alone no longer shows every
  member it has.
- **Negative:** `packages/types` grows more declarations. The package is
  documented as declarations-only and is not — it already ships around 29
  runtime values — but these bases are consistent with the rule as stated for
  new code, and add no runtime value.
- **Positive:** the handle surfaces are gated too, and the drift the gate found
  on its first run is closed: `compiledContract` and `contractAddress` were on
  the retained arm alone, for no reason anyone had written down, and are now on
  both.
- **Follow-ups:** the retained era's missing `calls` was
  listed here while ADR-0007 still barred a live `StateValue` from the type;
  ADR-0011 lifted that bar, so `Ledger8ContractCall` is published with a full
  call-entry parity assertion rather than an allow-list entry.
  One handle divergence is excused rather than closed: both eras hold the
  deployer's `signingKey`, `initialPrivateState`, `initialZswapState` and
  `initialContractState`, but the current era nests them under `deployTxData`
  and the retained era publishes them flat. Which path wins is a breaking
  change to a published surface either way, so it is its own decision,
  tracked in #1298.

## Alternatives considered

- **Bases in `packages/contracts`.** Rejected: `packages/types` is where the
  provider interfaces and `FinalizedTxRecord` already live, and the same bases
  are wanted by declarations on both sides of that package boundary.
- **A third type parameter for the Zswap local state.** Rejected: the two
  runtimes' declarations are mutually assignable, so the parameter would carry
  no information and every reader would pay for it.
- **Generating the retained arms from the current ones with mapped types.**
  Rejected: the eras differ by decision as well as by type — `nextContractState`
  and `logEvents` are absent for reasons a mapped type cannot express — and a
  derivation would hide exactly the differences that need to be stated.
- **Leaving the mirrors and relying on a stronger test alone.** The key-set
  parity gate does catch the drift, and was written first. It stays. But a gate
  reports drift after it is written, while a shared base prevents it; the two
  are worth having together, and the bases are what make the gate's allow-list
  the only place an era-specific absence can be recorded.
