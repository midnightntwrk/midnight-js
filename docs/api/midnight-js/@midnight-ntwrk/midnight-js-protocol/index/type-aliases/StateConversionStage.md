[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / StateConversionStage

# Type Alias: StateConversionStage

> **StateConversionStage** = `"v8 state read"` \| `"v9 state read"` \| `"state conversion"`

Which step a [StateConversionFailedError](../classes/StateConversionFailedError.md) came from. A closed union,
so a consumer can `switch` on `stage` exhaustively.

`'state conversion'` is the structural round trip `lib/v8/executable.ts`
runs before a circuit executes; the other two decode a serialized contract state
written by that ledger version, in `lib/era/envelope.ts`.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)
