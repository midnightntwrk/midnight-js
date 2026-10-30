[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8CircuitCallTxInterface

# Type Alias: Ledger8CircuitCallTxInterface\<C\>

> **Ledger8CircuitCallTxInterface**\<`C`\> = `{ [PCK in Ledger8CircuitId<C>]: (args: Ledger8CircuitParameters<C, PCK>) => Promise<Ledger8FinalizedCallTxData<C, PCK>> }`

Lifts every circuit a retained-era contract declares to a function that
builds and submits a call transaction against one address.

ONE signature per circuit, where `Ledger9CircuitCallTxInterface`
has two: the retained era cannot join a scoped transaction — a scope refuses
a retained-era call with `EraMismatchError` (reason `'ledger8-call-in-scope'`) — so there is no context-taking
overload to declare.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)
