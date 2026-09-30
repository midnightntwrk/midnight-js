[**Midnight.js API Reference v5.0.0-rc.3**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CircuitId

# Type Alias: CircuitId\<C\>

> **CircuitId**\<`C`\> = keyof `C`\[`"provableCircuits"`\] & `string`

The name of a callable circuit on a retained-era contract.

Keyed off `provableCircuits`, NOT `impureCircuits`: `provableCircuits` is the
map compact-js indexes to run a circuit, and the one the deploy pre-check
demands a verifier key for. Naming the other map lets an artifact whose two
maps differ ask for a key the caller cannot name, which is unsatisfiable.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)
