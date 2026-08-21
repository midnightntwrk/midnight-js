[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / QueryResults

# Class: QueryResults

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:943

The results of making a query against a specific state or context

## Properties

### context

> `readonly` **context**: [`QueryContext`](QueryContext.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:952

The context state after executing the query. This can be used to execute
further queries

***

### events

> `readonly` **events**: [`GatherResult`](../type-aliases/GatherResult.md)[]

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:956

Any events/results that occurred during or from the query

***

### gasCost

> `readonly` **gasCost**: [`RunningCost`](../type-aliases/RunningCost.md)

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:960

The measured cost of executing the query

## Methods

### toString()

> **toString**(`compact?`): `string`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:946

#### Parameters

##### compact?

`boolean`

#### Returns

`string`
