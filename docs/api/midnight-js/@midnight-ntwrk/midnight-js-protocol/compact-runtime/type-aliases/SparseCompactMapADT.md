[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / SparseCompactMapADT

# Type Alias: SparseCompactMapADT

> **SparseCompactMapADT** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:90

A data structure indicating the locations of all contract references in a Compact `Map` ADT.

## Properties

### keyType?

> `optional` **keyType?**: [`SparseCompactValue`](SparseCompactValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:96

A data structure indicating the locations of all contract references in the Compact values that are the keys of the
outer `Map` ADT.

***

### tag

> **tag**: `"map"`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:91

***

### valueType?

> `optional` **valueType?**: [`SparseCompactADT`](SparseCompactADT.md) \| [`SparseCompactValue`](SparseCompactValue.md)

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:102

A data structure indicating the locations of all contract references in the Compact entities that are the values of the
outer `Map` ADT. Since the values of a `Map` ADT may be either Compact values or other `Map` ADTs, we take the union
of the corresponding data structures.
