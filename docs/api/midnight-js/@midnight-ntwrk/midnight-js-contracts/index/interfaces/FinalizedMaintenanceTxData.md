[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / FinalizedMaintenanceTxData

# Interface: FinalizedMaintenanceTxData

What a contract maintenance update -- a verifier key inserted or removed, or the maintenance
authority replaced -- resolves with once the chain has recorded it.

Nested like every other `contracts` result, so `era` names the pipeline and `public` carries the
record. The retained era's counterpart is `Ledger8FinalizedMaintenanceTxData`; the two together
are `AnyEraMaintenanceTxData`.

## Properties

### era

> `readonly` **era**: `"v9"`

The pipeline that produced this result: always the current era here.

***

### public

> `readonly` **public**: [`FinalizedTxData`](../../../midnight-js/types/interfaces/FinalizedTxData.md)

The finalized record of the maintenance transaction.
