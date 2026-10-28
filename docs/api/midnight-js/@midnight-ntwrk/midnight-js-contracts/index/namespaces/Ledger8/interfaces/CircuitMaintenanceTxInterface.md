[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CircuitMaintenanceTxInterface

# Interface: CircuitMaintenanceTxInterface

Maintenance updates for one circuit of a retained-era contract, bound to one address: the
retained era's counterpart of `CircuitMaintenanceTxInterface`.

## Methods

### insertVerifierKey()

> **insertVerifierKey**(`newVk`): `Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>

Inserts a verifier key for this circuit into a slot that holds none.

#### Parameters

##### newVk

[`VerifierKey`](../../../../../midnight-js/types/type-aliases/VerifierKey.md)

The verifier key to insert.

#### Returns

`Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>

***

### removeVerifierKey()

> **removeVerifierKey**(): `Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>

Removes the verifier key the contract holds for this circuit.

#### Returns

`Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>
