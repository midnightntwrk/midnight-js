[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / ContractStates

# Interface: ContractStates\<PS\>

Defined in: packages/contracts/dist/index.d.ts:345

Object containing the publicly visible states of a contract and the private
state of a contract.

## Extends

- [`PublicContractStates`](PublicContractStates.md)

## Type Parameters

### PS

`PS`

## Properties

### contractState

> `readonly` **contractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:335

The (public) ledger state of a contract.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`contractState`](PublicContractStates.md#contractstate)

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:339

The ledger parameters in effect on the block associated with the contract state.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`ledgerParameters`](PublicContractStates.md#ledgerparameters)

***

### privateState

> `readonly` **privateState**: `PS`

Defined in: packages/contracts/dist/index.d.ts:349

The private state of a contract.

***

### zswapChainState

> `readonly` **zswapChainState**: [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:331

The (public) Zswap chain state of a contract.

#### Inherited from

[`PublicContractStates`](PublicContractStates.md).[`zswapChainState`](PublicContractStates.md#zswapchainstate)
