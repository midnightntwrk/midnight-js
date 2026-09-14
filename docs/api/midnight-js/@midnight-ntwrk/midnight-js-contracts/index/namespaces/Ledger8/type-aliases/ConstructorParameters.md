[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / ConstructorParameters

# Type Alias: ConstructorParameters\<C\>

> **ConstructorParameters**\<`C`\> = `Parameters`\<`C`\[`"initialState"`\]\> *extends* \[`unknown`, `...(infer A)`\] ? `A` : `never`[]

The arguments a retained-era CONSTRUCTOR takes, with the framework-built
context stripped — the constructor counterpart of
[Ledger8CircuitParameters](CircuitParameters.md), and it follows the same rule: a constructor
whose parameters are not tuple-shaped falls to `never[]`, not to `never`, so
the caller is asked for an `args` it cannot supply rather than told there is
nothing to supply.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)
