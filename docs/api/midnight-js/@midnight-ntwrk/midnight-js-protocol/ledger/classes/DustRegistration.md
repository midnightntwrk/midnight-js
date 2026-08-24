[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / DustRegistration

# Class: DustRegistration\<S\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1549

## Type Parameters

### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

## Constructors

### Constructor

> **new DustRegistration**\<`S`\>(`markerS`, `nightKey`, `dustAddress`, `allowFeePayment`, `signature?`): `DustRegistration`\<`S`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1550

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### nightKey

[`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)

##### dustAddress

`bigint` \| `undefined`

##### allowFeePayment

`bigint`

##### signature?

`S`

#### Returns

`DustRegistration`\<`S`\>

## Properties

### allowFeePayment

> **allowFeePayment**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1556

***

### dustAddress

> **dustAddress**: `bigint` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1555

***

### nightKey

> **nightKey**: [`SignatureVerifyingKey`](../type-aliases/SignatureVerifyingKey.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1554

***

### signature

> **signature**: `S`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1557

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1551

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1553

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`S`\>(`markerS`, `raw`): `DustRegistration`\<`S`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1552

#### Type Parameters

##### S

`S` *extends* [`Signaturish`](../type-aliases/Signaturish.md)

#### Parameters

##### markerS

`S`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`DustRegistration`\<`S`\>
