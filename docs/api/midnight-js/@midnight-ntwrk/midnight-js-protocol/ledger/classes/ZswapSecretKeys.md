[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapSecretKeys

# Class: ZswapSecretKeys

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2866

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2888

***

### coinSecretKey

> `readonly` **coinSecretKey**: [`CoinSecretKey`](CoinSecretKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2889

***

### encryptionPublicKey

> `readonly` **encryptionPublicKey**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2890

***

### encryptionSecretKey

> `readonly` **encryptionSecretKey**: [`EncryptionSecretKey`](EncryptionSecretKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2891

## Methods

### clear()

> **clear**(): `void`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2886

Clears the secret keys, so that they are no longer usable nor held in memory
Note: it does not clear copies of the keys - which is particularly relevant for proof preimages
Note: this will cause all other operations to fail

#### Returns

`void`

***

### fromSeed()

> `static` **fromSeed**(`seed`): `ZswapSecretKeys`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2872

Derives secret keys from a 32-byte seed

#### Parameters

##### seed

`Uint8Array`

#### Returns

`ZswapSecretKeys`

***

### fromSeedRng()

> `static` **fromSeedRng**(`seed`): `ZswapSecretKeys`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2878

Derives secret keys from a 32-byte seed using deprecated implementation.
Use only for compatibility purposes

#### Parameters

##### seed

`Uint8Array`

#### Returns

`ZswapSecretKeys`
