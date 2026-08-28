[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustState

# Class: DustState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1611

## Constructors

### Constructor

> **new DustState**(): `DustState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1612

#### Returns

`DustState`

## Properties

### generation

> `readonly` **generation**: [`DustGenerationState`](DustGenerationState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1617

***

### utxo

> `readonly` **utxo**: [`DustUtxoState`](DustUtxoState.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1616

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1613

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1615

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `DustState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1614

#### Parameters

##### raw

`Uint8Array`

#### Returns

`DustState`
