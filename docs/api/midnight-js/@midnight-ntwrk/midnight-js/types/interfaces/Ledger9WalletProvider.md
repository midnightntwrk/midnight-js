[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger9WalletProvider

# Interface: Ledger9WalletProvider

A [WalletProvider](WalletProvider.md) written against the v9 ledger runtime only.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)\>

#### Parameters

##### tx

[`Ledger9UnboundTransaction`](../type-aliases/Ledger9UnboundTransaction.md)

##### ttl?

`Date`

#### Returns

`Promise`\<[`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)\>

***

### getCoinPublicKey()

> **getCoinPublicKey**(): `string`

#### Returns

`string`

***

### getEncryptionPublicKey()

> **getEncryptionPublicKey**(): `string`

#### Returns

`string`
