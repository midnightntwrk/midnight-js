[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / CallTxOptionsWithPrivateStateId

# Type Alias: CallTxOptionsWithPrivateStateId\<C, K\>

> **CallTxOptionsWithPrivateStateId**\<`C`, `K`\> = [`CallTxOptionsBase`](CallTxOptionsBase.md)\<`C`, `K`\> & `object`

A retained-era call transaction configuration that also names where to store
the private state the call produces.

## Type Declaration

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../../../../midnight-js/types/type-aliases/PrivateStateId.md)

The identifier for the private state of the contract.

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)

### K

`K` *extends* [`CircuitId`](CircuitId.md)\<`C`\>
