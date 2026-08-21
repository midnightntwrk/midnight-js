[**Midnight.js API Reference v5.0.0-beta.6**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [ContractEventStore](../README.md) / ContractEventFilter

# Interface: ContractEventFilter

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:67

A filter over accumulated events, aligned with the MIP-0002 `ContractEventFilter` shape. All
present criteria must match (logical AND). Events whose type indexes nothing (e.g. `misc`,
lifecycle) and degraded events never match a [FieldPrefixFilter](FieldPrefixFilter.md).

## Properties

### contractAddress?

> `readonly` `optional` **contractAddress?**: [`ContractAddress`](../../../../platform-js/effect/ContractAddress/type-aliases/ContractAddress.md)

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:69

Restrict to events emitted by this contract.

***

### eventType?

> `readonly` `optional` **eventType?**: `"shielded-spend"` \| `"shielded-receive"` \| `"shielded-mint"` \| `"shielded-burn"` \| `"unshielded-spend"` \| `"unshielded-receive"` \| `"unshielded-mint"` \| `"unshielded-burn"` \| `"paused"` \| `"unpaused"` \| `"misc"`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:71

Restrict to a single event type.

***

### fieldPrefixes?

> `readonly` `optional` **fieldPrefixes?**: readonly [`FieldPrefixFilter`](FieldPrefixFilter.md)[]

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:73

Restrict to events whose indexed fields match every given prefix.

***

### fromId?

> `readonly` `optional` **fromId?**: `bigint`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractEventStore.d.ts:75

Resume cursor — include only events with `id >= fromId`.
