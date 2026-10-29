[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / InvalidTransactionHandleReason

# Type Alias: InvalidTransactionHandleReason

> **InvalidTransactionHandleReason** = `"not-a-handle"` \| `"wrong-stage"` \| `"invalid-stage"` \| `"not-a-transaction"` \| `"stage-mismatch"`

Why a value was refused as a transaction handle, or as the object to seal
into one:

- `'not-a-handle'`: the value is not a handle made by `LedgerTransaction.seal`.
- `'wrong-stage'`: the handle is at another stage than the method takes.
- `'invalid-stage'`: the stage to seal at is not a transaction stage.
- `'not-a-transaction'`: the value to seal is not a ledger transaction object.
- `'stage-mismatch'`: the object to seal is at another stage than the one it
  is sealed as.
