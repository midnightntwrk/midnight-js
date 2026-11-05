[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / DecodedTransaction

# Type Alias: DecodedTransaction\<D, E, S\>

> **DecodedTransaction**\<`D`, `E`, `S`\> = `E` *extends* keyof `D` ? `StageTypesOf`\<`NonNullable`\<`D`\[`E`\]\>\>\[`S`\] : `never`

What `deserialize` returns for decoders `D`, a handle of era `E` and stage `S`: the transaction
type of the caller's own class at that stage.

## Type Parameters

### D

`D` *extends* [`TransactionDecoders`](TransactionDecoders.md)

### E

`E` *extends* `LedgerEra`

### S

`S` *extends* [`TransactionStage`](TransactionStage.md)
