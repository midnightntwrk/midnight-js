[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ContractCall

# Class: ContractCall\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1972

A single contract call segment

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1980

The address being called

***

### communicationCommitment

> `readonly` **communicationCommitment**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1984

The communication commitment of this call

***

### entryPoint

> `readonly` **entryPoint**: `string` \| `Uint8Array`\<`ArrayBufferLike`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1988

The entry point being called

***

### fallibleTranscript

> `readonly` **fallibleTranscript**: [`Transcript`](../type-aliases/Transcript.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1992

The fallible execution stage transcript

***

### guaranteedTranscript

> `readonly` **guaranteedTranscript**: [`Transcript`](../type-aliases/Transcript.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\> \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1996

The guaranteed execution stage transcript

***

### proof

> `readonly` **proof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2000

The proof attached to this call

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1975

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
