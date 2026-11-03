[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9ContractMaintenanceTxInterface

# Interface: Ledger9ContractMaintenanceTxInterface

Interface for creating maintenance transactions for a contract that was
deployed.

## Methods

### replaceAuthority()

> **replaceAuthority**(`newAuthority`): `Promise`\<[`Ledger9FinalizedMaintenanceTxData`](Ledger9FinalizedMaintenanceTxData.md)\>

Constructs and submits a transaction that replaces the maintenance
authority stored on the blockchain for this contract.

#### Parameters

##### newAuthority

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The new contract maintenance authority for this contract.

#### Returns

`Promise`\<[`Ledger9FinalizedMaintenanceTxData`](Ledger9FinalizedMaintenanceTxData.md)\>
