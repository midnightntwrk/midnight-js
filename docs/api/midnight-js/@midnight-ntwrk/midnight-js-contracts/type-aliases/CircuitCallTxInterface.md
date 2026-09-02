[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CircuitCallTxInterface

# Type Alias: CircuitCallTxInterface\<C\>

> **CircuitCallTxInterface**\<`C`\> = `{ [PCK in ProvableCircuitId<C>]: { (args: CircuitParameters<C, PCK>): Promise<FinalizedCallTxData<C, PCK>>; (txCtx: TransactionContext<C, PCK>, args: CircuitParameters<C, PCK>): Promise<CallResult<C, PCK>> } }`

A type that lifts each circuit defined in a contract to a function that builds
and submits a call transaction.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)
