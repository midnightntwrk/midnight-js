[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / TransactionAnswer

# Type Alias: TransactionAnswer

> **TransactionAnswer** = \{ `serialize`: `Uint8Array`; \} \| `Uint8Array`

What a handler of `createProofProviderFromHandlers` or `createWalletProviderFromHandlers` answers
with: a transaction object of any ledger copy, or its bytes. The provider makes the handle, in the
era of the request and at the stage the method produces.
