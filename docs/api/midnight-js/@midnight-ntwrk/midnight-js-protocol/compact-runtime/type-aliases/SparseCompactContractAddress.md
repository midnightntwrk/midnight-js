[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / SparseCompactContractAddress

# Type Alias: SparseCompactContractAddress

> **SparseCompactContractAddress** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:8

A data structure indicating that the current CompactValue being explored is a contract reference. When this
type is recognized, the current CompactValue should be a [ContractAddress](../../onchain-runtime/type-aliases/ContractAddress.md), and the address is added to
the dependency set.

## Properties

### tag

> **tag**: `"contractAddress"`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:9
