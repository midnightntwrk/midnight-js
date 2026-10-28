[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / VersionedFinalizedTxData

# Type Alias: VersionedFinalizedTxData

> **VersionedFinalizedTxData** = [`Ledger8FinalizedTxData`](../interfaces/Ledger8FinalizedTxData.md) \| [`FinalizedTxData`](../interfaces/FinalizedTxData.md)

A finalized transaction record, discriminated by which ledger runtime
produced it. Both variants carry identical metadata and a [FinalizedTx](FinalizedTx.md)
handle of their own era, so narrowing on `version` narrows `tx.era` with it.
Read the transaction with `LedgerTransaction.unwrap(record.tx, record.version)`.

The providers in this framework resolve `version` from the record's own
`protocolVersion` at the one construction point per provider, and throw
rather than mislabel a record from an era they cannot decode. Nothing in the
type system obliges a third-party `PublicDataProvider` to do the same, so the
discriminant is exactly as trustworthy as the provider that produced it.
