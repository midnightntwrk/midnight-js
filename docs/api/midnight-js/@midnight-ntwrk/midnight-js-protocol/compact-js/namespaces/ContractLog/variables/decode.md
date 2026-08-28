[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / decode

# Variable: decode

> `const` **decode**: (`raw`) => [`ContractEvent`](../type-aliases/ContractEvent.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:193

**`Experimental`**

Decode a single raw [LogEvent](../../../../compact-runtime/type-aliases/LogEvent.md) into a typed [ContractEvent](../type-aliases/ContractEvent.md).

This is a total, pure function: it **never throws**. A dropped (`{ tag: 'null' }`), truncated,
or `version: 0` payload — or a malformed envelope address — decodes to a [DegradedEvent](../type-aliases/DegradedEvent.md)
(`degraded: true`, `payload: undefined`) per the MIP-0002 graceful-degradation rule; the raw
event remains on `raw`.

 The `payload` field byte-offsets are derived from the compiler source and not yet
confirmed against a live `emit` (see the module-level remarks and the provenance note in
`test/effect/logEventFixtures.ts`). A wrong offset decodes silently to a wrong value; treat
decoded payloads as provisional. The envelope and degradation behaviour are confirmed.

## Parameters

### raw

[`LogEvent`](../../../../compact-runtime/type-aliases/LogEvent.md)

The raw log event surfaced on a circuit result.

## Returns

[`ContractEvent`](../type-aliases/ContractEvent.md)

The decoded, typed event.
