[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [platform-js](../../../README.md) / [IntegerRange](../README.md) / IntegerRangeInput

# Type Alias: IntegerRangeInput

> **IntegerRangeInput** = [`IntegerRange`](../interfaces/IntegerRange.md) \| readonly \[`number`, `number`\] \| `` `${number}..${number}` `` \| `` `${number}..=${number}` ``

Defined in: node\_modules/@midnight-ntwrk/platform-js/dist/dts/effect/IntegerRange.d.ts:39

An input for constructing [IntegerRange](../interfaces/IntegerRange.md) instances.

## Remarks

The tuple form of IntegerRangeInput, when used with [from](../variables/from.md), will create an
[IntegerRange](../interfaces/IntegerRange.md) that is _exclusive_ of `max` ( i.e., `min <= x < max`). When used with [inclusive](../variables/inclusive.md) or
[exclusive](../variables/exclusive.md), `max` will be _inclusive_ or _exclusive_ respectively.

The template string forms of IntegerRangeInput represent _inclusive_ or _exclusive_ ranges as follows:
- `'n..m'` will create a _exclusive_ range that contains all values `x` where `n <= x < m`, and
- `'n..=m'` will create an _inclusive_ range that contains all values `x` where `n <= x <= m`.
