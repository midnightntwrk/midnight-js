[**Midnight.js API Reference v5.0.0-beta.8**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../../README.md) / [contracts](../../../README.md) / [Ledger8](../README.md) / DeployContractOptionsBase

# Interface: DeployContractOptionsBase\<C\>

The deploy arm for a retained-era contract whose private state is stored
NOWHERE: the constructor runs against `undefined` and nothing is written.

The other arm is [Ledger8DeployContractOptionsWithPrivateState](DeployContractOptionsWithPrivateState.md).

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

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: `undefined`

DECLARED on this arm, and only ever `undefined` — see
[Ledger8DeployContractOptionsBase.privateStateId](#privatestateid) for why the member
is present rather than absent.

***

### privateStateId?

> `readonly` `optional` **privateStateId?**: `undefined`

DECLARED on this arm, and only ever `undefined`.

Left off the arm entirely, `{ compiledContract, privateStateId: 'x' }`
compiled: union excess-property checking admits a member declared on the
SIBLING arm as long as one arm is satisfied, and `compiledContract` alone
satisfies this one. The constructor then ran against `undefined`,
`undefined` was stored under the caller's id, and the handle reported an
`initialPrivateState` typed non-optional while actually undefined.

***

### signingKey?

> `readonly` `optional` **signingKey?**: `string`

The signing key to register as the deployed contract's maintenance
authority. If undefined, a fresh one is sampled.

#### Inherited from

[`DeployContractOptionsWithPrivateState`](DeployContractOptionsWithPrivateState.md).[`signingKey`](DeployContractOptionsWithPrivateState.md#signingkey)
