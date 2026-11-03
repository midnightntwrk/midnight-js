[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / ContractStates

# Type Alias: ContractStates\<PS\>

> **ContractStates**\<`PS`\> = [`PublicStatesRead`](../../../midnight-js/types/interfaces/PublicStatesRead.md) & `object`

The publicly visible states of a contract, as bytes, together with the private state of the
contract. Decode a public state with your own runtime, e.g.
`states.contractState.deserialize({ v9: ContractState })`.

## Type Declaration

### privateState

> `readonly` **privateState**: `PS`

The private state of a contract.

## Type Parameters

### PS

`PS`
