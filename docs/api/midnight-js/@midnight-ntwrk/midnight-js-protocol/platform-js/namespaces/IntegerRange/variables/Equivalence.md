[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [IntegerRange](../README.md) / Equivalence

# Variable: Equivalence

> `const` **Equivalence**: `equivalence.Equivalence`\<[`IntegerRange`](../interfaces/IntegerRange.md)\>

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/IntegerRange.d.ts:51

Provides equivalence for [IntegerRange](../interfaces/IntegerRange.md) instances.

## Remarks

For two [IntegerRange](../interfaces/IntegerRange.md) instances to be considered equal, both their minimum and maximum values
must be equal, and they should both have the same type of inclusion (i.e., inclusive or exclusive). This is
not _range equivalence_ which determines if two [IntegerRange](../interfaces/IntegerRange.md) instances represent the same sequence
of values.
