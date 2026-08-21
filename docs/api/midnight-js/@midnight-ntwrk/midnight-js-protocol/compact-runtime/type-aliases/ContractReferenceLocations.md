[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / ContractReferenceLocations

# Type Alias: ContractReferenceLocations

> **ContractReferenceLocations** = [`EmptyPublicLedger`](EmptyPublicLedger.md) \| [`PublicLedgerSegments`](PublicLedgerSegments.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:150

A data structure indicating the locations of all contract references in a given ledger state. If it is a [EmptyPublicLedger](EmptyPublicLedger.md),
then no contract references are present in the ledger state. If it is a [PublicLedgerSegments](PublicLedgerSegments.md), then contract references are
present and can be extracted using [contractDependencies](../variables/contractDependencies.md).
