[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustSpend

# Class: DustSpend\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1538

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### newCommitment

> `readonly` **newCommitment**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1545

***

### oldNullifier

> `readonly` **oldNullifier**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1544

***

### proof

> `readonly` **proof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1546

***

### vFee

> `readonly` **vFee**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1543

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1540

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1542

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`P`\>(`markerP`, `raw`): `DustSpend`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1541

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`DustSpend`\<`P`\>
