[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / keccak256

# Function: keccak256()

> **keccak256**\<`A`\>(`rtType`, `value`): `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:99

The Compact builtin `keccak256` function

Hashes `value` using Keccak-256 and returns the 32-byte digest.

## Type Parameters

### A

`A`

## Parameters

### rtType

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

### value

`A`

## Returns

`Uint8Array`

## Throws

If `rtType` encodes a type containing Compact 'Opaque' types
