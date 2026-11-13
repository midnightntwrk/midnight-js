[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger9WalletProvider

# Interface: Ledger9WalletProvider

A [WalletProvider](WalletProvider.md) written against the v9 ledger runtime only.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<[`TransactionAnswer`](../type-aliases/TransactionAnswer.md)\>

#### Parameters

##### tx

[`LedgerTransaction`](../classes/LedgerTransaction.md)\<`"Unbound"`, `"v9"`\>

##### ttl?

`Date`

#### Returns

`Promise`\<[`TransactionAnswer`](../type-aliases/TransactionAnswer.md)\>

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
