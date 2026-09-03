[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / persistentHash

# Function: persistentHash()

> **persistentHash**\<`A`\>(`rtType`, `value`): `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:55

The Compact builtin `persistentHash` function

This function is a non-circuit-optimised hash function for mostly arbitrary
data. It is guaranteed to persist between upgrades, with the exception of
devnet. It *should* be used to derive state data, and not for consistency
checks where avoidable.

Note that data containing `Opaque` elements *may* throw runtime errors, and
cannot be relied upon as a consistent representation.

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
