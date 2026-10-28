[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / MidnightProviderHandlers

# Type Alias: MidnightProviderHandlers

> **MidnightProviderHandlers** = \{ readonly \[E in LedgerVersion\]: ((tx: LedgerTransactionTypes\[E\]\["Finalized"\]) =\> Promise\<TransactionId\>) \| undefined \}

The per-era handlers [createMidnightProviderFromHandlers](../functions/createMidnightProviderFromHandlers.md) assembles a
[MidnightProvider](../interfaces/MidnightProvider.md) from: one key per ledger era, a handler for an era
the provider submits and `undefined` for one it does not.

A handler takes an object of the ledger copy this framework loaded for its
era. A handler that hands the transaction to another ledger copy serializes
it on the way out.
