[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / WalletProvider

# Interface: WalletProvider

Defined in: packages/types/dist/index.d.ts:1266

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`FinalizedTransaction`](../../../midnight-js-protocol/ledger/type-aliases/FinalizedTransaction.md)\>

Defined in: packages/types/dist/index.d.ts:1272

Balances a transaction

#### Parameters

##### tx

[`UnboundTransaction`](../type-aliases/UnboundTransaction.md)

The transaction to balance.

##### ttl?

`Date`

#### Returns

`Promise`\<[`FinalizedTransaction`](../../../midnight-js-protocol/ledger/type-aliases/FinalizedTransaction.md)\>

***

### getCoinPublicKey()

> **getCoinPublicKey**(): `string`

Defined in: packages/types/dist/index.d.ts:1273

#### Returns

`string`

***

### getEncryptionPublicKey()

> **getEncryptionPublicKey**(): `string`

Defined in: packages/types/dist/index.d.ts:1274

#### Returns

`string`
