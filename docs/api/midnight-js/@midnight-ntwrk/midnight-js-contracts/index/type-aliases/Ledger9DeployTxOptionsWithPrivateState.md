[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9DeployTxOptionsWithPrivateState

# Type Alias: Ledger9DeployTxOptionsWithPrivateState\<C\>

> **Ledger9DeployTxOptionsWithPrivateState**\<`C`\> = [`Ledger9DeployTxOptionsBase`](Ledger9DeployTxOptionsBase.md)\<`C`\> & `object`

Configuration for creating deploy transactions for contracts with private state. This
configuration used as a base type for the [Ledger9DeployTxOptionsWithPrivateStateId](Ledger9DeployTxOptionsWithPrivateStateId.md) configuration.
It is also used directly as parameter to [createUnprovenDeployTx](../functions/createUnprovenDeployTx.md) which doesn't need
to save private state (and therefore doesn't need a private state ID) but does need to supply an
initial private state to run the contract constructor against.

## Type Declaration

### initialPrivateState

> `readonly` **initialPrivateState**: [`Contract.PrivateState`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>

The private state to run the contract constructor against.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
