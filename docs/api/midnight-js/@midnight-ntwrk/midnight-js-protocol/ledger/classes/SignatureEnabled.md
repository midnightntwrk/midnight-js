[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / SignatureEnabled

# Class: SignatureEnabled

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1237

## Constructors

### Constructor

> **new SignatureEnabled**(`data`): `SignatureEnabled`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1238

#### Parameters

##### data

[`Signature`](../type-aliases/Signature.md)

#### Returns

`SignatureEnabled`

## Properties

### instance

> `readonly` **instance**: `"signature"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1242

***

### value

> `readonly` **value**: [`Signature`](../type-aliases/Signature.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1244

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1239

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1241

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `SignatureEnabled`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1240

#### Parameters

##### raw

`Uint8Array`

#### Returns

`SignatureEnabled`
