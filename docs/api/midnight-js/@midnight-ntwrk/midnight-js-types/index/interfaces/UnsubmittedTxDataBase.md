[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / UnsubmittedTxDataBase

# Interface: UnsubmittedTxDataBase

What every era carries alongside the transaction it composed.

The composed transaction itself is NOT here: each era's own unsubmitted data
carries it as `unprovenTx`, an `UnprovenTx` handle of that era, beside the
fields only that era has.

## Remarks

**Privacy-sensitive.** `newCoins` is shielded coin material.

## Properties

### newCoins

> `readonly` **newCoins**: [`ShieldedCoinInfo`](https://github.com/midnightntwrk/midnight-ledger)[]

New coins created for the caller during the construction of the
transaction. Empty when the call minted nothing to the caller's own key.
