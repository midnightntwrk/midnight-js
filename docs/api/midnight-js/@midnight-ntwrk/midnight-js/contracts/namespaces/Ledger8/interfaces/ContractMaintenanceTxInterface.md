[**Midnight.js API Reference v5.0.0-rc.5**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / ContractMaintenanceTxInterface

# Interface: ContractMaintenanceTxInterface

Maintenance updates for a whole retained-era contract, bound to one address: the retained era's
counterpart of `ContractMaintenanceTxInterface`.

## Methods

### replaceAuthority()

> **replaceAuthority**(`newAuthority`): `Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>

Replaces the contract's maintenance authority with one built from `newAuthority`, and stores
that key for the address once the chain has recorded the replacement.

#### Parameters

##### newAuthority

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The new authority's key: a `schnorr` key, as every ledger 8 key is.

#### Returns

`Promise`\<[`FinalizedMaintenanceTxData`](FinalizedMaintenanceTxData.md)\>
