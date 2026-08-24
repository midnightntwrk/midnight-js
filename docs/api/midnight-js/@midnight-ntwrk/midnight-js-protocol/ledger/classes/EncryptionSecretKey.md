[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / EncryptionSecretKey

# Class: EncryptionSecretKey

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2849

Holds the encryption secret key of a user, which may be used to determine if
a given offer contains outputs addressed to this user

## Methods

### clear()

> **clear**(): `void`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2855

Clears the encryption secret key, so that it is no longer usable nor held in memory

#### Returns

`void`

***

### test()

> **test**\<`P`\>(`offer`): `boolean`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2857

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### offer

[`ZswapOffer`](ZswapOffer.md)\<`P`\>

#### Returns

`boolean`

***

### yesIKnowTheSecurityImplicationsOfThis\_serialize()

> **yesIKnowTheSecurityImplicationsOfThis\_serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2859

#### Returns

`Uint8Array`

***

### yesIKnowTheSecurityImplicationsOfThis\_taggedSerialize()

> **yesIKnowTheSecurityImplicationsOfThis\_taggedSerialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2860

#### Returns

`Uint8Array`

***

### deserialize()

> `static` **deserialize**(`raw`): `EncryptionSecretKey`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2862

#### Parameters

##### raw

`Uint8Array`

#### Returns

`EncryptionSecretKey`

***

### taggedDeserialize()

> `static` **taggedDeserialize**(`raw`): `EncryptionSecretKey`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2863

#### Parameters

##### raw

`Uint8Array`

#### Returns

`EncryptionSecretKey`
