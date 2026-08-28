[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / BlockContext

# Type Alias: BlockContext

> **BlockContext** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:334

Context information about the block forwarded to [CallContext](CallContext.md).

## Properties

### lastBlockTime

> **lastBlockTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:351

The [secondsSinceEpoch](#secondssinceepoch) of the previous block

***

### parentBlockHash

> **parentBlockHash**: `string`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:347

The hash of the block prior to this transaction, as a hex-encoded string

***

### secondsSinceEpoch

> **secondsSinceEpoch**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:338

The seconds since the UNIX epoch that have elapsed

***

### secondsSinceEpochErr

> **secondsSinceEpochErr**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:343

The maximum error on [secondsSinceEpoch](#secondssinceepoch) that should occur, as a
positive seconds value
