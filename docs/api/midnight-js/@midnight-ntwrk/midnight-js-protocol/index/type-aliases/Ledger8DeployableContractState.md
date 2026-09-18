[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / Ledger8DeployableContractState

# Type Alias: Ledger8DeployableContractState

> **Ledger8DeployableContractState** = `Pick`\<`OnchainRuntimeV3.ContractState`, `"serialize"`\>

The minimal shape a pre-fork (`compact-runtime@0.16`) `ContractState` is used
through here: just `.serialize()`. It is what executeConstructor
returns on its result, and `.serialize()` is how a caller turns that handle
into the bytes every deploy leg takes.

Crosses the era boundary by bytes, not by handle.

## See

 - [DualInstantiationGuard](../../documents/DualInstantiationGuard.md) for why that crossing is the one a
     duplicate install cannot affect
 - [EraSeam](../../documents/EraSeam.md)
