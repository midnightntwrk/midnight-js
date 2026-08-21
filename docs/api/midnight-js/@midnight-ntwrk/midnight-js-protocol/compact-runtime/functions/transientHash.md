[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / transientHash

# Function: transientHash()

> **transientHash**\<`A`\>(`rtType`, `value`): `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/built-ins.d.ts:29

The Compact builtin `transientHash` function

This function is a circuit-efficient compression function from arbitrary
data to field elements, which is not guaranteed to persist between upgrades.
It should not be used to derive state data, but can be used for consistency
checks.

## Type Parameters

### A

`A`

## Parameters

### rtType

[`CompactType`](../interfaces/CompactType.md)\<`A`\>

### value

`A`

## Returns

`bigint`
