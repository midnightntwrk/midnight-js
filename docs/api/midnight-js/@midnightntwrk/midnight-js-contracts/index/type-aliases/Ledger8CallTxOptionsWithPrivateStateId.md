[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8CallTxOptionsWithPrivateStateId

# Type Alias: Ledger8CallTxOptionsWithPrivateStateId\<C, PCK\>

> **Ledger8CallTxOptionsWithPrivateStateId**\<`C`, `PCK`\> = [`Ledger8CallTxOptionsBase`](Ledger8CallTxOptionsBase.md)\<`C`, `PCK`\> & `object`

A ledger 8 call transaction configuration that also names where to store
the private state the call produces.

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)

### PCK

`PCK` *extends* [`Ledger8CircuitId`](Ledger8CircuitId.md)\<`C`\>

## Type Declaration

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../../midnight-js/types/type-aliases/PrivateStateId.md)

The identifier for the private state of the contract.
