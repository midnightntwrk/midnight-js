[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / VerifierKeyRemove

# Class: VerifierKeyRemove

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2263

An update instruction to remove a verifier key of a specific operation and
version.

## Constructors

### Constructor

> **new VerifierKeyRemove**(`operation`, `version`): `VerifierKeyRemove`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2264

#### Parameters

##### operation

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

##### version

[`ContractOperationVersion`](ContractOperationVersion.md)

#### Returns

`VerifierKeyRemove`

## Properties

### operation

> `readonly` **operation**: `string` \| `Uint8Array`\<`ArrayBufferLike`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2266

***

### version

> `readonly` **version**: [`ContractOperationVersion`](ContractOperationVersion.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2267

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2269

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
