[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [ContractLog](../README.md) / ContractEventBase

# Interface: ContractEventBase

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:135

The common fields carried by every [ContractEvent](../type-aliases/ContractEvent.md).

## Properties

### address

> `readonly` **address**: [`ContractAddress`](https://github.com/midnightntwrk/midnight-sdk)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:144

The address of the contract that emitted the event. Always a validated
[ContractAddress.ContractAddress](https://github.com/midnightntwrk/midnight-sdk) on a [DecodedEvent](../type-aliases/DecodedEvent.md); on a [DegradedEvent](../type-aliases/DegradedEvent.md)
whose degradation was caused by a malformed envelope address, this is the unvalidated raw
string as supplied by the runtime (also available on `raw.address`).

***

### raw

> `readonly` **raw**: [`LogEvent`](../../../type-aliases/LogEvent.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:146

The original, undecoded log event.

***

### version

> `readonly` **version**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:137

The wire-format version (`1` for Phase 1).
