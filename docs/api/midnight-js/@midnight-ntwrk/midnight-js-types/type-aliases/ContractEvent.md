[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / ContractEvent

# Type Alias: ContractEvent

> **ContractEvent** = [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object` \| [`ContractEventBase`](../interfaces/ContractEventBase.md) & `object`

A decoded contract event. Discriminated union keyed on `eventType`; narrow on
it to access the variant-specific payload fields.

`amount` is always a `string` (encodes up to a 16-byte integer) — never round
it through `Number()`. Absent nullable fields are normalized to `undefined`
(never `null`).
