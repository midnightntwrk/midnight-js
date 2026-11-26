[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8FinalizedMaintenanceTxData

# Interface: Ledger8FinalizedMaintenanceTxData

What a ledger 8 maintenance update resolves with once the chain has recorded it: the
ledger 8 counterpart of `Ledger9FinalizedMaintenanceTxData`.

`public` is always the ledger 8 record. A ledger 8 artifact maintains a contract only before
the fork, so no other era can record the update.

## Properties

### era

> `readonly` **era**: `"v8"`

The pipeline that produced this result: always ledger 8 here.

***

### public

> `readonly` **public**: [`Ledger8FinalizedTxData`](../../types/interfaces/Ledger8FinalizedTxData.md)

The finalized record of the maintenance transaction.
