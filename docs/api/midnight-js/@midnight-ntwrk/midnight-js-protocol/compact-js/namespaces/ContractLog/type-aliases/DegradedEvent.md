[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / DegradedEvent

# Type Alias: DegradedEvent

> **DegradedEvent** = [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:163

An event whose payload could not be decoded — dropped on-chain (`{ tag: 'null' }` data),
truncated, carrying the reserved fallback `version: 0`, or bearing a malformed envelope address.
Per MIP-0002 this is normal, not an error; the raw event is still available via
[ContractEventBase.raw](../interfaces/ContractEventBase.md#raw).

## Type Declaration

### degraded

> `readonly` **degraded**: `true`

### eventType

> `readonly` **eventType**: [`LogEventType`](LogEventType.md)

### payload

> `readonly` **payload**: `undefined`
