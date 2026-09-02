[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / CallOptionsProviderDataDependencies

# Interface: CallOptionsProviderDataDependencies

Data retrieved via providers that should be included in the call options.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

The Zswap public key of the current user.

***

### initialContractState

> `readonly` **initialContractState**: [`ContractState`](../../midnight-js-protocol/onchain-runtime/classes/ContractState.md)

The initial public state of the contract to run the circuit against.

***

### initialZswapChainState

> `readonly` **initialZswapChainState**: [`ZswapChainState`](../../midnight-js-protocol/ledger/classes/ZswapChainState.md)

The initial public Zswap state of the contract to run the circuit against.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](../../midnight-js-protocol/ledger/classes/LedgerParameters.md)

The ledger parameters to use when executing the circuit.
