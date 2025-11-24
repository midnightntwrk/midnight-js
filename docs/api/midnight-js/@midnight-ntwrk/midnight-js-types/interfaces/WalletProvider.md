[**Midnight.js API Reference v3.0.0-alpha.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / WalletProvider

# Interface: WalletProvider

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `newCoins?`, `ttl?`): `Promise`\<[`ProvingRecipe`](../type-aliases/ProvingRecipe.md)\<`FinalizedTransaction` \| `UnprovenTransaction`\>\>

Balances a transaction

#### Parameters

##### tx

`UnprovenTransaction`

The transaction to balance.

##### newCoins?

`ShieldedCoinInfo`[]

##### ttl?

`Date`

#### Returns

`Promise`\<[`ProvingRecipe`](../type-aliases/ProvingRecipe.md)\<`FinalizedTransaction` \| `UnprovenTransaction`\>\>

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
