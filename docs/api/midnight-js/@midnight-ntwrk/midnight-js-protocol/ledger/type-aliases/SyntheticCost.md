[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / SyntheticCost

# Type Alias: SyntheticCost

> **SyntheticCost** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1327

A modelled cost of a transaction or block.

## Properties

### blockUsage

> **blockUsage**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1339

The number of bytes of blockspace used

***

### bytesChurned

> **bytesChurned**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1347

The number of (modelled) bytes written temporarily or overwritten.

***

### bytesWritten

> **bytesWritten**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1343

The net number of (modelled) bytes written, i.e. max(0, absolute written bytes less deleted bytes).

***

### computeTime

> **computeTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1335

The amount of (modelled) time spent in single-threaded compute, measured in picoseconds.

***

### readTime

> **readTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:1331

The amount of (modelled) time spent reading from disk, measured in picoseconds.
