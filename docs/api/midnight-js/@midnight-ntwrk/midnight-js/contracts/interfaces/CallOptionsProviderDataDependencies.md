[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / CallOptionsProviderDataDependencies

# Interface: CallOptionsProviderDataDependencies

Defined in: packages/contracts/dist/index.d.ts:44

Data retrieved via providers that should be included in the call options.

## Properties

### coinPublicKey

> `readonly` **coinPublicKey**: `string`

Defined in: packages/contracts/dist/index.d.ts:48

The Zswap public key of the current user.

***

### initialContractState

> `readonly` **initialContractState**: [`ContractState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:52

The initial public state of the contract to run the circuit against.

***

### initialZswapChainState

> `readonly` **initialZswapChainState**: [`ZswapChainState`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:56

The initial public Zswap state of the contract to run the circuit against.

***

### ledgerParameters

> `readonly` **ledgerParameters**: [`LedgerParameters`](https://github.com/midnightntwrk/midnight-ledger)

Defined in: packages/contracts/dist/index.d.ts:60

The ledger parameters to use when executing the circuit.
