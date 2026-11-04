[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9CallOptionsProviderDataDependencies

# Interface: Ledger9CallOptionsProviderDataDependencies

Data retrieved via providers that should be included in the call options.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

The Zswap public key of the current user.

***

### config

> `readonly` **config**: [`MidnightConfig`](../../../midnight-js/types/interfaces/MidnightConfig.md)

Network and transaction settings, normally `providers.config`.

***

### initialContractState

> `readonly` **initialContractState**: [`SerializedContractState`](../../../midnight-js/types/classes/SerializedContractState.md)

The initial public state of the contract to run the circuit against, as read: pass
`read.contractState` of a `PublicDataProvider` read. It must be written by the v9 ledger.

***

### initialZswapChainState

> `readonly` **initialZswapChainState**: [`SerializedZswapChainState`](../../../midnight-js/types/classes/SerializedZswapChainState.md)

The initial public Zswap state of the contract to run the circuit against, as read: pass
`read.zswapChainState`. It must be written by the v9 ledger.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`SerializedLedgerParameters`](../../../midnight-js/types/classes/SerializedLedgerParameters.md)

The ledger parameters to use when executing the circuit, as read: pass `read.ledgerParameters`.
They must be written by the v9 ledger.
