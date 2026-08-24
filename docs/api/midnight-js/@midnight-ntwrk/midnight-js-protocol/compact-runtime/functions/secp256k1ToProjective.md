[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / secp256k1ToProjective

# Function: secp256k1ToProjective()

> **secp256k1ToProjective**(`p`): `WeierstrassPoint`\<`bigint`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/utils.d.ts:28

Lift the simple affine `Secp256k1Point` representation into a noble-curves
projective point. Identity maps to `Point.ZERO`; every other input is validated
to lie on the curve by `fromAffine`.

## Parameters

### p

[`Secp256k1Point`](../interfaces/Secp256k1Point.md)

## Returns

`WeierstrassPoint`\<`bigint`\>
