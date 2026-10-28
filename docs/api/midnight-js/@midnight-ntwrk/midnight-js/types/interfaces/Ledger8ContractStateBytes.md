[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / Ledger8ContractStateBytes

# Interface: Ledger8ContractStateBytes

The v8 variant of [VersionedContractState](../type-aliases/VersionedContractState.md): a contract state written by
the v8 ledger runtime, as the serialized, tag-prefixed bytes the network
stored. Not decoded and not translated to the v9 encoding.

## Properties

### stateBytes

> `readonly` **stateBytes**: `Uint8Array`

Serialized, tag-prefixed byte form (`contract-state[v6]`).

***

### version

> `readonly` **version**: `"v8"`
