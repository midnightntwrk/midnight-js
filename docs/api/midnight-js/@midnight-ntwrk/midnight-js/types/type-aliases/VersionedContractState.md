[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / VersionedContractState

# Type Alias: VersionedContractState

> **VersionedContractState** = [`Ledger8ContractStateBytes`](../interfaces/Ledger8ContractStateBytes.md) \| [`Ledger9ContractState`](../interfaces/Ledger9ContractState.md)

A contract state discriminated by the ledger runtime that wrote it: the stored
bytes for the v8 era ([Ledger8ContractStateBytes](../interfaces/Ledger8ContractStateBytes.md)), or the decoded state
for v9 ([Ledger9ContractState](../interfaces/Ledger9ContractState.md)). Narrow on `version` before touching it.
