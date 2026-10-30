[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9CircuitCallTxInterface

# Type Alias: Ledger9CircuitCallTxInterface\<C\>

> **Ledger9CircuitCallTxInterface**\<`C`\> = `{ [PCK in Contract.ProvableCircuitId<C>]: { (args: CircuitParameters<C, PCK>): Promise<Ledger9FinalizedCallTxData<C, PCK>>; (txCtx: Ledger9TransactionContext<C, PCK>, args: CircuitParameters<C, PCK>): Promise<Ledger9CallResult<C, PCK>> } }`

A type that lifts each circuit defined in a contract to a function that builds
and submits a call transaction.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
