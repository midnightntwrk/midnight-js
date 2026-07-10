[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / ContractStates

# Interface: ContractStates\<PS\>

Object containing the publicly visible states of a contract and the private
state of a contract.

## Extends

- [`PublicContractStates`](PublicContractStates.md)

## Type Parameters

### PS

`PS`

## Properties

### contractState

> `readonly` **contractState**: `ContractState`

The (public) ledger state of a contract.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`contractState`](PublicContractStates.md#contractstate)

***

### ledgerParameters

> `readonly` **ledgerParameters**: `LedgerParameters`

The ledger parameters in effect on the block associated with the contract state.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`ledgerParameters`](PublicContractStates.md#ledgerparameters)

***

### privateState

> `readonly` **privateState**: `PS`

The private state of a contract.

***

### zswapChainState

> `readonly` **zswapChainState**: `ZswapChainState`

The (public) Zswap chain state of a contract.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`zswapChainState`](PublicContractStates.md#zswapchainstate)
