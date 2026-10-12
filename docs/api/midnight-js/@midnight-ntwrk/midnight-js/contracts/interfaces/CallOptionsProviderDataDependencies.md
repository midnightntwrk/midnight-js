[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallOptionsProviderDataDependencies

# Interface: CallOptionsProviderDataDependencies

Data retrieved via providers that should be included in the call options.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

The Zswap public key of the current user.

***

### config

> `readonly` **config**: [`MidnightConfig`](../../types/interfaces/MidnightConfig.md)

Network and transaction settings, normally `providers.config`.

***

### initialContractState

> `readonly` **initialContractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

The initial public state of the contract to run the circuit against.

***

### initialZswapChainState

> `readonly` **initialZswapChainState**: [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

The initial public Zswap state of the contract to run the circuit against.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

The ledger parameters to use when executing the circuit.
