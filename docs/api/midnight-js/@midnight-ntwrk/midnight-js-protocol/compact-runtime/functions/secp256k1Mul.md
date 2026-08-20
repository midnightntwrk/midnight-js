[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / secp256k1Mul

# Function: secp256k1Mul()

> **secp256k1Mul**(`a`, `b`): [`Secp256k1Point`](../interfaces/Secp256k1Point.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:247

The Compact builtin `ecMul` function for secp256k1 points.

`multiplyUnsafe` is used, instead of `multiply`, because the latter rejects a zero scalar; the
"unsafe" (variable-time) is due to non-constant time operations, which we don't guarantee
anyways.

## Parameters

### a

[`Secp256k1Point`](../interfaces/Secp256k1Point.md)

### b

`bigint`

## Returns

[`Secp256k1Point`](../interfaces/Secp256k1Point.md)
