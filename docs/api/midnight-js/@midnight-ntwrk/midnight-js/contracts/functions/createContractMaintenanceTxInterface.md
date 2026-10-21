[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createContractMaintenanceTxInterface

# Function: createContractMaintenanceTxInterface()

## Call Signature

> **createContractMaintenanceTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`ContractMaintenanceTxInterface`](../namespaces/Ledger8/interfaces/ContractMaintenanceTxInterface.md)

Creates a [ContractMaintenanceTxInterface](../interfaces/ContractMaintenanceTxInterface.md), or the retained era's
`Ledger8ContractMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

The providers to use to build transactions.

#### compiledContract

`C`

The contract the interface is for.

#### contractAddress

`string`

The ledger address of the contract.

### Returns

[`ContractMaintenanceTxInterface`](../namespaces/Ledger8/interfaces/ContractMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.

## Call Signature

> **createContractMaintenanceTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`ContractMaintenanceTxInterface`](../interfaces/ContractMaintenanceTxInterface.md)

Creates a [ContractMaintenanceTxInterface](../interfaces/ContractMaintenanceTxInterface.md), or the retained era's
`Ledger8ContractMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)

The providers to use to build transactions.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract the interface is for.

#### contractAddress

`string`

The ledger address of the contract.

### Returns

[`ContractMaintenanceTxInterface`](../interfaces/ContractMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.
