[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / NormalizedCost

# Type Alias: NormalizedCost

> **NormalizedCost** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1353

A normalized form of [SyntheticCost](SyntheticCost.md).

## Properties

### blockUsage

> **blockUsage**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1365

The number of bytes of blockspace used

***

### bytesChurned

> **bytesChurned**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1373

The number of (modelled) bytes written temporarily or overwritten.

***

### bytesWritten

> **bytesWritten**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1369

The net number of (modelled) bytes written, i.e. max(0, absolute written bytes less deleted bytes).

***

### computeTime

> **computeTime**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1361

The amount of (modelled) time spent in single-threaded compute, measured in picoseconds.

***

### readTime

> **readTime**: `number`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1357

The amount of (modelled) time spent reading from disk, measured in picoseconds.
