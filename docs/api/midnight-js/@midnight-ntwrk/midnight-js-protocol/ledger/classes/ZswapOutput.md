[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapOutput

# Class: ZswapOutput\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3155

A shielded transaction output

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### commitment

> `readonly` **commitment**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3184

The commitment of the output

***

### contractAddress

> `readonly` **contractAddress**: `string` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3188

The contract address receiving the output, if the recipient is a contract

***

### proof

> `readonly` **proof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3192

The proof of this output

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3175

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3179

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`P`\>(`markerP`, `raw`): `ZswapOutput`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3177

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`ZswapOutput`\<`P`\>

***

### new()

> `static` **new**(`coin`, `segment`, `target_cpk`, `target_epk`): [`UnprovenOutput`](../type-aliases/UnprovenOutput.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3165

Creates a new output, targeted to a user's coin public key.

Optionally the output contains a ciphertext encrypted to the user's
encryption public key, which may be omitted *only* if the [ShieldedCoinInfo](../type-aliases/ShieldedCoinInfo.md)
is transferred to the recipient another way

#### Parameters

##### coin

[`ShieldedCoinInfo`](../type-aliases/ShieldedCoinInfo.md)

##### segment

`number` \| `undefined`

##### target\_cpk

`string`

##### target\_epk

`string`

#### Returns

[`UnprovenOutput`](../type-aliases/UnprovenOutput.md)

***

### newContractOwned()

> `static` **newContractOwned**(`coin`, `segment`, `contract`): [`UnprovenOutput`](../type-aliases/UnprovenOutput.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3173

Creates a new output, targeted to a smart contract

A contract must *also* explicitly receive a coin created in this way for
the output to be valid

#### Parameters

##### coin

[`ShieldedCoinInfo`](../type-aliases/ShieldedCoinInfo.md)

##### segment

`number` \| `undefined`

##### contract

`string`

#### Returns

[`UnprovenOutput`](../type-aliases/UnprovenOutput.md)
