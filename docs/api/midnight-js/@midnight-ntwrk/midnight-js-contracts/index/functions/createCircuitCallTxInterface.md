[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createCircuitCallTxInterface

# Function: createCircuitCallTxInterface()

## Call Signature

> **createCircuitCallTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId`): [`CircuitCallTxInterface`](../namespaces/Ledger8/type-aliases/CircuitCallTxInterface.md)\<`C`\>

Creates a [CircuitCallTxInterface](../type-aliases/CircuitCallTxInterface.md), or the retained era's `Ledger8.CircuitCallTxInterface`
for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

The providers to use to build transactions.

#### compiledContract

`C`

The contract to use to execute circuits.

#### contractAddress

`string`

The ledger address of the contract.

#### privateStateId

`string` \| `undefined`

The identifier of the state of the witnesses of the contract,
or `undefined` for a contract that carries none.

### Returns

[`CircuitCallTxInterface`](../namespaces/Ledger8/type-aliases/CircuitCallTxInterface.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` is neither a ledger 8 contract nor a
ledger 9 `CompiledContract`, including a ledger 9 contract that is not wrapped in one.

## Call Signature

> **createCircuitCallTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId`): [`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

Creates a [CircuitCallTxInterface](../type-aliases/CircuitCallTxInterface.md), or the retained era's `Ledger8.CircuitCallTxInterface`
for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

The providers to use to build transactions.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract to use to execute circuits.

#### contractAddress

`string`

The ledger address of the contract.

#### privateStateId

`string` \| `undefined`

The identifier of the state of the witnesses of the contract,
or `undefined` for a contract that carries none.

### Returns

[`CircuitCallTxInterface`](../type-aliases/CircuitCallTxInterface.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` is neither a ledger 8 contract nor a
ledger 9 `CompiledContract`, including a ledger 9 contract that is not wrapped in one.
