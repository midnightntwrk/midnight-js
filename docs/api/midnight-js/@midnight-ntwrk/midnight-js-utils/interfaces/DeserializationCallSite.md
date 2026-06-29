[**Midnight.js API Reference v5.0.0-alpha.1**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / DeserializationCallSite

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

### source

> `readonly` **source**: [`SourceLibrary`](../type-aliases/SourceLibrary.md)
