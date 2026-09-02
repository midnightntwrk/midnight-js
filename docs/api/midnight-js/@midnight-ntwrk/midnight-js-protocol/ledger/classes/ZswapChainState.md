[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ZswapChainState

# Class: ZswapChainState

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2899

The on-chain state of Zswap, consisting of a Merkle tree of coin
commitments, a set of nullifiers, an index into the Merkle tree, and a set
of valid past Merkle tree roots

## Constructors

### Constructor

> **new ZswapChainState**(): `ZswapChainState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2900

#### Returns

`ZswapChainState`

## Properties

### firstFree

> `readonly` **firstFree**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2907

The first free index in the coin commitment tree

## Methods

### filter()

> **filter**(`contractAddress`): `ZswapChainState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2946

Filters the state to only include coins that are relevant to a given
contract address.

#### Parameters

##### contractAddress

`string`

#### Returns

`ZswapChainState`

***

### postBlockUpdate()

> **postBlockUpdate**(`tblock`, `retentionDuration`): `ZswapChainState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2926

Carries out a post-block update, which does amortized bookkeeping that
only needs to be done once per state change.

Typically, `postBlockUpdate` should be run after any (sequence of)
(system)-transaction application(s).

#### Parameters

##### tblock

`Date`

timestamp of a block last batch of updates was applied at

##### retentionDuration

`bigint`

number of seconds to retain past Merkle tree roots

#### Returns

`ZswapChainState`

***

### serialize()

> **serialize**(): `Uint8Array`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2902

#### Returns

`Uint8Array`

***

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2938

#### Parameters

##### compact?

`boolean`

#### Returns

`string`

***

### tryApply()

> **tryApply**\<`P`\>(`offer`, `whitelist?`): \[`ZswapChainState`, `Map`\<`string`, `bigint`\>\]

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2936

Try to apply an [ZswapOffer](ZswapOffer.md) to the state, returning the updated state
and a map on newly inserted coin commitments to their inserted indices.

#### Type Parameters

##### P

`P` *extends* [`Proofish`](../type-aliases/Proofish.md)

#### Parameters

##### offer

[`ZswapOffer`](ZswapOffer.md)\<`P`\>

##### whitelist?

`Set`\<`string`\>

A set of contract addresses that are of interest. If
set, *only* these addresses are tracked, and all other information is
discarded.

#### Returns

\[`ZswapChainState`, `Map`\<`string`, `bigint`\>\]

***

### deserialize()

> `static` **deserialize**(`raw`): `ZswapChainState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2909

#### Parameters

##### raw

`Uint8Array`

#### Returns

`ZswapChainState`

***

### deserializeFromLedgerState()

> `static` **deserializeFromLedgerState**(`raw`): `ZswapChainState`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:2914

Given a whole ledger serialized state, deserialize only the Zswap portion

#### Parameters

##### raw

`Uint8Array`

#### Returns

`ZswapChainState`
