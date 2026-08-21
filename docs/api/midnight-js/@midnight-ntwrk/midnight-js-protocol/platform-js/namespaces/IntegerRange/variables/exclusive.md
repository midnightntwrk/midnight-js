[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [IntegerRange](../README.md) / exclusive

# Variable: exclusive

> `const` **exclusive**: \{(`range`): [`IntegerRange`](../interfaces/IntegerRange.md); (`range`): [`IntegerRange`](../interfaces/IntegerRange.md); \}

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/IntegerRange.d.ts:123

Creates _exclusive_ integer ranges.

## Call Signature

> (`range`): [`IntegerRange`](../interfaces/IntegerRange.md)

### Parameters

#### range

readonly \[`number`, `number`\]

A tuple defining the minimum and maximum values of the integer range.

### Returns

[`IntegerRange`](../interfaces/IntegerRange.md)

An [IntegerRange](../interfaces/IntegerRange.md) that is _exclusive_ of its maximum value.

## Call Signature

> (`range`): [`IntegerRange`](../interfaces/IntegerRange.md)

Creates an _exclusive_ integer range that is equivalent to a source [IntegerRange](../interfaces/IntegerRange.md) with regards to
the values that it can contain.

### Parameters

#### range

[`IntegerRange`](../interfaces/IntegerRange.md)

The [IntegerRange](../interfaces/IntegerRange.md) to use as a basis for an _exclusive_ integer range .

### Returns

[`IntegerRange`](../interfaces/IntegerRange.md)

`range`, if `range` is already an _exclusive_ integer range; otherwise, a new [IntegerRange](../interfaces/IntegerRange.md) that
is an _exclusive_ version of `range`.
