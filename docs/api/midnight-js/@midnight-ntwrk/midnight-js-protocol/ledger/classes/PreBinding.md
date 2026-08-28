[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / PreBinding

# Class: PreBinding

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1213

Information that will be used to bind an [Intent](Intent.md) in the future, but
does not yet prevent modification of it.

## Constructors

### Constructor

> **new PreBinding**(`data`): `PreBinding`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1214

#### Parameters

##### data

`String`

#### Returns

`PreBinding`

## Properties

### instance

> **instance**: `"pre-binding"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1218

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1215

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1217

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `PreBinding`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1216

#### Parameters

##### raw

`Uint8Array`

#### Returns

`PreBinding`
