[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitMaintenanceTxInterfaces

# Function: createCircuitMaintenanceTxInterfaces()

## Call Signature

> **createCircuitMaintenanceTxInterfaces**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`CircuitMaintenanceTxInterfaces`](../namespaces/Ledger8/type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

Creates a [CircuitMaintenanceTxInterfaces](../type-aliases/CircuitMaintenanceTxInterfaces.md), or the retained era's
`Ledger8CircuitMaintenanceTxInterfaces` for a contract the retained Compact toolchain produced.

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

### Returns

[`CircuitMaintenanceTxInterfaces`](../namespaces/Ledger8/type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.

## Call Signature

> **createCircuitMaintenanceTxInterfaces**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

Creates a [CircuitMaintenanceTxInterfaces](../type-aliases/CircuitMaintenanceTxInterfaces.md), or the retained era's
`Ledger8CircuitMaintenanceTxInterfaces` for a contract the retained Compact toolchain produced.

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

### Returns

[`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.
