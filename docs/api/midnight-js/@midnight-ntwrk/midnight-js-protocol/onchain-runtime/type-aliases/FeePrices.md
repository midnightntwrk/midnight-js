[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [onchain-runtime](../README.md) / FeePrices

# Type Alias: FeePrices

> **FeePrices** = `object`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:93

The fee prices for transaction

## Properties

### blockUsageFactor

> **blockUsageFactor**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:109

The price factor of block usage.

***

### computeFactor

> **computeFactor**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:105

The price factor of time spent in single-threaded compute.

***

### overallPrice

> **overallPrice**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:97

The overall price of a full block in an average cost dimension.

***

### readFactor

> **readFactor**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:101

The price factor of time spent reading from disk.

***

### writeFactor

> **writeFactor**: `number`

Defined in: node\_modules/@midnightntwrk/onchain-runtime-v4/onchain-runtime-v4.d.ts:113

The price factor of time spent writing to disk.
