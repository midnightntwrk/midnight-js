[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / DeserializationContext

# Interface: DeserializationContext

Defined in: packages/utils/dist/index.d.ts:60

Fully-classified context attached to a `DeserializationError`.

## Extends

- [`DeserializationCallSite`](DeserializationCallSite.md)

## Properties

### caller

> `readonly` **caller**: `string`

Defined in: packages/utils/dist/index.d.ts:57

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`caller`](DeserializationCallSite.md#caller)

***

### classification

> `readonly` **classification**: [`Classification`](../type-aliases/Classification.md)

Defined in: packages/utils/dist/index.d.ts:61

***

### dataType

> `readonly` **dataType**: `string`

Defined in: packages/utils/dist/index.d.ts:55

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`dataType`](DeserializationCallSite.md#datatype)

***

### direction?

> `readonly` `optional` **direction?**: [`Direction`](../type-aliases/Direction.md)

Defined in: packages/utils/dist/index.d.ts:62

***

### extracted?

> `readonly` `optional` **extracted?**: [`ExtractedInfo`](ExtractedInfo.md)

Defined in: packages/utils/dist/index.d.ts:64

***

### mitigation

> `readonly` **mitigation**: readonly `string`[]

Defined in: packages/utils/dist/index.d.ts:63

***

### source

> `readonly` **source**: [`SourceLibrary`](../type-aliases/SourceLibrary.md)

Defined in: packages/utils/dist/index.d.ts:56

#### Inherited from

[`DeserializationCallSite`](DeserializationCallSite.md).[`source`](DeserializationCallSite.md#source)
