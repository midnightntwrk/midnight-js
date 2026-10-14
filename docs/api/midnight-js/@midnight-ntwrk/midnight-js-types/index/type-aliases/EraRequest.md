[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../../README.md) / [index](../README.md) / EraRequest

# Type Alias: EraRequest\<T, H\>

> **EraRequest**\<`T`, `H`\> = \{ `era`: `CurrentLedgerVersion`; `tx`: `T`; \} \| \{ `era`: `RetainedLedgerVersion`; `handler`: `H`; `txBytes`: `Uint8Array`; \}

A tagged payload narrowed to the era that will serve it: either the live
current-era object, or a retained era's bytes together with the handler
registered for that era.

## Type Parameters

### T

`T`

The current era's ledger transaction type at this seam.

### H

`H`

The retained-era handler signature at this seam.
