[**Midnight.js API Reference v5.0.1-rc.1**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / TransactionDecodersFor

# Type Alias: TransactionDecodersFor\<D, E\>

> **TransactionDecodersFor**\<`D`, `E`\> = \[`Extract`\<keyof `D`, `E`\>\] *extends* \[`never`\] ? `never` : `D`

Decoders `D` that can read a handle of era `E`, or `never` when `D` has no class for any era `E`
can be, so such a call does not compile.

## Type Parameters

### D

`D` *extends* [`TransactionDecoders`](TransactionDecoders.md)

### E

`E` *extends* `LedgerEra`
