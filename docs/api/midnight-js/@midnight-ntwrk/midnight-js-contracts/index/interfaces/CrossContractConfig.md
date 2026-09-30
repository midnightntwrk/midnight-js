[**Midnight.js API Reference v5.0.0-rc.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / CrossContractConfig

# Interface: CrossContractConfig

Enables cross-contract calls during circuit execution.

## Properties

### blockHash

> `readonly` **blockHash**: `string`

The block at which all contract states are read; must be the block at which the initial states
given to the call were read.

***

### moduleProvider?

> `readonly` `optional` **moduleProvider?**: [`ContractModuleProvider`](https://github.com/LFDT-Minokawa/compact)

Resolves a callee's address to the module implementing it. Absent when the application
registered none, which a circuit that actually makes a call then fails on.

***

### publicDataProvider

> `readonly` **publicDataProvider**: [`PublicDataProvider`](../../../midnight-js/types/interfaces/PublicDataProvider.md)

Resolves the states of cross-contract call targets.
