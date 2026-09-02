[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / TransactionResult

# Class: TransactionResult

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2200

The result status of applying a transaction.
Includes an error message if the transaction failed, or partially failed.

## Properties

### error?

> `readonly` `optional` **error?**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2205

***

### events

> `readonly` **events**: [`Event`](Event.md)[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2206

***

### successfulSegments?

> `readonly` `optional` **successfulSegments?**: `Map`\<`number`, `boolean`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2204

***

### type

> `readonly` **type**: `"success"` \| `"partialSuccess"` \| `"failure"`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2203

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2208

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
