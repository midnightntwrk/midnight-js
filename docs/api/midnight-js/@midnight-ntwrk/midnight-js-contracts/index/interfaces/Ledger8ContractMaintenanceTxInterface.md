[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8ContractMaintenanceTxInterface

# Interface: Ledger8ContractMaintenanceTxInterface

Maintenance updates for a whole retained-era contract, bound to one address: the retained era's
counterpart of `Ledger9ContractMaintenanceTxInterface`.

## Methods

### replaceAuthority()

> **replaceAuthority**(`newAuthority`): `Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>

Replaces the contract's maintenance authority with one built from `newAuthority`, and stores
that key for the address once the chain has recorded the replacement.

#### Parameters

##### newAuthority

[`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The new authority's key: a `schnorr` key, as every ledger 8 key is.

#### Returns

`Promise`\<[`Ledger8FinalizedMaintenanceTxData`](Ledger8FinalizedMaintenanceTxData.md)\>
