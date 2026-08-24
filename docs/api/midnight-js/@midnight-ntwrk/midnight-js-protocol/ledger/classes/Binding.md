[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Binding

# Class: Binding

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1200

A Fiat-Shamir proof of exponent binding (or ephemerally signing) an
[Intent](Intent.md).

## Constructors

### Constructor

> **new Binding**(`data`): `Binding`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1201

#### Parameters

##### data

`String`

#### Returns

`Binding`

## Properties

### instance

> **instance**: `"binding"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1205

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1202

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1204

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `Binding`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1203

#### Parameters

##### raw

`Uint8Array`

#### Returns

`Binding`
