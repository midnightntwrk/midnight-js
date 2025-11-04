[**@midnight-ntwrk/testkit-js v3.0.0**](../README.md)

***

Provider class that implements wallet functionality for the Midnight network.
Handles transaction balancing, submission, and wallet state management.

## Implements

- `MidnightProvider`
- `WalletProvider`

## Properties

### dustSecretKey

> `readonly` **dustSecretKey**: `DustSecretKey`

A readonly property that stores the secret key used for dust operations.

#### Implementation of

`WalletProvider.dustSecretKey`

***

### env

> `readonly` **env**: [`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

***

### logger

> **logger**: `Logger`

***

### wallet

> `readonly` **wallet**: `WalletFacade`

***

### zswapSecretKeys

> `readonly` **zswapSecretKeys**: `ZswapSecretKeys`

Represents a readonly property that stores secret keys used for Zswap encryption or authentication.

#### Implementation of

`WalletProvider.zswapSecretKeys`

## Methods

### balanceTx()

> **balanceTx**(`tx`, `_newCoins`, `ttl`): `Promise`\<`ProvingRecipe`\<`FinalizedTransaction` \| `UnprovenTransaction`\>\>

Balances a transaction

#### Parameters

##### tx

`UnprovenTransaction`

The transaction to balance.

##### \_newCoins

`ShieldedCoinInfo`[]

##### ttl

`Date` = `...`

#### Returns

`Promise`\<`ProvingRecipe`\<`FinalizedTransaction` \| `UnprovenTransaction`\>\>

#### Implementation of

`WalletProvider.balanceTx`

***

### finalizeTx()

> **finalizeTx**(`recipe`): `Promise`\<`FinalizedTransaction`\>

Finalizes the given transaction to complete its processing.

#### Parameters

##### recipe

`ProvingRecipe`\<`FinalizedTransaction`\>

#### Returns

`Promise`\<`FinalizedTransaction`\>

A promise that resolves to the finalized transaction object.

#### Implementation of

`WalletProvider.finalizeTx`

***

### start()

> **start**(`waitForFundsInWallet`, `tokenType`): `Promise`\<`void`\>

#### Parameters

##### waitForFundsInWallet

`boolean` = `true`

##### tokenType

`TokenType` = `...`

#### Returns

`Promise`\<`void`\>

***

### stop()

> **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### submitTx()

> **submitTx**(`tx`): `Promise`\<`string`\>

Submit a transaction to the network to be consensed upon.

#### Parameters

##### tx

`FinalizedTransaction`

The finalized transaction to submit.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction.

#### Implementation of

`MidnightProvider.submitTx`

***

### build()

> `static` **build**(`logger`, `env`, `seed?`): `Promise`\<`MidnightWalletProvider`\>

#### Parameters

##### logger

`Logger`

##### env

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

##### seed?

`string`

#### Returns

`Promise`\<`MidnightWalletProvider`\>

***

### withWallet()

> `static` **withWallet**(`logger`, `env`, `wallet`, `zswapSecretKeys`, `dustSecretKey`): `Promise`\<`MidnightWalletProvider`\>

#### Parameters

##### logger

`Logger`

##### env

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

##### wallet

`WalletFacade`

##### zswapSecretKeys

`ZswapSecretKeys`

##### dustSecretKey

`DustSecretKey`

#### Returns

`Promise`\<`MidnightWalletProvider`\>
