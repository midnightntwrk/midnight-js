[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / EncodedQualifiedShieldedCoinInfo

# Interface: EncodedQualifiedShieldedCoinInfo

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:84

A QualifiedCoinInfo with its fields encoded as byte strings. This representation is used internally by
the contract executable.

## Extends

- [`EncodedShieldedCoinInfo`](EncodedShieldedCoinInfo.md)

## Properties

### color

> `readonly` **color**: `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:74

The coin's type, identifying the currency it represents.

#### Inherited from

[`EncodedShieldedCoinInfo`](EncodedShieldedCoinInfo.md).[`color`](EncodedShieldedCoinInfo.md#color)

***

### mt\_index

> `readonly` **mt\_index**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:88

The coin's location in the chain's Merkle tree of coin commitments. Bounded to be a non-negative 64-bit integer.

***

### nonce

> `readonly` **nonce**: `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:70

The coin's randomness, preventing it from colliding with other coins.

#### Inherited from

[`EncodedShieldedCoinInfo`](EncodedShieldedCoinInfo.md).[`nonce`](EncodedShieldedCoinInfo.md#nonce)

***

### value

> `readonly` **value**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:78

The coin's value, in atomic units dependent on the currency. Bounded to be a non-negative 64-bit integer.

#### Inherited from

[`EncodedShieldedCoinInfo`](EncodedShieldedCoinInfo.md).[`value`](EncodedShieldedCoinInfo.md#value)
