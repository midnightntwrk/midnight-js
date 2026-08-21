[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / GatherResult

# Type Alias: GatherResult

> **GatherResult** = \{ `content`: [`AlignedValue`](AlignedValue.md); `tag`: `"read"`; \} \| \{ `content`: \{ `data`: [`EncodedStateValue`](EncodedStateValue.md); `eventType`: [`LogEventType`](LogEventType.md); `version`: `number`; \}; `tag`: `"log"`; \}

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:262

An individual result of observing the results of a non-verifying VM program
execution
