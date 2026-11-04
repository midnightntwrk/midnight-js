[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9DeployTxOptionsWithPrivateStateId

# Type Alias: Ledger9DeployTxOptionsWithPrivateStateId\<C\>

> **Ledger9DeployTxOptionsWithPrivateStateId**\<`C`\> = [`Ledger9DeployTxOptionsWithPrivateState`](Ledger9DeployTxOptionsWithPrivateState.md)\<`C`\> & `object`

Configuration for creating deploy transactions for contracts with private state. This
configuration is used when a deployment transaction is created and an initial private
state needs to be stored, as is the case in [submitDeployTx](../functions/submitDeployTx.md).

## Type Declaration

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md)

The identifier for the private state of the contract.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
