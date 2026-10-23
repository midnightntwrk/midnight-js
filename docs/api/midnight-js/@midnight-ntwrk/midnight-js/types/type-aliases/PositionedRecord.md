[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / PositionedRecord

# Type Alias: PositionedRecord\<T\>

> **PositionedRecord**\<`T`\> = `object`

A value served by a stream, together with the block that carried it.

`blockHeight` and `blockHash` have the types of [BlockHeightConfig](BlockHeightConfig.md)
and [BlockHashConfig](BlockHashConfig.md), so a record resumes its stream when wrapped as
`{ type: 'blockHeight', blockHeight }` or `{ type: 'blockHash', blockHash }`.
With `inclusive` left unset or `true`, resuming includes that block: values
from it may be delivered again, and no value after it is skipped. With
`inclusive: false` the whole block is skipped, including any values in it
that came after this record.

A resumed stream is always a `blockHeight` or `blockHash` stream, whatever
config the original stream had.

## Type Parameters

### T

`T`

## Properties

### blockHash

> `readonly` **blockHash**: [`BlockHash`](BlockHash.md)

The hex-encoded hash of the block that carried the value, as the network served it.

***

### blockHeight

> `readonly` **blockHeight**: `number`

The height of the block that carried the value.

***

### value

> `readonly` **value**: `T`

The value the stream served.
