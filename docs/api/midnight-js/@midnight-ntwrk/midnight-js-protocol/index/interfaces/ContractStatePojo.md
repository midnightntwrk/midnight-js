[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / ContractStatePojo

# Interface: ContractStatePojo

A contract state as plain data: the primary state in its encoded form, and
the entry points the state declares.

`entryPoints` is an ARRAY, not a map keyed by circuit id: two distinct byte
entry points can decode to the same name, and a caller has to reconcile
them.

## See

[FailClosedDecoding](../../documents/FailClosedDecoding.md)

## Properties

### entryPoints

> `readonly` **entryPoints**: readonly [`ContractEntryPointPojo`](ContractEntryPointPojo.md)[]

***

### state

> `readonly` **state**: [`EncodedStateValue`](https://github.com/midnightntwrk/midnight-ledger)
