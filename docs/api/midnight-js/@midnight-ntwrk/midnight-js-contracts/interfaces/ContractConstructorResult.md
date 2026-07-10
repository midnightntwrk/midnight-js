[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ContractConstructorResult

# Interface: ContractConstructorResult\<C\>

The updated states resulting from executing a contract constructor.

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### nextContractState

> `readonly` **nextContractState**: `ContractState`

The public state resulting from executing the contract constructor.

***

### nextPrivateState

> `readonly` **nextPrivateState**: `PrivateState`\<`C`\>

The private state resulting from executing the contract constructor.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: `ZswapLocalState`

The Zswap local state resulting from executing the contract constructor.
