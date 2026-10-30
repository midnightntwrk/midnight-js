[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8FinalizedCallTxPublicData

# Type Alias: Ledger8FinalizedCallTxPublicData

> **Ledger8FinalizedCallTxPublicData** = [`Ledger8CallResultPublic`](../interfaces/Ledger8CallResultPublic.md) & [`FinalizedTxRead`](../../../midnight-js/types/type-aliases/FinalizedTxRead.md)

The public data of a finalized retained-era call: the execution's public half
combined with the finalized record.

The record stays [FinalizedTxRead](../../../midnight-js/types/type-aliases/FinalizedTxRead.md) rather than being narrowed
to `Ledger9FinalizedTxData`. A retained-era call is recorded by
whichever era the network is on, so `era` is a union here where the
current era pins `'v9'` -- narrowing it would refuse the very records this
pipeline exists to produce.
