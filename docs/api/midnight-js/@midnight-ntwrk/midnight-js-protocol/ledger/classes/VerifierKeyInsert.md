[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / VerifierKeyInsert

# Class: VerifierKeyInsert

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2276

An update instruction to insert a verifier key at a specific operation and
version.

## Constructors

### Constructor

> **new VerifierKeyInsert**(`operation`, `vk`): `VerifierKeyInsert`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2277

#### Parameters

##### operation

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

##### vk

[`ContractOperationVersionedVerifierKey`](ContractOperationVersionedVerifierKey.md)

#### Returns

`VerifierKeyInsert`

## Properties

### operation

> `readonly` **operation**: `string` \| `Uint8Array`\<`ArrayBufferLike`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2279

***

### vk

> `readonly` **vk**: [`ContractOperationVersionedVerifierKey`](ContractOperationVersionedVerifierKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2280

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2282

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
