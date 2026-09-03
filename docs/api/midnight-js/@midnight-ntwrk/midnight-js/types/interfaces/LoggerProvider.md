[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / LoggerProvider

# Interface: LoggerProvider

Defined in: packages/types/dist/index.d.ts:427

A provider for logging functions.

## Properties

### debug?

> `optional` **debug?**: `LogFn`

Defined in: packages/types/dist/index.d.ts:431

***

### error?

> `optional` **error?**: `LogFn`

Defined in: packages/types/dist/index.d.ts:430

***

### fatal?

> `optional` **fatal?**: `LogFn`

Defined in: packages/types/dist/index.d.ts:432

***

### info?

> `optional` **info?**: `LogFn`

Defined in: packages/types/dist/index.d.ts:428

***

### warn?

> `optional` **warn?**: `LogFn`

Defined in: packages/types/dist/index.d.ts:429

## Methods

### isLevelEnabled()

> **isLevelEnabled**(`level`): `boolean`

Defined in: packages/types/dist/index.d.ts:433

#### Parameters

##### level

[`LogLevel`](../enumerations/LogLevel.md)

#### Returns

`boolean`
