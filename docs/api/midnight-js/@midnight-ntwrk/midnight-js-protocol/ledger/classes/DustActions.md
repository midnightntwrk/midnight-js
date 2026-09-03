[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustActions

# Class: DustActions\<S, P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1560

## Type Parameters

### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Constructors

### Constructor

> **new DustActions**\<`S`, `P`\>(`markerS`, `markerP`, `ctime`, `spends?`, `registrations?`): `DustActions`\<`S`, `P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1561

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### markerP

`P`\[`"instance"`\]

##### ctime

`Date`

##### spends?

[`DustSpend`](DustSpend.md)\<`P`\>[]

##### registrations?

[`DustRegistration`](DustRegistration.md)\<`S`\>[]

#### Returns

`DustActions`\<`S`, `P`\>

## Properties

### ctime

> **ctime**: `Date`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1567

***

### registrations

> **registrations**: [`DustRegistration`](DustRegistration.md)\<`S`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1566

***

### spends

> **spends**: [`DustSpend`](DustSpend.md)\<`P`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1565

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1562

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1564

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`S`, `P`\>(`markerS`, `markerP`, `raw`): `DustActions`\<`S`, `P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1563

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`DustActions`\<`S`, `P`\>
