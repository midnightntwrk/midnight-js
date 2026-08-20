[**Midnight.js API Reference v5.0.0-beta.6**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / PublicContractStates

# Interface: PublicContractStates

Object containing the publicly visible states of a contract.

## Extended by

- [`ContractStates`](ContractStates.md)

## Properties

### contractState

> `readonly` **contractState**: [`ContractState`](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

The (public) ledger state of a contract.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

The ledger parameters in effect on the block associated with the contract state.

***

### zswapChainState

> `readonly` **zswapChainState**: [`ZswapChainState`](../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

The (public) Zswap chain state of a contract.
