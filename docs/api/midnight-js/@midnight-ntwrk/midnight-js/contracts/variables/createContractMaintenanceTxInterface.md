[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createContractMaintenanceTxInterface

# Variable: createContractMaintenanceTxInterface

> `const` **createContractMaintenanceTxInterface**: \<`C`\>(`providers`, `compiledContract`, `contractAddress`) => [`ContractMaintenanceTxInterface`](../interfaces/ContractMaintenanceTxInterface.md)

Defined in: packages/contracts/dist/index.d.ts:321

Creates a [ContractMaintenanceTxInterface](../interfaces/ContractMaintenanceTxInterface.md).

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Parameters

### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)

The providers to use to build transactions.

### compiledContract

[`CompiledContract.CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

### contractAddress

[`ContractAddress$1`](https://github.com/midnightntwrk/midnight-ledger)

The ledger address of the contract.

## Returns

[`ContractMaintenanceTxInterface`](../interfaces/ContractMaintenanceTxInterface.md)
