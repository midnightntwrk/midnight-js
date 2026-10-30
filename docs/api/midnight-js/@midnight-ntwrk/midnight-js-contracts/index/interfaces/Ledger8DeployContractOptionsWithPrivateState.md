[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8DeployContractOptionsWithPrivateState

# Interface: Ledger8DeployContractOptionsWithPrivateState\<C\>

Deploy configuration for a retained-era contract that carries private state,
naming where the state the constructor produces is stored.

Both members together or neither: a state with no id has nowhere to go, and
an id with no state stores `undefined` under a name a later call will read
back. The type refuses either half alone, and
`IncompleteDeployContractPrivateStateConfig` refuses it at run time for a
caller that reached it through an untyped route. The current era's
`Ledger9DeployContractOptionsWithPrivateState` is the same shape for the same reason.

## Extends

- `Ledger8DeployContractOptionsShared`\<`C`\>

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](Ledger8Contract.md)

## Properties

### compiledContract

> `readonly` **compiledContract**: `C`

#### Inherited from

`Ledger8DeployContractOptionsShared.compiledContract`

***

### initialPrivateState

> `readonly` **initialPrivateState**: [`Ledger8PrivateState`](../type-aliases/Ledger8PrivateState.md)\<`C`\>

The private state the constructor runs against.

#### Remarks

**Privacy-sensitive.**

***

### privateStateId

> `readonly` **privateStateId**: `string`

An identifier for the private state of the contract being deployed.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to register as the deployed contract's maintenance
authority. If undefined, a fresh one is sampled.

The same `{ tag, value }` shape the current era takes. The retained era
signs with `schnorr` only, so any other key -- or a value that is not
exactly 64 hexadecimal characters -- is refused with
`Ledger8SigningKeyUnusableError` before anything is composed.

#### Inherited from

`Ledger8DeployContractOptionsShared.signingKey`
