[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [ContractLog](../README.md) / indexedFields

# Variable: indexedFields

> `const` **indexedFields**: (`event`) => `Record`\<`string`, `Uint8Array`\>

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/ContractLog.d.ts:227

Derive the indexable fields of a decoded event, as raw byte values keyed by field name.

Indexed fields are determined by the event type (MIP-0002), not marked by the author:
- `shielded-spend`/`shielded-burn` → `nullifier`
- `shielded-receive` → `commitment`
- `shielded-mint` → `commitment`, `domainSep`
- `unshielded-spend`/`unshielded-burn` → `sender`, `tokenType`
- `unshielded-receive` → `recipient`, `tokenType`
- `unshielded-mint` → `domainSep`, `tokenType`
- `paused`/`unpaused`/`misc` and any degraded event → none

## Parameters

### event

[`ContractEvent`](../type-aliases/ContractEvent.md)

The decoded event.

## Returns

`Record`\<`string`, `Uint8Array`\>

A map of indexable field name to its raw bytes; empty when the type indexes nothing.
