[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / CircuitReturnType

# Type Alias: CircuitReturnType\<C, K\>

> **CircuitReturnType**\<`C`, `K`\> = `ReturnType`\<`C`\[`"impureCircuits"`\]\[`K`\]\> *extends* `object` ? `R` : `unknown`

What a retained-era circuit's own return value narrows to.

Derived through `infer` with a fallback rather than read off
[Ledger8CircuitResult](../interfaces/CircuitResult.md), whose `result` is `unknown` because that type is
the ERA DISCRIMINATOR and has to stay wide enough to match any retained
codegen. A concrete contract type narrows it here; anything that does not
falls to `unknown` rather than to `never`, so a caller is handed a value it
has to check instead of one it cannot use.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)

### K

`K` *extends* [`CircuitId`](CircuitId.md)\<`C`\>
