[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8CircuitMaintenanceTxInterface

# Interface: Ledger8CircuitMaintenanceTxInterface

Maintenance updates for one circuit of a retained-era contract, bound to one address: the
retained era's counterpart of `Ledger9CircuitMaintenanceTxInterface`.

## Methods

### insertVerifierKey()

> **insertVerifierKey**(`newVk`): `Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>

Inserts a verifier key for this circuit into a slot that holds none.

#### Parameters

##### newVk

[`VerifierKey`](../../types/type-aliases/VerifierKey.md)

The verifier key to insert.

#### Returns

`Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>

***

### removeVerifierKey()

> **removeVerifierKey**(): `Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>

Removes the verifier key the contract holds for this circuit.

#### Returns

`Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>
