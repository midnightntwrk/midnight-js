[**Midnight.js API Reference v3.0.0**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / WalletProvider

# Interface: WalletProvider

Interface representing a WalletProvider that handles operations such as
transaction balancing and finalization, and provides access to cryptographic secret keys.

## Properties

### dustSecretKey

> `readonly` **dustSecretKey**: `DustSecretKey`

A readonly property that stores the secret key used for dust operations.

***

### zswapSecretKeys

> `readonly` **zswapSecretKeys**: `ZswapSecretKeys`

Represents a readonly property that stores secret keys used for Zswap encryption or authentication.

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

### finalizeTx()

> **finalizeTx**(`tx`): `Promise`\<`FinalizedTransaction`\>

Finalizes the given transaction to complete its processing.

#### Parameters

##### tx

[`ProvingRecipe`](../type-aliases/ProvingRecipe.md)\<`FinalizedTransaction`\>

The transaction object that needs to be finalized.

#### Returns

`Promise`\<`FinalizedTransaction`\>

A promise that resolves to the finalized transaction object.
