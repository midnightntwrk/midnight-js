[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [IntegerRange](../README.md) / from

# Variable: from

> `const` **from**: (`input`) => [`IntegerRange`](../interfaces/IntegerRange.md)

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/IntegerRange.d.ts:151

Creates an integer range.

## Parameters

### input

[`IntegerRangeInput`](../type-aliases/IntegerRangeInput.md)

The input to use when constructing the integer range.

## Returns

[`IntegerRange`](../interfaces/IntegerRange.md)

An [IntegerRange](../interfaces/IntegerRange.md) derived from `input`.

## Remarks

The tuple form of [IntegerRangeInput](../type-aliases/IntegerRangeInput.md), will create an [IntegerRange](../interfaces/IntegerRange.md) that is _exclusive_
of `max` ( i.e., `min <= x < max`).
