[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../../../README.md) / [compact-js](../../../README.md) / [Contract](../README.md) / CircuitReturnType

# Type Alias: CircuitReturnType\<C, K\>

> **CircuitReturnType**\<`C`, `K`\> = `Awaited`\<`ReturnType`\<`C`\[`"provableCircuits"`\]\[`K`\]\>\> *extends* [`CircuitResults`](../../../../compact-runtime/interfaces/CircuitResults.md)\<`any`, infer U\> ? `U` : `never`

Defined in: node\_modules/@midnight-ntwrk/compact-js/dist/dts/effect/Contract.d.ts:33

## Type Parameters

### C

`C` *extends* [`Contract`](../../../interfaces/Contract.md)\<`any`\>

### K

`K` *extends* [`ProvableCircuitId`](ProvableCircuitId.md)\<`C`\>
