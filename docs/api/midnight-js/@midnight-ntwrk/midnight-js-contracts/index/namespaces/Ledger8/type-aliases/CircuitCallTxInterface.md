[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CircuitCallTxInterface

# Type Alias: CircuitCallTxInterface\<C\>

> **CircuitCallTxInterface**\<`C`\> = `{ [K in CircuitId<C>]: (args: CircuitParameters<C, K>) => Promise<FinalizedCallTxData<C, K>> }`

Lifts every circuit a retained-era contract declares to a function that
builds and submits a call transaction against one address.

ONE signature per circuit, where the current era's `CircuitCallTxInterface`
has two: the retained era cannot join a scoped transaction — a scope refuses
a retained-era call with `MixedEraScopeError` — so there is no context-taking
arm to declare.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)
