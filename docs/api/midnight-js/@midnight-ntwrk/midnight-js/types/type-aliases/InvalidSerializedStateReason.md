[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / InvalidSerializedStateReason

# Type Alias: InvalidSerializedStateReason

> **InvalidSerializedStateReason** = `"unknown-kind"` \| `"not-bytes"` \| `"tag-mismatch"` \| `"not-from-bytes"`

Why [InvalidSerializedStateError](../classes/InvalidSerializedStateError.md) refused a value.

- `'unknown-kind'`: the kind is not a [StateKind](StateKind.md).
- `'not-bytes'`: the value is not a `Uint8Array`.
- `'tag-mismatch'`: the bytes do not start with the tag the ledger of that era writes for that
  kind.
- `'not-from-bytes'`: the value was constructed without `SerializedState.fromBytes`.
