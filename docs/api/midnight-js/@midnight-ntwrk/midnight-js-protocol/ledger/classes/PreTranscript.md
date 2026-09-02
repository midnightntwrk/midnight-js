[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / PreTranscript

# Class: PreTranscript

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2623

A transcript prior to partitioning, consisting of the context to run it in, the program that
will make up the transcript, and optionally a communication commitment to bind calls together.

## Constructors

### Constructor

> **new PreTranscript**(`context`, `program`, `comm_comm?`): `PreTranscript`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2624

#### Parameters

##### context

[`QueryContext`](QueryContext.md)

##### program

[`Op`](../type-aliases/Op.md)\<[`AlignedValue`](../type-aliases/AlignedValue.md)\>[]

##### comm\_comm?

`string`

#### Returns

`PreTranscript`

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2626

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
