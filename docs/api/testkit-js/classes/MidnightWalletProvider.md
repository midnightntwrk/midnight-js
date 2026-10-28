[**@midnight-ntwrk/testkit-js v5.0.0-rc.5**](../README.md)

***

Provider class that implements wallet functionality for the Midnight network.
Handles transaction balancing, submission, and wallet state management.

## Implements

- `MidnightProvider`
- `WalletProvider`

## Properties

### dustSecretKey

> `readonly` **dustSecretKey**: `DustSecretKey`

***

### env

> `readonly` **env**: [`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

***

### logger

> **logger**: `Logger`

***

### seeds

> `readonly` **seeds**: `WalletSeeds`

***

### supportedEras

> `readonly` **supportedEras**: readonly (`"v9"` \| `"v8"`)[]

Both eras, on both providers this class implements.

#### Implementation of

`MidnightProvider.supportedEras`

***

### unshieldedKeystore

> `readonly` **unshieldedKeystore**: `UnshieldedKeystore`

***

### wallet

> `readonly` **wallet**: `WalletFacade`

***

### zswapSecretKeys

> `readonly` **zswapSecretKeys**: `ZswapSecretKeys`

## Methods

### balanceTx()

> **balanceTx**(`tx`, `ttl?`): `Promise`\<`FinalizedTx`\>

Balances and signs a transaction, readying it for submission.

#### Parameters

##### tx

`UnboundTx`

The unbound transaction handle to balance.

##### ttl?

`Date`

Expiry for the intent the wallet adds while balancing. The framework always passes
           a `Date` `providers.config.ttlSeconds` after balancing starts; honour it rather than a
           TTL of your own. Implementation-defined when omitted; the testkit's
           `MidnightWalletProvider` defaults to one hour.

#### Returns

`Promise`\<`FinalizedTx`\>

The balanced, signed transaction handle, in the SAME era as `tx`.

#### Throws

InvalidTransactionHandleError if `tx` is not an unbound handle of this package.

#### Throws

ProviderEraUnsupportedError if the implementation does not serve the handle's era.

#### Throws

ForeignLedgerTransactionError if the balanced transaction is not an object of the
        ledger copy this framework loaded for its era.

#### Throws

InvalidTransactionHandleError if the balanced transaction is not a ledger transaction
        object (`not-a-transaction`) or is not at the Finalized stage (`stage-mismatch`).

#### Implementation of

`WalletProvider.balanceTx`

***

### getCoinPublicKey()

> **getCoinPublicKey**(): `string`

#### Returns

`string`

#### Implementation of

`WalletProvider.getCoinPublicKey`

***

### getEncryptionPublicKey()

> **getEncryptionPublicKey**(): `string`

#### Returns

`string`

#### Implementation of

`WalletProvider.getEncryptionPublicKey`

***

### start()

> **start**(`waitForFundsInWallet?`): `Promise`\<`void`\>

#### Parameters

##### waitForFundsInWallet?

`boolean` = `true`

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

`FinalizedTx`

The finalized transaction handle to submit.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction. A transaction identifier is
         era-independent.

#### Throws

InvalidTransactionHandleError if `tx` is not a finalized handle of this package.

#### Throws

ProviderEraUnsupportedError if the implementation does not serve the handle's era.

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

> `static` **withWallet**(`logger`, `env`, `wallet`, `seeds`, `unshieldedKeystore`): `Promise`\<`MidnightWalletProvider`\>

#### Parameters

##### logger

`Logger`

##### env

[`EnvironmentConfiguration`](../interfaces/EnvironmentConfiguration.md)

##### wallet

`WalletFacade`

##### seeds

`WalletSeeds`

##### unshieldedKeystore

`UnshieldedKeystore`

#### Returns

`Promise`\<`MidnightWalletProvider`\>
