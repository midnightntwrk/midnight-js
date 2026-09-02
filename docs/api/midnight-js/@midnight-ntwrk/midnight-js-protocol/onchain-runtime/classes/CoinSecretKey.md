[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / CoinSecretKey

# Class: CoinSecretKey

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:119

Holds the coin secret key of a user, serialized as a hex-encoded 32-byte string

## Methods

### clear()

> **clear**(): `void`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:125

Clears the coin secret key, so that it is no longer usable nor held in memory

#### Returns

`void`

***

### yesIKnowTheSecurityImplicationsOfThis\_serialize()

> **yesIKnowTheSecurityImplicationsOfThis\_serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:127

#### Returns

`Uint8Array`

***

### deserialize()

> `static` **deserialize**(`raw`): `CoinSecretKey`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:129

#### Parameters

##### raw

`Uint8Array`

#### Returns

`CoinSecretKey`
