[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / hashToCurve

# Function: hashToCurve()

> **hashToCurve**\<`A`\>(`rtType`, `x`): [`JubjubPoint`](../interfaces/JubjubPoint.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:133

The Compact builtin `hashToCurve` function

This function maps arbitrary values representable in Compact to elliptic
curve points in the proof system's embedded curve.

Outputs are guaranteed to have unknown discrete logarithm with respect to
the group base, and any other output, but are not guaranteed to be unique (a
given input can be proven correct for multiple outputs).

Inputs of different types may have the same output, if they have the same
field-aligned binary representation.

## Type Parameters

### A

`A`

## Parameters

### rtType

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

### x

`A`

## Returns

[`JubjubPoint`](../interfaces/JubjubPoint.md)
