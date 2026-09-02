[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / SparseCompactStruct

# Type Alias: SparseCompactStruct

> **SparseCompactStruct** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:14

A data structure indicating the locations of contract references in a Compact struct.

## Properties

### elements

> **elements**: `Record`\<`string`, [`SparseCompactType`](SparseCompactType.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:21

A data structure indicating the locations of contract references in the elements of a Compact struct. The keys of
the record correspond to fields of the Compact struct that contain contract references. We use the keys of the record
to explore the elements of the corresponding CompactStruct.

***

### tag

> **tag**: `"struct"`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:15
