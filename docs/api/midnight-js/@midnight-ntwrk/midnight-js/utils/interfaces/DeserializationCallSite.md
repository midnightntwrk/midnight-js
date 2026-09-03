[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / DeserializationCallSite

# Interface: DeserializationCallSite

Defined in: packages/utils/dist/index.d.ts:54

Minimal context the caller of a deserialization wrapper must supply.
`dataType` may be overridden by the classifier if the error message
contains an extractable struct name.

## Extended by

- [`DeserializationContext`](DeserializationContext.md)

## Properties

### caller

> `readonly` **caller**: `string`

Defined in: packages/utils/dist/index.d.ts:57

***

### dataType

> `readonly` **dataType**: `string`

Defined in: packages/utils/dist/index.d.ts:55

***

### source

> `readonly` **source**: [`SourceLibrary`](../type-aliases/SourceLibrary.md)

Defined in: packages/utils/dist/index.d.ts:56
