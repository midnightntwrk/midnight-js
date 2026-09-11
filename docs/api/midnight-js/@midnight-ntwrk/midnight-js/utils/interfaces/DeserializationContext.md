[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / DeserializationContext

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

### details?

> `readonly` `optional` **details?**: `Readonly`\<`Record`\<`string`, `string` \| `number`\>\>

Facts identifying the particular read that failed, supplied by the caller
and rendered verbatim. For diagnosis only: nothing here changes the
classification or the mitigation.

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`details`](DeserializationCallSite.md#details)

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
