[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallTxTarget

# Interface: CallTxTarget\<C, K\>

The target of a retained-era circuit invocation, without its arguments.

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

### K

`K` *extends* [`CircuitId`](../type-aliases/CircuitId.md)\<`C`\>

## Properties

### circuitId

> `readonly` **circuitId**: `K`

The identifier of the circuit to call.

***

### compiledContract

> `readonly` **compiledContract**: `C`

The retained-era contract instance, passed raw — there is no
`CompiledContract` container for this era.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of the contract being called.
