[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / LogEvent

# Type Alias: LogEvent

> **LogEvent** = `Extract`\<[`GatherResult`](../../onchain-runtime/type-aliases/GatherResult.md), \{ `tag`: `"log"`; \}\>\[`"content"`\] & `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:94

A `GatherResult` narrowed to log emissions, tagged with the address of the contract
that emitted it; `content` is the encoded `VersionedLogItem` array.

## Type Declaration

### address

> **address**: [`ContractAddress`](../../onchain-runtime/type-aliases/ContractAddress.md)
