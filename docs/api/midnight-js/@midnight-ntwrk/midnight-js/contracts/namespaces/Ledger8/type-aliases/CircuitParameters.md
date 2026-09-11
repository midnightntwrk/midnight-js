[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CircuitParameters

# Type Alias: CircuitParameters\<C, K\>

> **CircuitParameters**\<`C`, `K`\> = `Parameters`\<`C`\[`"impureCircuits"`\]\[`K`\]\> *extends* \[[`CircuitContext`](../interfaces/CircuitContext.md), `...(infer A)`\] ? `A` : `never`[]

The arguments a caller supplies for circuit `K` on a retained-era contract.

The leading [Ledger8CircuitContext](../interfaces/CircuitContext.md) is stripped, exactly as the current
era's `Contract.CircuitParameters` strips its own leading `CircuitContext`:
the context is built by the framework from provider data, never passed in by
the caller.

A circuit whose parameters are not tuple-shaped falls to `never[]`, NOT to `never`: `never`
satisfies `extends []`, so it would make [Ledger8CallTxOptionsBase](CallTxOptionsBase.md) report that such a
circuit takes no arguments at all. `never[]` is uninhabited but not empty, so the caller is
asked for an `args` it cannot supply and the mismatch surfaces instead of being swallowed.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)

### K

`K` *extends* [`CircuitId`](CircuitId.md)\<`C`\>

## See

[OverloadTyping](../../../../documents/OverloadTyping.md) for why a caller may not be handed the raw
     `Parameters<...>`.
