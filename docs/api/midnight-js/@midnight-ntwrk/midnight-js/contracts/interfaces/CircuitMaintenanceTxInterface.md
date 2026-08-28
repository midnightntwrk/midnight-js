[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CircuitMaintenanceTxInterface

# Interface: CircuitMaintenanceTxInterface

Defined in: packages/contracts/dist/index.d.ts:264

An interface for creating maintenance transactions for a specific circuit defined in a
given contract.

## Methods

### insertVerifierKey()

> **insertVerifierKey**(`newVk`): `Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>

Defined in: packages/contracts/dist/index.d.ts:276

Constructs and submits a transaction that adds a new verifier key to the
blockchain for this circuit at this contract's address.

#### Parameters

##### newVk

[`VerifierKey`](../../types/type-aliases/VerifierKey.md)

The new verifier key to add for this circuit.

#### Returns

`Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>

***

### removeVerifierKey()

> **removeVerifierKey**(): `Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>

Defined in: packages/contracts/dist/index.d.ts:269

Constructs and submits a transaction that removes the current verifier key stored
on the blockchain for this circuit at this contract's address.

#### Returns

`Promise`\<[`FinalizedTxData`](../../types/interfaces/FinalizedTxData.md)\>
