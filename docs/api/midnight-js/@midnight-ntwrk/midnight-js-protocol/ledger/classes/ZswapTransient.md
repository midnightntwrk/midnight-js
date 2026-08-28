[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapTransient

# Class: ZswapTransient\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3199

A shielded "transient"; an output that is immediately spent within the same
transaction

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### commitment

> `readonly` **commitment**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3218

The commitment of the transient

***

### contractAddress

> `readonly` **contractAddress**: `string` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3222

The contract address creating the transient, if applicable

***

### inputProof

> `readonly` **inputProof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3230

The input proof of this transient

***

### nullifier

> `readonly` **nullifier**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3226

The nullifier of the transient

***

### outputProof

> `readonly` **outputProof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3234

The output proof of this transient

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3209

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3213

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`P`\>(`markerP`, `raw`): `ZswapTransient`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3211

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`ZswapTransient`\<`P`\>

***

### newFromContractOwnedOutput()

> `static` **newFromContractOwnedOutput**(`coin`, `segment`, `output`): [`UnprovenTransient`](../type-aliases/UnprovenTransient.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3207

Creates a new contract-owned transient, from a given output and its coin.

The [QualifiedShieldedCoinInfo](../type-aliases/QualifiedShieldedCoinInfo.md) should have an `mt_index` of `0`

#### Parameters

##### coin

[`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)

##### segment

`number` \| `undefined`

##### output

[`UnprovenOutput`](../type-aliases/UnprovenOutput.md)

#### Returns

[`UnprovenTransient`](../type-aliases/UnprovenTransient.md)
