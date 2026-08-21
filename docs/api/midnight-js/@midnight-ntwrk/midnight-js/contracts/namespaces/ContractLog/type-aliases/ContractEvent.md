[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [ContractLog](../README.md) / ContractEvent

# Type Alias: ContractEvent

> **ContractEvent** = [`DecodedEvent`](DecodedEvent.md) \| [`DegradedEvent`](DegradedEvent.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:174

A typed contract event: either a [DecodedEvent](DecodedEvent.md) or a [DegradedEvent](DegradedEvent.md). Discriminate
on `degraded`, then narrow on `eventType`.
