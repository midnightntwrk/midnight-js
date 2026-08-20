[**Midnight.js API Reference v5.0.0-beta.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [ledger](../README.md) / RunningCost

# Type Alias: RunningCost

> **RunningCost** = `object`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:71

A running tally of synthetic resource costs.

## Properties

### bytesDeleted

> **bytesDeleted**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:87

The number of (modelled) bytes deleted.

***

### bytesWritten

> **bytesWritten**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:83

The number of (modelled) bytes written.

***

### computeTime

> **computeTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:79

The amount of (modelled) time spent in single-threaded compute, measured in picoseconds.

***

### readTime

> **readTime**: `bigint`

Defined in: node\_modules/@midnightntwrk/ledger-v9/ledger-v9.d.ts:75

The amount of (modelled) time spent reading from disk, measured in picoseconds.
