[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / PublicContractStates

# Interface: PublicContractStates

Object containing the publicly visible states of a contract.

## Extended by

- [`ContractStates`](ContractStates.md)

## Properties

### contractState

> `readonly` **contractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The (public) ledger state of a contract.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

The ledger parameters in effect on the block associated with the contract state.

***

### zswapChainState

> `readonly` **zswapChainState**: [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

The (public) Zswap chain state of a contract.
