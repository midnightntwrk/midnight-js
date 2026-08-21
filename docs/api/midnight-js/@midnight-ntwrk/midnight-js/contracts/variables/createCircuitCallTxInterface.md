[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitCallTxInterface

# Variable: createCircuitCallTxInterface

> `const` **createCircuitCallTxInterface**: \<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId`) => [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:844

Creates a circuit call transaction interface for a contract.

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

The providers to use to build transactions.

### compiledContract

[`CompiledContract`](../../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

The contract to use to execute circuits.

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The ledger address of the contract.

### privateStateId

[`PrivateStateId`](../../types/type-aliases/PrivateStateId.md) \| `undefined`

The identifier of the state of the witnesses of the contract.

## Returns

[`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>
