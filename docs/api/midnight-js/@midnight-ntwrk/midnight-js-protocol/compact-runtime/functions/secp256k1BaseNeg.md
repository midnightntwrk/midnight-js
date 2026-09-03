[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / secp256k1BaseNeg

# Function: secp256k1BaseNeg()

> **secp256k1BaseNeg**(`x`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:214

Secp256k1 base field negation

This function returns the negation of x in the secp256k1 base field.  That
is, a value y such that x + y = 0 (modulo SECP256K1_BASE_MODULUS).  x is
assumed to be in the range [0, SECP256K1_BASE_MODULUS).

## Parameters

### x

`bigint`

## Returns

`bigint`
