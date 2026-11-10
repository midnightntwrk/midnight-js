[**Midnight.js API Reference v5.0.0-rc.6**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8CircuitCallTxInterface

# Type Alias: Ledger8CircuitCallTxInterface\<C\>

> **Ledger8CircuitCallTxInterface**\<`C`\> = `{ [PCK in Ledger8CircuitId<C>]: { (args: Ledger8CircuitParameters<C, PCK>): Promise<Ledger8FinalizedCallTxData<C, PCK>>; (txCtx: Ledger8TransactionContext<C, PCK>, args: Ledger8CircuitParameters<C, PCK>): Promise<Ledger8UnsubmittedCallTxData<C, PCK>> } }`

Lifts every circuit a retained-era contract declares to a function that
builds and submits a call transaction against one address.

Two signatures per circuit, as `Ledger9CircuitCallTxInterface` has: called with a
[Ledger8TransactionContext](../interfaces/Ledger8TransactionContext.md) first, the call joins that scope instead of being submitted on
its own. A scope made after the hard fork is a ledger 9 one, which a retained-era call cannot join
(`EraMismatchError`, reason `'ledger8-call-in-scope'`).

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)
