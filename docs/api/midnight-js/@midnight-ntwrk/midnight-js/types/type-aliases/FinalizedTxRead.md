[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / FinalizedTxRead

# Type Alias: FinalizedTxRead

> **FinalizedTxRead** = [`Ledger8FinalizedTxData`](../interfaces/Ledger8FinalizedTxData.md) \| [`Ledger9FinalizedTxData`](../interfaces/Ledger9FinalizedTxData.md)

A finalized transaction record, discriminated by which ledger runtime
produced it. Both variants carry identical metadata and a [FinalizedTx](FinalizedTx.md)
handle of their own era, so narrowing on `era` narrows `tx.era` with it.
Read the transaction with `LedgerTransaction.unwrap(record.tx, record.era)`.

The providers in this framework resolve `era` from the record's own
`protocolVersion` at the one construction point per provider, and throw
rather than mislabel a record from an era they cannot decode. Nothing in the
type system obliges a third-party `PublicDataProvider` to do the same, so the
discriminant is exactly as trustworthy as the provider that produced it.
