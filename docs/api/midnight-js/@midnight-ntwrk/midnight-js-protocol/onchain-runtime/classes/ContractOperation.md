[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / ContractOperation

# Class: ContractOperation

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:749

An individual operation, or entry point of a contract, consisting primarily
of a ZK verifier keys, potentially for different versions of the proving
system.

Only the latest available version is exposed to this API.

Note that the serialized form of the key is checked on initialization

## Constructors

### Constructor

> **new ContractOperation**(): `ContractOperation`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:750

#### Returns

`ContractOperation`

## Properties

### verifierKey

> **verifierKey**: `Uint8Array`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:752

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:754

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:758

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `ContractOperation`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:756

#### Parameters

##### raw

`Uint8Array`

#### Returns

`ContractOperation`
