[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustSecretKey

# Class: DustSecretKey

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1472

A secret key for the Dust, used to derive Dust UTxO nonces and prove credentials to spend Dust UTxOs

## Properties

### publicKey

> **publicKey**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1487

## Methods

### clear()

> **clear**(): `void`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1492

Clears the dust secret key, so that it is no longer usable nor held in memory

#### Returns

`void`

***

### fromBigint()

> `static` **fromBigint**(`bigint`): `DustSecretKey`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1479

Temporary method to create an instance of DustSecretKey from a bigint (its natural representation)

#### Parameters

##### bigint

`bigint`

#### Returns

`DustSecretKey`

***

### fromSeed()

> `static` **fromSeed**(`seed`): `DustSecretKey`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1485

Create an instance of DustSecretKey from a seed.

#### Parameters

##### seed

`Uint8Array`

#### Returns

`DustSecretKey`
