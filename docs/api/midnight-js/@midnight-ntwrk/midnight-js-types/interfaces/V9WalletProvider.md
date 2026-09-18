[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / V9WalletProvider

# Interface: V9WalletProvider

A [WalletProvider](WalletProvider.md) written against the v9 ledger runtime only — the
shape an implementation had before the seams became version-tagged.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`FinalizedTransaction`](https://github.com/midnightntwrk/midnight-ledger)\>

#### Parameters

##### tx

[`UnboundTransaction`](../type-aliases/UnboundTransaction.md)

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
