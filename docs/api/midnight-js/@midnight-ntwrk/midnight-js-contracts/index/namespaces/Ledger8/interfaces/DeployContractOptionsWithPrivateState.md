[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployContractOptionsWithPrivateState

# Interface: DeployContractOptionsWithPrivateState\<C\>

Deploy configuration for a retained-era contract that carries private state,
naming where the state the constructor produces is stored.

Both members together or neither: a state with no id has nowhere to go, and
an id with no state stores `undefined` under a name a later call will read
back. `IncompleteDeployContractPrivateStateConfig` reports the first pairing
at run time for a caller that reached it through an untyped route; the type
refuses both. The current era's `DeployContractOptionsWithPrivateState` is
the same shape for the same reason.

## Extends

- `Ledger8DeployContractOptionsShared`\<`C`\>

## Type Parameters

### C

`C` *extends* [`Contract`](Contract.md)

## Properties

### compiledContract

> `readonly` **compiledContract**: `C`

#### Inherited from

`Ledger8DeployContractOptionsShared.compiledContract`

***

### initialPrivateState

> `readonly` **initialPrivateState**: [`PrivateState`](../type-aliases/PrivateState.md)\<`C`\>

The private state the constructor runs against.

#### Remarks

**Privacy-sensitive.**

***

### privateStateId

> `readonly` **privateStateId**: `string`

An identifier for the private state of the contract being deployed.

***

### signingKey?

> `readonly` `optional` **signingKey?**: `string`

The signing key to register as the deployed contract's maintenance
authority. If undefined, a fresh one is sampled.

#### Inherited from

`Ledger8DeployContractOptionsShared.signingKey`
