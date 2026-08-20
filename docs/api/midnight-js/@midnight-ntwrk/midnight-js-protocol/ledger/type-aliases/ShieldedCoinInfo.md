[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / ShieldedCoinInfo

# Type Alias: ShieldedCoinInfo

> **ShieldedCoinInfo** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:163

Information required to create a new coin, alongside details about the
recipient

## Properties

### nonce

> **nonce**: [`Nonce`](Nonce.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:171

The coin's randomness, preventing it from colliding with other coins

***

### type

> **type**: [`RawTokenType`](RawTokenType.md)

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:167

The coin's type, identifying the currency it represents

***

### value

> **value**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:177

The coin's value, in atomic units dependent on the currency

Bounded to be a non-negative 64-bit integer
