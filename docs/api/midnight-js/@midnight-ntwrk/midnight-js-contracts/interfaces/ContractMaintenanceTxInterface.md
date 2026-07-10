[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ContractMaintenanceTxInterface

# Interface: ContractMaintenanceTxInterface

Interface for creating maintenance transactions for a contract that was
deployed.

## Methods

### replaceAuthority()

> **replaceAuthority**(`newAuthority`): `Promise`\<`FinalizedTxData`\>

Constructs and submits a transaction that replaces the maintenance
authority stored on the blockchain for this contract.

#### Parameters

##### newAuthority

`SigningKey`

The new contract maintenance authority for this contract.

#### Returns

`Promise`\<`FinalizedTxData`\>
