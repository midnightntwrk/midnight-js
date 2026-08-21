[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / transientCommit

# Function: transientCommit()

> **transientCommit**\<`A`\>(`rtType`, `value`, `opening`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:41

The Compact builtin `transientCommit` function

This function is a circuit-efficient commitment function from arbitrary
values representable in Compact, and a field element commitment opening, to
field elements, which is not guaranteed to persist between
upgrades. It should not be used to derive state data, but can be used for
consistency checks.

## Type Parameters

### A

`A`

## Parameters

### rtType

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

### value

`A`

### opening

`bigint`

## Returns

`bigint`

## Throws

If `opening` is out of range for field elements
