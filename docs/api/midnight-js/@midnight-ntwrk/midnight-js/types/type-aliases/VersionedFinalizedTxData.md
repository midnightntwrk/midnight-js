[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / VersionedFinalizedTxData

# Type Alias: VersionedFinalizedTxData

> **VersionedFinalizedTxData** = [`FinalizedTxDataV8`](../interfaces/FinalizedTxDataV8.md) \| [`FinalizedTxData`](../interfaces/FinalizedTxData.md)

A finalized transaction record, discriminated by which ledger runtime
produced it. Both arms carry identical metadata; only `tx`'s type and the
`version` discriminant differ.

The providers in this framework resolve `version` from the record's own
`protocolVersion` at the one construction point per provider, and throw
rather than mislabel a record from an era they cannot decode. Nothing in the
type system obliges a third-party `PublicDataProvider` to do the same, so the
discriminant is exactly as trustworthy as the provider that produced it.
