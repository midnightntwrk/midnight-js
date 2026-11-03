[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8FinalizedMaintenanceTxData

# Interface: Ledger8FinalizedMaintenanceTxData

What a retained-era maintenance update resolves with once the chain has recorded it: the
retained era's counterpart of `Ledger9FinalizedMaintenanceTxData`.

`public` is always the ledger 8 record. A retained-era artifact maintains a contract only before
the fork, so no other era can record the update.

## Properties

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always the retained era here.

***

### public

> `readonly` **public**: [`Ledger8FinalizedTxData`](../../../midnight-js/types/interfaces/Ledger8FinalizedTxData.md)

The finalized record of the maintenance transaction.
