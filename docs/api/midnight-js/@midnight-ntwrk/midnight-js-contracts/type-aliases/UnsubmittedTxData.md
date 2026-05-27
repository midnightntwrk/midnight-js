[**Midnight.js API Reference v4.1.0**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / UnsubmittedTxData

# Type Alias: UnsubmittedTxData

> **UnsubmittedTxData** = `object`

Data relevant to any unsubmitted transaction.

## Remarks

**Privacy-sensitive type.** The `unprovenTx` field carries the
`UnprovenTransaction` that the underlying zero-knowledge proofs were
designed to keep confidential, and `newCoins` includes shielded coin
material that should not leak.

Application code should not log, serialize, or transmit instances of this
type without explicit field filtering. Destructure the specific public
fields the consumer needs rather than spreading or stringifying the entire
object.

The framework deliberately exposes these references to support retry,
replay, monitoring, and debug workflows that require access to the
underlying transaction structure.

## Properties

### newCoins

> `readonly` **newCoins**: `ShieldedCoinInfo`[]

New coins created during the construction of the transaction.

***

### unprovenTx

> `readonly` **unprovenTx**: `UnprovenTransaction`

The unproven ledger transaction produced.
