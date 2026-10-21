[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / createCircuitMaintenanceTxInterface

# Function: createCircuitMaintenanceTxInterface()

## Call Signature

> **createCircuitMaintenanceTxInterface**\<`C`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`): [`CircuitMaintenanceTxInterface`](../namespaces/Ledger8/interfaces/CircuitMaintenanceTxInterface.md)

Creates a [CircuitMaintenanceTxInterface](../interfaces/CircuitMaintenanceTxInterface.md), or the retained era's
`Ledger8CircuitMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

The contract's shape only picks which overload each method calls; the era itself is resolved by
that call, when the method runs.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

The providers to use to create and submit transactions.

#### circuitId

[`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>

The circuit ID the interface is for.

#### compiledContract

`C`

The contract the circuit belongs to.

#### contractAddress

`string`

The address of the deployed contract for which this
                       interface is being created.

### Returns

[`CircuitMaintenanceTxInterface`](../namespaces/Ledger8/interfaces/CircuitMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.

## Call Signature

> **createCircuitMaintenanceTxInterface**\<`C`, `PCK`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`): [`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)

Creates a [CircuitMaintenanceTxInterface](../interfaces/CircuitMaintenanceTxInterface.md), or the retained era's
`Ledger8CircuitMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

The contract's shape only picks which overload each method calls; the era itself is resolved by
that call, when the method runs.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

#### PCK

`PCK` *extends* `string`

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, `PCK`\>

The providers to use to create and submit transactions.

#### circuitId

`PCK`

The circuit ID the interface is for.

#### compiledContract

[`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The contract the circuit belongs to.

#### contractAddress

`string`

The address of the deployed contract for which this
                       interface is being created.

### Returns

[`CircuitMaintenanceTxInterface`](../interfaces/CircuitMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.
