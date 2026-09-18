[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / DownConvertStage

# Type Alias: DownConvertStage

> **DownConvertStage** = `"v8 envelope extraction"` \| `"v9 envelope extraction"` \| `"state down-convert"`

Which step of the down-convert pipeline a [DownConvertFailedError](../classes/DownConvertFailedError.md)
came from. A closed union, so a consumer can `switch` on `stage`
exhaustively.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)
