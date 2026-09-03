[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / convertNumericToJubjubScalar

# Function: convertNumericToJubjubScalar()

> **convertNumericToJubjubScalar**(`x`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/casts.d.ts:7

Conversion of a native field or unsigned integer value to a JubjubScalar

The native field is BLS12-381 scalar, which has a larger field modulus than
the Jubjub scalar field.  The value is converted modulo the Jubjub scalar field modulus.

## Parameters

### x

`bigint`

## Returns

`bigint`
