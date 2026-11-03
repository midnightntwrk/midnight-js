[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / createCircuitMaintenanceTxInterface

# Function: createCircuitMaintenanceTxInterface()

## Call Signature

> **createCircuitMaintenanceTxInterface**\<`C`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`): [`Ledger8CircuitMaintenanceTxInterface`](../interfaces/Ledger8CircuitMaintenanceTxInterface.md)

Creates a [Ledger9CircuitMaintenanceTxInterface](../interfaces/Ledger9CircuitMaintenanceTxInterface.md), or the retained era's
`Ledger8CircuitMaintenanceTxInterface` for a contract the retained Compact toolchain produced.

The contract's shape only picks which overload each method calls; the era itself is resolved by
that call, when the method runs.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

The providers to use to create and submit transactions.

#### circuitId

[`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>

The circuit ID the interface is for.

#### compiledContract

`C`

The contract the circuit belongs to.

#### contractAddress

`string`

The address of the deployed contract for which this
                       interface is being created.

### Returns

[`Ledger8CircuitMaintenanceTxInterface`](../interfaces/Ledger8CircuitMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.

## Call Signature

> **createCircuitMaintenanceTxInterface**\<`C`, `PCK`\>(`providers`, `circuitId`, `compiledContract`, `contractAddress`): [`Ledger9CircuitMaintenanceTxInterface`](../interfaces/Ledger9CircuitMaintenanceTxInterface.md)

Creates a [Ledger9CircuitMaintenanceTxInterface](../interfaces/Ledger9CircuitMaintenanceTxInterface.md), or the retained era's
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

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, `PCK`\>

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

[`Ledger9CircuitMaintenanceTxInterface`](../interfaces/Ledger9CircuitMaintenanceTxInterface.md)

### Throws

InvalidArgumentError If `contractAddress` is malformed.

### Throws

EraArtifactMismatchError If `compiledContract` has neither toolchain's shape.
