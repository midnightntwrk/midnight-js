[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitMaintenanceTxInterfaces

# Variable: createCircuitMaintenanceTxInterfaces

> `const` **createCircuitMaintenanceTxInterfaces**: \<`C`\>(`providers`, `compiledContract`, `contractAddress`) => [`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>

Defined in: packages/contracts/dist/index.d.ts:300

Creates a [CircuitMaintenanceTxInterfaces](../type-aliases/CircuitMaintenanceTxInterfaces.md).

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

The providers to use to build transactions.

### compiledContract

[`CompiledContract.CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract to use to execute circuits.

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

The ledger address of the contract.

## Returns

[`CircuitMaintenanceTxInterfaces`](../type-aliases/CircuitMaintenanceTxInterfaces.md)\<`C`\>
