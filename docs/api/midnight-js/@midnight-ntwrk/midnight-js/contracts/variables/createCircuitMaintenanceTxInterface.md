[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitMaintenanceTxInterface

# Variable: createCircuitMaintenanceTxInterface

> `const` **createCircuitMaintenanceTxInterface**: \<`C`, `PCK`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`) => [`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)

Defined in: packages/contracts/dist/index.d.ts:286

Creates a [CircuitMaintenanceTxInterface](../interfaces/CircuitMaintenanceTxInterface.md).

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

### PCK

`PCK` *extends* [`ProvableCircuitId`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/ProvableCircuitId.md)\<`C`\>

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, `PCK`\>

The providers to use to create and submit transactions.

### circuitId

`PCK`

The circuit ID the interface is for.

### compiledContract

[`CompiledContract`](../../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

### contractAddress

[`ContractAddress`](../../../midnight-js-protocol/ledger/type-aliases/ContractAddress.md)

The address of the deployed contract for which this
                       interface is being created.

## Returns

[`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)
