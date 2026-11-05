[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / TransactionDecoders

# Type Alias: TransactionDecoders

> **TransactionDecoders** = `Readonly`\<`Partial`\<`Record`\<[`LedgerEra`](../../type-aliases/LedgerEra.md), [`TransactionDecoder`](../interfaces/TransactionDecoder.md)\>\>\>

One `Transaction` class per ledger era. Only the class of the handle's own era is called.
