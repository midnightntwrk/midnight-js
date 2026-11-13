[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9UnsubmittedTxData

# Interface: Ledger9UnsubmittedTxData

Data relevant to any unsubmitted transaction.

## Remarks

**Privacy-sensitive type.** Every field on this type is private: the
`unprovenTx` field carries the unproven transaction that the underlying
zero-knowledge proofs were designed to keep confidential, and `newCoins`
includes shielded coin material that must not leak.

Application code must not log, serialize, or transmit instances of this
type. The framework deliberately exposes these references to support
retry, replay, debug, and redacted-telemetry workflows that require
access to the underlying transaction structure — raw transmission to
observability platforms (log shippers, error reporters, analytics) is
not an intended use.

## Extends

- [`UnsubmittedTxDataBase`](../../types/interfaces/UnsubmittedTxDataBase.md)

## Extended by

- [`Ledger9UnsubmittedCallTxPrivateData`](Ledger9UnsubmittedCallTxPrivateData.md)
- [`Ledger9UnsubmittedDeployTxPrivateDataFull`](Ledger9UnsubmittedDeployTxPrivateDataFull.md)

## Properties

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.

#### Inherited from

[`UnsubmittedTxDataBase`](../../types/interfaces/UnsubmittedTxDataBase.md).[`newCoins`](../../types/interfaces/UnsubmittedTxDataBase.md#newcoins)

***

### unprovenTx

> `readonly` **unprovenTx**: [`LedgerTransaction`](../../types/classes/LedgerTransaction.md)\<`"Unproven"`, `"v9"`\>

The unproven transaction produced, as a v9 handle. Read it with your own
ledger copy: `unprovenTx.deserialize({ v9: Transaction })`.
