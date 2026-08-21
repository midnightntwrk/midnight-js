[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ContractConstructorResult

# Interface: ContractConstructorResult\<C\>

The updated states resulting from executing a contract constructor.

## Type Parameters

### C

`C` *extends* [`Any`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

## Properties

### nextContractState

> `readonly` **nextContractState**: [`ContractState`](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

The public state resulting from executing the contract constructor.

***

### nextPrivateState

> `readonly` **nextPrivateState**: [`PrivateState`](../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/PrivateState.md)\<`C`\>

The private state resulting from executing the contract constructor.

***

### nextZswapLocalState

> `readonly` **nextZswapLocalState**: [`ZswapLocalState`](../../midnight-js-protocol/compact-runtime/interfaces/ZswapLocalState.md)

The Zswap local state resulting from executing the contract constructor.
