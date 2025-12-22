[**Midnight.js API Reference v3.0.0-alpha.11**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / WalletProvider

# Interface: WalletProvider

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Methods

### balanceTx()

> **balanceTx**(`tx`, `newCoins?`, `ttl?`): `Promise`\<[`BalancedProvingRecipe`](../type-aliases/BalancedProvingRecipe.md)\>

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

`Promise`\<[`BalancedProvingRecipe`](../type-aliases/BalancedProvingRecipe.md)\>

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
