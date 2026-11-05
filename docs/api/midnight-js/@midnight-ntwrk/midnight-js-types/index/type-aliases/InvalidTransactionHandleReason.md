[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / InvalidTransactionHandleReason

# Type Alias: InvalidTransactionHandleReason

> **InvalidTransactionHandleReason** = `"not-a-handle"` \| `"wrong-stage"` \| `"invalid-stage"` \| `"not-bytes"` \| `"not-a-transaction"` \| `"header-mismatch"`

Why a value was refused as a transaction handle, or as the bytes or object to
make one from:

- `'not-a-handle'`: the value is not a handle made by `LedgerTransaction.fromBytes`.
- `'wrong-stage'`: the handle is at another stage than the method takes.
- `'invalid-stage'`: the stage to make a handle at is not a transaction stage.
- `'not-bytes'`: the value passed to `fromBytes` is not a `Uint8Array`.
- `'not-a-transaction'`: the value passed to `seal` has no `serialize` method.
- `'header-mismatch'`: the bytes do not start with the header the ledger of
  that era writes for a transaction at that stage.
