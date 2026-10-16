[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / Ledger9Transaction

# Interface: Ledger9Transaction\<T\>

The v9 variant of every transaction payload passed to a provider method: the live
ledger object, carried directly because the caller and the provider share the v9
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
