[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitCallTxInterface

# Function: createCircuitCallTxInterface()

## Call Signature

> **createCircuitCallTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId`): [`Ledger8CircuitCallTxInterface`](../type-aliases/Ledger8CircuitCallTxInterface.md)\<`C`\>

Creates a [Ledger9CircuitCallTxInterface](../type-aliases/Ledger9CircuitCallTxInterface.md), or the retained era's `Ledger8CircuitCallTxInterface`
for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

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

[`Ledger8CircuitCallTxInterface`](../type-aliases/Ledger8CircuitCallTxInterface.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has the shape of neither a ledger 8
contract nor a ledger 9 `CompiledContract`.

## Call Signature

> **createCircuitCallTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`, `privateStateId`): [`Ledger9CircuitCallTxInterface`](../type-aliases/Ledger9CircuitCallTxInterface.md)\<`C`\>

Creates a [Ledger9CircuitCallTxInterface](../type-aliases/Ledger9CircuitCallTxInterface.md), or the retained era's `Ledger8CircuitCallTxInterface`
for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

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

[`Ledger9CircuitCallTxInterface`](../type-aliases/Ledger9CircuitCallTxInterface.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has the shape of neither a ledger 8
contract nor a ledger 9 `CompiledContract`.
