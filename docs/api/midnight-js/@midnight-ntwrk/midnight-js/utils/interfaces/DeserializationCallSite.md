[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / DeserializationCallSite

# Interface: DeserializationCallSite

Minimal context the caller of a deserialization wrapper must supply.
`dataType` may be overridden by the classifier if the error message
contains an extractable struct name.

## Extended by

- [`DeserializationContext`](DeserializationContext.md)

## Properties

### caller

> `readonly` **caller**: `string`

***

### dataType

> `readonly` **dataType**: `string`

***

### details?

> `readonly` `optional` **details?**: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

Facts identifying the particular read that failed, supplied by the caller
and rendered verbatim. For diagnosis only: nothing here changes the
classification or the mitigation.

***

### source

> `readonly` **source**: [`SourceLibrary`](../type-aliases/SourceLibrary.md)
