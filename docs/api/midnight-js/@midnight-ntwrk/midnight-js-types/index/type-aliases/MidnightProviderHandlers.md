[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / MidnightProviderHandlers

# Type Alias: MidnightProviderHandlers

> **MidnightProviderHandlers** = \{ readonly \[E in LedgerEra\]: ((tx: LedgerTransaction\<"Finalized", E\>) =\> Promise\<TransactionId\>) \| undefined \}

The per-era handlers [createMidnightProviderFromHandlers](../functions/createMidnightProviderFromHandlers.md) assembles a
[MidnightProvider](../interfaces/MidnightProvider.md) from: one key per ledger era, a handler for an era
the provider submits and `undefined` for one it does not.

A handler receives the handle of its own era, and passes `tx.serialize()` to
the node or wallet that submits it.
