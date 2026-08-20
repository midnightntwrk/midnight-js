[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractLog](../README.md) / ContractEventBase

# Interface: ContractEventBase

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:130

The common fields carried by every [ContractEvent](../type-aliases/ContractEvent.md).

## Properties

### address

> `readonly` **address**: [`ContractAddress`](../../../../platform-js/effect/ContractAddress/type-aliases/ContractAddress.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:139

The address of the contract that emitted the event. Always a validated
[ContractAddress.ContractAddress](../../../../platform-js/effect/ContractAddress/variables/ContractAddress.md) on a [DecodedEvent](../type-aliases/DecodedEvent.md); on a [DegradedEvent](../type-aliases/DegradedEvent.md)
whose degradation was caused by a malformed envelope address, this is the unvalidated raw
string as supplied by the runtime (also available on `raw.address`).

***

### raw

> `readonly` **raw**: [`LogEvent`](../../../../compact-runtime/type-aliases/LogEvent.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:141

The original, undecoded log event.

***

### version

> `readonly` **version**: `number`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:132

The wire-format version (`1` for Phase 1).
