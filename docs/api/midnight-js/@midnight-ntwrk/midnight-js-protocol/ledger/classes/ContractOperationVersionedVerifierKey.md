[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ContractOperationVersionedVerifierKey

# Class: ContractOperationVersionedVerifierKey

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2238

A versioned verifier key to be associated with a [ContractOperation](ContractOperation.md).

## Constructors

### Constructor

> **new ContractOperationVersionedVerifierKey**(`version`, `rawVk`): `ContractOperationVersionedVerifierKey`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2239

#### Parameters

##### version

`"v3"` \| `"v4"`

##### rawVk

`Uint8Array`

#### Returns

`ContractOperationVersionedVerifierKey`

## Properties

### rawVk

> `readonly` **rawVk**: `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2242

***

### version

> `readonly` **version**: `"v3"` \| `"v4"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2241

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2244

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
