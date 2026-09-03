[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / decodeAll

# Variable: decodeAll

> `const` **decodeAll**: (`events`) => [`ContractEvent`](../type-aliases/ContractEvent.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:209

Decode a batch of raw [LogEvent](../../../../compact-runtime/type-aliases/LogEvent.md)s (e.g. `result.events`) into typed [ContractEvent](../type-aliases/ContractEvent.md)s.

Like [decode](decode.md), this never throws — degraded events are preserved in place rather than
dropped, so the returned array is index-aligned with the input.

## Parameters

### events

readonly [`LogEvent`](../../../../compact-runtime/type-aliases/LogEvent.md)[]

The raw log events to decode.

## Returns

[`ContractEvent`](../type-aliases/ContractEvent.md)[]

The decoded, typed events, in input order.
