[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8CircuitParameters

# Type Alias: Ledger8CircuitParameters\<C, K\>

> **Ledger8CircuitParameters**\<`C`, `K`\> = `Parameters`\<`C`\[`"provableCircuits"`\]\[`K`\]\> *extends* \[[`Ledger8CircuitContext`](../interfaces/Ledger8CircuitContext.md), `...(infer A)`\] ? `A` : `never`[]

The arguments a caller supplies for circuit `K` on a retained-era contract.

The leading [Ledger8CircuitContext](../interfaces/Ledger8CircuitContext.md) is stripped, exactly as the current
era's `Contract.CircuitParameters` strips its own leading `CircuitContext`:
the context is built by the framework from provider data, never passed in by
the caller.

A circuit whose parameters are not tuple-shaped falls to `never[]`, NOT to `never`: `never`
satisfies `extends []`, so it would make [Ledger8CallTxOptionsBase](Ledger8CallTxOptionsBase.md) report that such a
circuit takes no arguments at all. `never[]` is uninhabited but not empty, so the caller is
asked for an `args` it cannot supply and the mismatch surfaces instead of being swallowed.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### K

`K` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>

## See

[OverloadTyping](../../documents/OverloadTyping.md) for why a caller may not be handed the raw
     `Parameters<...>`.
