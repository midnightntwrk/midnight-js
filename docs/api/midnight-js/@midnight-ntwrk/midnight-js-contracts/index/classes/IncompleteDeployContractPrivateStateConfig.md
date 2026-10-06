[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / IncompleteDeployContractPrivateStateConfig

# Class: IncompleteDeployContractPrivateStateConfig

An error indicating that an initial private state was specified for a contract deploy while a
private state ID was not. We can't store the initial private state if we don't have a private state ID,
and we need to let the user know that.

Raised by the RETAINED-era deploy arm, which is its only throw site today. It stays on the flat
surface rather than under the `Ledger8` namespace because it is the deploy member of the
three-refusal family `IncompleteCallTxPrivateStateConfig` and
[IncompleteFindContractPrivateStateConfig](IncompleteFindContractPrivateStateConfig.md) belong to — one client-side rule per entry
point, and client-side storage is era-independent.

## Extends

- `Error`

## Constructors

### Constructor

> **new IncompleteDeployContractPrivateStateConfig**(): `IncompleteDeployContractPrivateStateConfig`

#### Returns

`IncompleteDeployContractPrivateStateConfig`

#### Overrides

`Error.constructor`
