[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / secp256k1FromProjective

# Function: secp256k1FromProjective()

> **secp256k1FromProjective**(`p`): [`Secp256k1Point`](../interfaces/Secp256k1Point.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/utils.d.ts:33

Project a noble-curves point back down to the simple affine
`Secp256k1Point` representation.

## Parameters

### p

`WeierstrassPoint`\<`bigint`\>

## Returns

[`Secp256k1Point`](../interfaces/Secp256k1Point.md)
