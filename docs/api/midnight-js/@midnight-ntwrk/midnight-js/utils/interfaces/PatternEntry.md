[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [utils](../README.md) / PatternEntry

# Interface: PatternEntry

Defined in: packages/utils/dist/index.d.ts:43

Pattern entry in the classifier table.

## Properties

### classification

> `readonly` **classification**: [`Classification`](../type-aliases/Classification.md)

Defined in: packages/utils/dist/index.d.ts:45

***

### extract?

> `readonly` `optional` **extract?**: (`match`) => [`ExtractedInfo`](ExtractedInfo.md)

Defined in: packages/utils/dist/index.d.ts:47

#### Parameters

##### match

`RegExpExecArray`

#### Returns

[`ExtractedInfo`](ExtractedInfo.md)

***

### inferDirection?

> `readonly` `optional` **inferDirection?**: (`match`) => [`Direction`](../type-aliases/Direction.md) \| `undefined`

Defined in: packages/utils/dist/index.d.ts:46

#### Parameters

##### match

`RegExpExecArray`

#### Returns

[`Direction`](../type-aliases/Direction.md) \| `undefined`

***

### regex

> `readonly` **regex**: `RegExp`

Defined in: packages/utils/dist/index.d.ts:44
