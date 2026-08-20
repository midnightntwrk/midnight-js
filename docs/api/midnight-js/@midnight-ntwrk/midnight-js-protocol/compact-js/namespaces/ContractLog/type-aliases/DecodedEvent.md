[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / DecodedEvent

# Type Alias: DecodedEvent

> **DecodedEvent** = `{ [K in LogEventType]: ContractEventBase & { degraded: false; eventType: K; payload: PayloadMap[K] } }`\[[`LogEventType`](LogEventType.md)\]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:148

A successfully decoded contract event. Narrow on `eventType` to obtain the typed `payload`.
