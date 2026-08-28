[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / persistentCommit

# Function: persistentCommit()

> **persistentCommit**\<`A`\>(`rtType`, `value`, `opening`): `Uint8Array`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:71

The Compact builtin `persistentCommit` function

This function is a non-circuit-optimised commitment function from arbitrary
values representable in Compact, and a 256-bit bytestring opening, to a
256-bit bytestring. It is guaranteed to persist between upgrades. It
*should* be used to derive state data, and not for consistency checks where
avoidable.

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

### opening

`Uint8Array`

## Returns

`Uint8Array`

## Throws

If `rtType` encodes a type containing Compact 'Opaque' types, or
`opening` is not 32 bytes long
