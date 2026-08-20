[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / secp256k1ScalarInv

# Function: secp256k1ScalarInv()

> **secp256k1ScalarInv**(`x`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:191

Secp256k1 scalar field inverse

This function returns the multiplicative inverse of x in the secp256k1 scalar
field.  That is, a value y such that x * y = 1 (modulo
SECP256K1_SCALAR_MODULUS).  x is assumed to be in the range
(0, SECP256K1_SCALAR_MODULUS).

## Parameters

### x

`bigint`

## Returns

`bigint`
