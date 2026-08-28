[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [compact-runtime](../README.md) / PublicLedgerSegments

# Type Alias: PublicLedgerSegments

> **PublicLedgerSegments** = `object`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:111

A data structure indicating the locations of all contract references in a given ledger state.

## Properties

### indices

> **indices**: `Record`\<`number`, `PublicLedgerSegments` \| [`SparseCompactADT`](SparseCompactADT.md)\>

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:136

For reasonably small ledger states, the keys of the record identify locations of ADTs in the ledger state. For example,
if a Compact source file contains

```
contract C {};
struct Struct1 {
  a: Field;
  b: C;
}
ledger ls1: List[Field];
ledger ls2: List[C];
ledger ls3: Set[Struct1];
```

then the indices record will contain keys `1` and `2`, since ledger declarations `1` and `2` contain contract
references while ledger declaration `0` (`List[Field]`) does not.

However, the ledger implementation has a fixed maximum length on the state arrays produced by StateValue.toArray.
When the number of entries in a given state exceeds the maximum, StateValue.toArray produces nested state arrays,
where each inner state array is within the maximum. For each nested state array, there will be a key in the indices record
pointing to a PublicLedgerSegments object.

***

### tag

> **tag**: `"publicLedgerArray"`

Defined in: node\_modules/@midnight-ntwrk/compact-runtime/dist/contract-dependencies.d.ts:112
