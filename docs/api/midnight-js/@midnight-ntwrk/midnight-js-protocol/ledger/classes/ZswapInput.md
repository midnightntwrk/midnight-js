[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapInput

# Class: ZswapInput\<P\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3127

A shielded transaction input

## Type Parameters

### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

## Properties

### contractAddress

> `readonly` **contractAddress**: `string` \| `undefined`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3141

The contract address receiving the input, if the sender is a contract

***

### nullifier

> `readonly` **nullifier**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3145

The nullifier of the input

***

### proof

> `readonly` **proof**: `P`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3149

The proof of this input

## Methods

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3132

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3136

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### deserialize()

> `static` **deserialize**\<`P`\>(`markerP`, `raw`): `ZswapInput`\<`P`\>

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3134

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### markerP

`P`\[`"instance"`\]

##### raw

`Uint8Array`

#### Returns

`ZswapInput`\<`P`\>

***

### newContractOwned()

> `static` **newContractOwned**(`coin`, `segment`, `contract`, `state`): [`UnprovenInput`](../type-aliases/UnprovenInput.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:3130

#### Parameters

##### coin

[`QualifiedShieldedCoinInfo`](../type-aliases/QualifiedShieldedCoinInfo.md)

##### segment

`number` \| `undefined`

##### contract

`string`

##### state

[`ZswapChainState`](ZswapChainState.md)

#### Returns

[`UnprovenInput`](../type-aliases/UnprovenInput.md)
