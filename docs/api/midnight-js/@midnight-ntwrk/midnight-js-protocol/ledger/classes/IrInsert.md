[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / IrInsert

# Class: IrInsert

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2299

An update instruction to insert IR metadata at a specific operation.

## Constructors

### Constructor

> **new IrInsert**(`operation`, `ir`): `IrInsert`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2300

#### Parameters

##### operation

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

##### ir

`Uint8Array`

#### Returns

`IrInsert`

## Properties

### ir

> `readonly` **ir**: `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2303

***

### operation

> `readonly` **operation**: `string` \| `Uint8Array`\<`ArrayBufferLike`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2302

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2305

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
