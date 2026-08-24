[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / Event

# Class: Event

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1379

An event emitted by the ledger

## Properties

### content

> `readonly` **content**: [`EventDetails`](../type-aliases/EventDetails.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1385

***

### source

> `readonly` **source**: [`EventSource`](../type-aliases/EventSource.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1384

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1381

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1383

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**(`raw`): `Event`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1382

#### Parameters

##### raw

`Uint8Array`

#### Returns

`Event`
