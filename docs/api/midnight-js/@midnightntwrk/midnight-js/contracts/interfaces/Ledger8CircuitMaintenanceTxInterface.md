[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8CircuitMaintenanceTxInterface

# Interface: Ledger8CircuitMaintenanceTxInterface

Maintenance updates for one circuit of a ledger 8 contract, bound to one address: the
ledger 8 counterpart of `Ledger9CircuitMaintenanceTxInterface`.

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
