[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / CircuitContext

# Interface: CircuitContext\<PS\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:102

The external information accessible from within a Compact circuit call

## Type Parameters

### PS

`PS` = `any`

## Properties

### activeContracts?

> `optional` **activeContracts?**: `Set`\<`string`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:167

The set of contract addresses currently executing on the cross-contract call
stack: the entry contract plus every callee whose call has not yet returned.
Maintained by [crossContractCall](../variables/crossContractCall.md) and shared by reference across the call
tree (via [copyCircuitContext](../variables/copyCircuitContext.md)). Only consulted when [reentrancyGuard](#reentrancyguard)
is set.

***

### callContext

> **callContext**: `CallContext`\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:106

The context for the current call.

***

### callProofDataTrace

> **callProofDataTrace**: [`CallProofDataTrace`](../type-aliases/CallProofDataTrace.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:142

Sequence of calls made during the execution of the circuit (including the call for the root circuit).

***

### contractStates?

> `optional` **contractStates?**: `Record`\<`string`, [`ContractState`](../../onchain-runtime/classes/ContractState.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:134

The deployed [ocrt.ContractState](../../onchain-runtime/classes/ContractState.md) of every cross-contract callee resolved during the
execution, keyed by address. Populated by [crossContractCall](../variables/crossContractCall.md) (via the state provider)
the first time a callee is reached. Retained — unlike the cached query context, which keeps only
ledger data — so the implementation-binding guard can read a callee's deployed verifier key for
*any* of its circuits on *every* call, including later calls to a different circuit of an
already-resolved callee. The entry contract is not recorded here; only fetched callees are.

***

### costModel

> **costModel**: [`CostModel`](../../onchain-runtime/classes/CostModel.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:138

The cost model to use for the execution.

***

### events

> **events**: [`LogEvent`](../type-aliases/LogEvent.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:174

Events emitted by the on-chain VM during circuit execution from `log` operations,
each tagged with the address of the emitting contract. A single global list shared
across the whole call tree (threaded like [callProofDataTrace](#callproofdatatrace)); a per-contract
view is a filter over the `address` tag. Surfaced via `CircuitResults.context.events`.

***

### gasCosts

> **gasCosts**: `Record`\<[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md), [`RunningCost`](../../onchain-runtime/type-aliases/RunningCost.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:114

The current gas costs for every contract in the call tree.

***

### gasLimit?

> `optional` **gasLimit?**: [`RunningCost`](../../onchain-runtime/type-aliases/RunningCost.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:146

The gas limit for this circuit.

***

### queryContexts

> **queryContexts**: `Record`\<[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md), [`QueryContext`](../../onchain-runtime/classes/QueryContext.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:110

The current query context of every contract in the call tree.

***

### reentrancyGuard?

> `optional` **reentrancyGuard?**: `boolean`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:159

When `true`, [crossContractCall](../variables/crossContractCall.md) refuses to enter a contract that is
already executing on the current call stack — i.e. a re-entrant cross-contract
call (`A -> A`, or `A -> B -> A`) — and throws instead. On by default (the
upstream ledger can mis-apply transcripts on re-entry). Pass `false` to
[createCircuitContext](../variables/createCircuitContext.md) to opt out, e.g. for tests that deliberately
exercise recursion.

***

### stateProvider?

> `optional` **stateProvider?**: [`ContractStateProvider`](ContractStateProvider.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:150

Can fetch the current state of a contract from the blockchain.

***

### zswapLocalStates

> **zswapLocalStates**: `Record`\<[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md), [`EncodedZswapLocalState`](EncodedZswapLocalState.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:125

The current Zswap local state of every contract in the call tree — the shielded-coin
counterpart of [queryContexts](#querycontexts) and [gasCosts](#gascosts), and keyed the same way.

Each contract keeps its own state, with its own `currentIndex`, `inputs` and `outputs`;
only the transaction submitter's `coinPublicKey` is shared, since one wallet pays for the
whole transaction. Threaded across cross-contract calls (see `restoreCircuitContext`) so a
callee's coin operations survive its return, and mirrored onto each [CallProofData](CallProofData.md)
so transaction assembly can attribute every input and output to the contract that made it.
