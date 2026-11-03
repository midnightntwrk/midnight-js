[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ProofProviderHandlers

# Type Alias: ProofProviderHandlers

> **ProofProviderHandlers** = \{ readonly \[E in LedgerVersion\]: ((tx: LedgerTransactionTypes\[E\]\["Unproven"\], config?: ProveTxConfig) =\> Promise\<LedgerTransactionTypes\[E\]\["Unbound"\]\>) \| undefined \}

The per-era handlers [createProofProviderFromHandlers](../functions/createProofProviderFromHandlers.md) assembles a
[ProofProvider](../interfaces/ProofProvider.md) from: one key per ledger era, a handler for an era the
provider serves and `undefined` for one it does not.

A handler takes and returns objects of the ledger copy this framework
loaded for its era. A handler that hands the transaction to another ledger
copy — a wallet SDK, a second install of the ledger package —
serializes it on the way out and decodes the answer into the framework's copy
on the way in, with `deserializeTransactionAtStage` from
`@midnight-ntwrk/midnight-js-protocol/transaction`.
