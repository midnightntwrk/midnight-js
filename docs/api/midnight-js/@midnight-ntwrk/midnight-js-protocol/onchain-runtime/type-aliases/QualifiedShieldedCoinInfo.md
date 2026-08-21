[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / QualifiedShieldedCoinInfo

# Type Alias: QualifiedShieldedCoinInfo

> **QualifiedShieldedCoinInfo** = `object`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:183

Information required to spend an existing coin, alongside authorization of
the owner

## Properties

### mt\_index

> **mt\_index**: `bigint`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:203

The coin's location in the chain's Merkle tree of coin commitments

Bounded to be a non-negative 64-bit integer

***

### nonce

> **nonce**: [`Nonce`](Nonce.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:191

The coin's randomness, preventing it from colliding with other coins

***

### type

> **type**: [`RawTokenType`](RawTokenType.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:187

The coin's type, identifying the currency it represents

***

### value

> **value**: `bigint`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:197

The coin's value, in atomic units dependent on the currency

Bounded to be a non-negative 64-bit integer
