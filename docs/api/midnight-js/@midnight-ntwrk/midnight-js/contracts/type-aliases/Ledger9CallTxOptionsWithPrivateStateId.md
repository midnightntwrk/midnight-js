[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9CallTxOptionsWithPrivateStateId

# Type Alias: Ledger9CallTxOptionsWithPrivateStateId\<C, PCK\>

> **Ledger9CallTxOptionsWithPrivateStateId**\<`C`, `PCK`\> = [`Ledger9CallTxOptionsBase`](Ledger9CallTxOptionsBase.md)\<`C`, `PCK`\> & `object`

Call transaction options with the private state ID to use to store the new private
state resulting from the circuit call. Since a private state should already be
stored at the given private state ID, we don't need an 'initialPrivateState' like
in [Ledger9DeployTxOptionsWithPrivateState](Ledger9DeployTxOptionsWithPrivateState.md).

## Type Declaration

### privateStateId

> `readonly` **privateStateId**: [`PrivateStateId`](../../types/type-aliases/PrivateStateId.md)

The identifier for the private state of the contract.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

### PCK

`PCK` *extends* [`Contract.ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>
