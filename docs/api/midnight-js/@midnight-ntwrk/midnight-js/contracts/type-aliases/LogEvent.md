[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / LogEvent

# Type Alias: LogEvent

> **LogEvent** = `Extract`\<[`ocrt.GatherResult`](https://github.com/midnightntwrk/midnight-ledger), \{ `tag`: `"log"`; \}\>\[`"content"`\] & `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/circuit-context.d.ts:94

A `GatherResult` narrowed to log emissions, tagged with the address of the contract
that emitted it; `content` is the encoded `VersionedLogItem` array.

## Type Declaration

### address

> **address**: [`ocrt.ContractAddress`](https://github.com/midnightntwrk/midnight-ledger)
