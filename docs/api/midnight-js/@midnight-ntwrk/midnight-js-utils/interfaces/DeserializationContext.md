[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / DeserializationContext

# Interface: DeserializationContext

Fully-classified context attached to a `DeserializationError`.

## Extends

- [`DeserializationCallSite`](DeserializationCallSite.md)

## Properties

### caller

> `readonly` **caller**: `string`

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`caller`](DeserializationCallSite.md#caller)

***

### classification

> `readonly` **classification**: [`Classification`](../type-aliases/Classification.md)

***

### dataType

> `readonly` **dataType**: `string`

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`dataType`](DeserializationCallSite.md#datatype)

***

### direction?

> `readonly` `optional` **direction?**: [`Direction`](../type-aliases/Direction.md)

***

### extracted?

> `readonly` `optional` **extracted?**: [`ExtractedInfo`](ExtractedInfo.md)

***

### mitigation

> `readonly` **mitigation**: readonly `string`[]

***

### source

> `readonly` **source**: [`SourceLibrary`](../type-aliases/SourceLibrary.md)

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`source`](DeserializationCallSite.md#source)
