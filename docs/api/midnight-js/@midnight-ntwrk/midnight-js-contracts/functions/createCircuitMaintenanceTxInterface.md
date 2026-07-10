[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / createCircuitMaintenanceTxInterface

# Function: createCircuitMaintenanceTxInterface()

> **createCircuitMaintenanceTxInterface**\<`C`, `PCK`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`): [`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)

Creates a [CircuitMaintenanceTxInterface](../interfaces/CircuitMaintenanceTxInterface.md).

## Type Parameters

### C

`C` *extends* `Any`

### PCK

`PCK` *extends* `string`

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, `PCK`\>

The providers to use to create and submit transactions.

### circuitId

`PCK`

The circuit ID the interface is for.

### compiledContract

`CompiledContract`\<`C`, `any`\>

### contractAddress

`string`

The address of the deployed contract for which this
                       interface is being created.

## Returns

[`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)
