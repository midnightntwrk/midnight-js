[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-types](../README.md) / EraArmRequest

# Type Alias: EraArmRequest\<T, H\>

> **EraArmRequest**\<`T`, `H`\> = \{ `era`: `CurrentLedgerVersion`; `tx`: `T`; \} \| \{ `era`: `RetainedLedgerVersion`; `handler`: `H`; `txBytes`: `Uint8Array`; \}

A tagged payload narrowed to the arm that will serve it: either the live
current-era object, or a retained era's bytes together with the handler
registered for that era.

## Type Parameters

### T

`T`

The current era's ledger transaction type at this seam.

### H

`H`

The retained-era handler signature at this seam.
