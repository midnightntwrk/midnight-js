[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitMaintenanceTxInterface

# Variable: createCircuitMaintenanceTxInterface

> `const` **createCircuitMaintenanceTxInterface**: \<`C`, `PCK`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`) => [`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)

Defined in: packages/contracts/dist/index.d.ts:286

Creates a [CircuitMaintenanceTxInterface](../interfaces/CircuitMaintenanceTxInterface.md).

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, `PCK`\>

The providers to use to create and submit transactions.

### circuitId

`PCK`

The circuit ID the interface is for.

### compiledContract

[`CompiledContract.CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

The address of the deployed contract for which this
                       interface is being created.

## Returns

[`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)
