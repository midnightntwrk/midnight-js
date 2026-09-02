[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / createCircuitContext

# Variable: createCircuitContext

> `const` **createCircuitContext**: \<`PS`\>(`circuitId`, `contractAddress`, `coinPublicKeyOrZswapState`, `contractState`, `privateState`, `stateProvider?`, `gasLimit?`, `costModel?`, `time?`, `parentBlockHash?`, `reentrancyGuard?`) => [`CircuitContext`](../interfaces/CircuitContext.md)\<`PS`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:198

Entry point for constructing the [CircuitContext](../interfaces/CircuitContext.md) to pass as an argument to a circuit. Always use this
function to set up the initial circuit context.

## Type Parameters

### PS

`PS`

## Parameters

### circuitId

[`CircuitId`](../type-aliases/CircuitId.md)

The name of the circuit being executed.

### contractAddress

[`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)

The address of the contract defining the circuit being executed.

### coinPublicKeyOrZswapState

[`CoinPublicKey`](../../onchain-runtime/type-aliases/CoinPublicKey.md) \| [`EncodedCoinPublicKey`](../interfaces/EncodedCoinPublicKey.md) \| [`ZswapLocalState`](../interfaces/ZswapLocalState.md) \| [`EncodedZswapLocalState`](../interfaces/EncodedZswapLocalState.md)

The initial Zswap local state information - used for tracking shielded coin transfers.

### contractState

[`ContractState`](../../onchain-runtime/classes/ContractState.md) \| [`StateValue`](../../onchain-runtime/classes/StateValue.md) \| [`ChargedState`](../../onchain-runtime/classes/ChargedState.md)

The initial ledger state to execute the contract again - most often a snapshot fetched from the chain.

### privateState

`PS`

The initial witness / private state to execute the contract again - most often a snapshot fetched
                    from local storage.

### stateProvider?

[`ContractStateProvider`](../interfaces/ContractStateProvider.md)

The provider to use to dynamically fetch on-chain contract state. This is only used to execute
                     cross-contract calls, and is not needed if the circuit being executed does not perform any
                     cross-contract calls.

### gasLimit?

[`RunningCost`](../../onchain-runtime/type-aliases/RunningCost.md)

The maximum gas this contract should consume.

### costModel?

[`CostModel`](../../onchain-runtime/classes/CostModel.md)

The model capturing how much ledger operations cost.

### time?

`number`

The current time. Used to execute the block time related kernel operations.

### parentBlockHash?

`string`

The hash of the block the transaction is being built on. Also passed to [ContractStateProvider](../interfaces/ContractStateProvider.md)
                       to fetch the correct contract states when executing cross-contract calls.

### reentrancyGuard?

`boolean`

When `true`, cross-contract calls that re-enter a contract already executing on the call
                       stack (`A -> A`, or `A -> B -> A`) throw instead of running. On by default; pass `false`
                       to opt out.

## Returns

[`CircuitContext`](../interfaces/CircuitContext.md)\<`PS`\>
