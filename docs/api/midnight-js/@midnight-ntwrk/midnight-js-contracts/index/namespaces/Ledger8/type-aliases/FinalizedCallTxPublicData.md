[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / FinalizedCallTxPublicData

# Type Alias: FinalizedCallTxPublicData

> **FinalizedCallTxPublicData** = [`CallResultPublic`](../interfaces/CallResultPublic.md) & [`VersionedFinalizedTxData`](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md)

The public data of a finalized retained-era call: the execution's public half
combined with the finalized record.

The record stays [VersionedFinalizedTxData](../../../../../midnight-js/types/type-aliases/VersionedFinalizedTxData.md) rather than being narrowed
to the current era's `FinalizedTxData`. A retained-era call is recorded by
whichever era the network head is on, so `version` is a union here where the
current era pins `'v9'` -- narrowing it would refuse the very records this
pipeline exists to produce.
