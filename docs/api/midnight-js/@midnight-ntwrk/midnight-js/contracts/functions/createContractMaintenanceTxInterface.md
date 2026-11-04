[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createContractMaintenanceTxInterface

# Function: createContractMaintenanceTxInterface()

## Call Signature

> **createContractMaintenanceTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`Ledger8ContractMaintenanceTxInterface`](../interfaces/Ledger8ContractMaintenanceTxInterface.md)

Creates a [Ledger9ContractMaintenanceTxInterface](../interfaces/Ledger9ContractMaintenanceTxInterface.md), or the retained era's
`Ledger8ContractMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

The providers to use to build transactions.

#### compiledContract

`C`

The contract the interface is for.

#### contractAddress

`string`

The ledger address of the contract.

### Returns

[`Ledger8ContractMaintenanceTxInterface`](../interfaces/Ledger8ContractMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraMismatchError If `compiledContract` has neither toolchain's shape.

## Call Signature

> **createContractMaintenanceTxInterface**\<`C`\>(`providers`, `compiledContract`, `contractAddress`): [`Ledger9ContractMaintenanceTxInterface`](../interfaces/Ledger9ContractMaintenanceTxInterface.md)

Creates a [Ledger9ContractMaintenanceTxInterface](../interfaces/Ledger9ContractMaintenanceTxInterface.md), or the retained era's
`Ledger8ContractMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)

The providers to use to build transactions.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract the interface is for.

#### contractAddress

`string`

The ledger address of the contract.

### Returns

[`Ledger9ContractMaintenanceTxInterface`](../interfaces/Ledger9ContractMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraMismatchError If `compiledContract` has neither toolchain's shape.
