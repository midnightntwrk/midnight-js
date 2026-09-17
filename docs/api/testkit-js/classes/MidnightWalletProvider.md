[**@midnight-ntwrk/testkit-js v5.0.0-beta.8**](../README.md)

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

Both eras, declared once for both seams this class implements.

Written out rather than assembled from per-era arms, which is the escape
hatch the tagged interfaces deliberately keep open for a class. The two
methods below genuinely run both eras through ONE call each — the wallet
SDK adopts a transaction AT a protocol version, so the era is data flowing
through rather than a branch — and splitting them into arms would duplicate
the balance/sign/finalize sequence to no end.

Read before an operation starts, by `assertSeamsSupportEra`. Frozen for the
same reason the factories freeze their computed declaration: a widened
declaration would let that check pass for an era this wallet cannot serve.

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

> **balanceTx**(`tx`, `ttl?`): `Promise`\<`VersionedFinalizedTransaction`\>

Balances and signs a transaction, readying it for submission.

#### Parameters

##### tx

`VersionedUnboundTransaction`

The version-tagged transaction to balance: `{ version: 'v9', tx }` for a live v9
          ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.

##### ttl?

`Date` = `...`

Time-to-live for the balanced transaction. Implementation-defined when omitted;
           the testkit's `MidnightWalletProvider` defaults to one hour.

#### Returns

`Promise`\<`VersionedFinalizedTransaction`\>

The balanced, signed transaction, version-tagged. Narrow on `version` — or call
         `unwrapV9` — before reading the payload.

#### Throws

V8PayloadUnsupportedError if the implementation does not handle the v8 arm.

#### Throws

UntaggedPayloadError if `version` is missing or unrecognised.

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

`VersionedFinalizedTransaction`

The version-tagged finalized transaction to submit: `{ version: 'v9', tx }` for a
          live v9 ledger object, `{ version: 'v8', txBytes }` for v8-era serialized bytes.

#### Returns

`Promise`\<`string`\>

The transaction identifier of the submitted transaction. Not version-tagged — a
         transaction identifier is era-independent.

#### Throws

V8PayloadUnsupportedError if the implementation does not handle the v8 arm.

#### Throws

UntaggedPayloadError if `version` is missing or unrecognised.

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
