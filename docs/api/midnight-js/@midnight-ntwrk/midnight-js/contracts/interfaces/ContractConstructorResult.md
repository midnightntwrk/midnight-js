[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractConstructorResult

# Interface: ContractConstructorResult\<C\>

The updated states resulting from executing a contract constructor.

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### era

> `readonly` **era**: `"ledger9"`

The pipeline that produced this result: always the current era here.

Read off the compiled artifact, NEVER off a transaction record — the two
facts disagree after the fork, and only this one says which module the
objects in this result came from.

***

### nextContractState

> `readonly` **nextContractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The public state resulting from executing the contract constructor.

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state resulting from executing the contract constructor.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](https://github.com/LFDT-Minokawa/compact)

The Zswap local state resulting from executing the contract constructor.
