[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / UnsubmittedTxDataBase

# Interface: UnsubmittedTxDataBase

What every era carries alongside the transaction it composed.

The composed transaction itself is NOT here: the eras express it differently
— a live `UnprovenTransaction` in the current era, serialized bytes in a
retained one — and only the coin list is the same shape on both sides.

## Remarks

**Privacy-sensitive.** `newCoins` is shielded coin material.

## Extended by

- [`UnsubmittedTxData`](../../contracts/interfaces/UnsubmittedTxData.md)
- [`CallResultPrivate`](../../contracts/namespaces/Ledger8/interfaces/CallResultPrivate.md)
- [`CallResultPrivate`](../../../midnight-js-contracts/index/namespaces/Ledger8/interfaces/CallResultPrivate.md)
- [`UnsubmittedTxData`](../../../midnight-js-contracts/index/interfaces/UnsubmittedTxData.md)

## Properties

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.
