[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / ForeignLedgerTransactionReason

# Type Alias: ForeignLedgerTransactionReason

> **ForeignLedgerTransactionReason** = `Exclude`\<`FrameworkInstanceCheck`, `"own"` \| `"not-a-transaction"`\>

Why `LedgerTransaction.seal` refused a transaction object: it belongs to
another WASM instance of the ledger package, or the framework has not loaded
its v8 ledger yet, so no v8 object can be judged.
