[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ProofProviderHandlers

# Type Alias: ProofProviderHandlers

> **ProofProviderHandlers** = \{ readonly \[E in LedgerEra\]: ((tx: LedgerTransaction\<"Unproven", E\>, config?: ProveTxConfig) =\> Promise\<TransactionAnswer\>) \| undefined \}

The per-era handlers [createProofProviderFromHandlers](../functions/createProofProviderFromHandlers.md) assembles a
[ProofProvider](../interfaces/ProofProvider.md) from: one key per ledger era, a handler for an era the
provider serves and `undefined` for one it does not.

A handler receives the handle of its own era. It decodes it with its own
ledger copy (`tx.deserialize({ v9: Transaction })`), or passes
`tx.serialize()` to a prover that takes bytes. To prove a v8 transaction
with `proveLedger8Transaction`, decode it with the framework's class,
`(await loadLedger8Protocol()).Transaction`. It answers with a transaction
object of any ledger copy, or with its bytes. The answer is decoded once,
so a corrupt body is refused at `proveTx`.
