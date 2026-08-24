[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / PreProof

# Class: PreProof

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1167

The preimage, or data required to produce, a [Proof](Proof.md).

## Constructors

### Constructor

> **new PreProof**(`data`): `PreProof`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1168

#### Parameters

##### data

`String`

#### Returns

`PreProof`

## Properties

### instance

> **instance**: `"pre-proof"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1172

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1169

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1171

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `PreProof`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1170

#### Parameters

##### raw

`Uint8Array`

#### Returns

`PreProof`
