[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [types](../README.md) / V9Tx

# Interface: V9Tx\<T\>

The v9 arm of every transaction payload crossing a provider seam: the live
ledger object, carried directly because both sides of the seam share the v9
WASM instance.

## Type Parameters

### T

`T`

The v9 ledger transaction type for the pipeline stage in
               question — unproven, unbound, or finalized.

## Properties

### tx

> `readonly` **tx**: `T`

***

### version

> `readonly` **version**: `"v9"`
