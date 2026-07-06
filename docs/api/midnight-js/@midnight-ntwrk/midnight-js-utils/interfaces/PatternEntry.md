[**Midnight.js API Reference v5.0.0-beta.3**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-utils](../README.md) / PatternEntry

# Interface: PatternEntry

Pattern entry in the classifier table.

## Properties

### classification

> `readonly` **classification**: [`Classification`](../type-aliases/Classification.md)

***

### extract?

> `readonly` `optional` **extract?**: (`match`) => [`ExtractedInfo`](ExtractedInfo.md)

#### Parameters

##### match

`RegExpExecArray`

#### Returns

[`ExtractedInfo`](ExtractedInfo.md)

***

### inferDirection?

> `readonly` `optional` **inferDirection?**: (`match`) => [`Direction`](../type-aliases/Direction.md) \| `undefined`

#### Parameters

##### match

`RegExpExecArray`

#### Returns

[`Direction`](../type-aliases/Direction.md) \| `undefined`

***

### regex

> `readonly` **regex**: `RegExp`
