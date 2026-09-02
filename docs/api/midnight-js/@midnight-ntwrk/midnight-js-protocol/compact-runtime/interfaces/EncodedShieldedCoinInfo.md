[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / EncodedShieldedCoinInfo

# Interface: EncodedShieldedCoinInfo

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:66

A [ShieldedCoinInfo](../../onchain-runtime/type-aliases/ShieldedCoinInfo.md) with its fields encoded as byte strings. This representation is used internally by
the contract executable.

## Extended by

- [`EncodedQualifiedShieldedCoinInfo`](EncodedQualifiedShieldedCoinInfo.md)

## Properties

### color

> `readonly` **color**: `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:74

The coin's type, identifying the currency it represents.

***

### nonce

> `readonly` **nonce**: `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:70

The coin's randomness, preventing it from colliding with other coins.

***

### value

> `readonly` **value**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/zswap.d.ts:78

The coin's value, in atomic units dependent on the currency. Bounded to be a non-negative 64-bit integer.
