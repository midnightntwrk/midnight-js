[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [ContractLog](../README.md) / decodeAll

# Variable: decodeAll

> `const` **decodeAll**: (`events`) => [`ContractEvent`](../type-aliases/ContractEvent.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:208

**`Experimental`**

Decode a batch of raw [LogEvent](../../../type-aliases/LogEvent.md)s (e.g. `result.events`) into typed [ContractEvent](../type-aliases/ContractEvent.md)s.

Like [decode](decode.md), this never throws — degraded events are preserved in place rather than
dropped, so the returned array is index-aligned with the input.

 Inherits [decode](decode.md)'s experimental caveat: decoded payload offsets are derived,
not yet confirmed against a live `emit`.

## Parameters

### events

readonly [`LogEvent`](../../../type-aliases/LogEvent.md)[]

The raw log events to decode.

## Returns

[`ContractEvent`](../type-aliases/ContractEvent.md)[]

The decoded, typed events, in input order.
