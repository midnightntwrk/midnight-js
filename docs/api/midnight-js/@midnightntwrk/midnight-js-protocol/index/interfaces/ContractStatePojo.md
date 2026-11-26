[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ContractStatePojo

# Interface: ContractStatePojo

A contract state as plain data: the primary state in its encoded form, the
balances the contract holds, and the entry points the state declares.

`entryPoints` is an ARRAY, not a map keyed by circuit id: two distinct byte
entry points can decode to the same name, and a caller has to reconcile
them.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Properties

### balance

> `readonly` **balance**: [`ContractBalance`](../type-aliases/ContractBalance.md)

The balances the contract holds, which are NOT part of the primary state:
the ledger keeps them beside it, so a caller reading only `state` cannot
reach them. A ledger 8 call that executes without them runs every
circuit against an empty balance — see [Ledger8Execution](../../documents/Ledger8Execution.md).

***

### entryPoints

> `readonly` **entryPoints**: readonly [`ContractEntryPointPojo`](ContractEntryPointPojo.md)[]

***

### state

> `readonly` **state**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)
