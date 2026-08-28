[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractEventStore](../README.md) / StoredEvent

# Type Alias: StoredEvent

> **StoredEvent** = [`ContractEvent`](../../ContractLog/type-aliases/ContractEvent.md) & `object`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:39

A [ContractLog.ContractEvent](../../ContractLog/type-aliases/ContractEvent.md) accumulated in a [ContractEventStore](../classes/ContractEventStore.md), tagged with the
monotonic `id` assigned on append (mirroring the indexer's `BIGSERIAL` cursor). The emitting
contract's `address` is carried on the event itself.

## Type Declaration

### id

> `readonly` **id**: `bigint`
