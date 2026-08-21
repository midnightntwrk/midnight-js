[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapOffer

# Class: ZswapOffer\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3296

A full Zswap offer; the zswap part of a transaction

Consists of sets of [ZswapInput](ZswapInput.md)s, [ZswapOutput](ZswapOutput.md)s, and [ZswapTransient](ZswapTransient.md)s,
as well as a [deltas](#deltas) vector of the transaction value

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### deltas

> `readonly` **deltas**: `Map`\<`string`, `bigint`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3337

The value of this offer for each token type; note that this may be
negative

This is input coin values - output coin values, for value vectors

***

### inputs

> `readonly` **inputs**: [`ZswapInput`](ZswapInput.md)\<`P`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3341

The inputs this offer is composed of

***

### outputs

> `readonly` **outputs**: [`ZswapOutput`](ZswapOutput.md)\<`P`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3345

The outputs this offer is composed of

***

### transients

> `readonly` **transients**: [`ZswapTransient`](ZswapTransient.md)\<`P`\>[]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3349

The transients this offer is composed of

## Methods

### merge()

> **merge**(`other`): `ZswapOffer`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3323

Combine this offer with another

#### Parameters

##### other

`ZswapOffer`\<`P`\>

#### Returns

`ZswapOffer`\<`P`\>

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3325

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3329

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`P`\>(`markerP`, `raw`): `ZswapOffer`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3327

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`ZswapOffer`\<`P`\>

***

### fromInput()

> `static` **fromInput**\<`P`\>(`input`, `type_?`, `value?`): `ZswapOffer`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3305

Creates a singleton offer, from an [ZswapInput](ZswapInput.md) and its value
vector

The `type_` and `value` parameters are deprecated and will be ignored.

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### input

[`ZswapInput`](ZswapInput.md)\<`P`\>

##### type\_?

`string`

##### value?

`bigint`

#### Returns

`ZswapOffer`\<`P`\>

***

### fromOutput()

> `static` **fromOutput**\<`P`\>(`output`, `type_?`, `value?`): `ZswapOffer`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3313

Creates a singleton offer, from an [ZswapOutput](ZswapOutput.md) and its value
vector

The `type_` and `value` parameters are deprecated and will be ignored.

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### output

[`ZswapOutput`](ZswapOutput.md)\<`P`\>

##### type\_?

`string`

##### value?

`bigint`

#### Returns

`ZswapOffer`\<`P`\>

***

### fromTransient()

> `static` **fromTransient**\<`P`\>(`transient`): `ZswapOffer`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3318

Creates a singleton offer, from a [ZswapTransient](ZswapTransient.md)

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### transient

[`ZswapTransient`](ZswapTransient.md)\<`P`\>

#### Returns

`ZswapOffer`\<`P`\>
