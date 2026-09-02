[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / SparseCompactValue

# Type Alias: SparseCompactValue

> **SparseCompactValue** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:41

A data structure indicating the locations of all contract references in a Compact value.

## Properties

### descriptor

> **descriptor**: [`CompactType`](../interfaces/CompactType.md)\<`unknown`\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:47

A descriptor that can be used to convert an [AlignedValue](../../onchain-runtime/type-aliases/AlignedValue.md) into a TypeScript representation of the same value.
This descriptor will only ever decode `struct`s or `Vector`s that contain contract addresses.

***

### sparseType

> **sparseType**: [`SparseCompactType`](SparseCompactType.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:51

A data structure indicating how to navigate to the contract addresses present in the output of the above `descriptor`.

***

### tag

> **tag**: `"compactValue"`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:42
