[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger8DeployContractOptionsBase

# Interface: Ledger8DeployContractOptionsBase\<C\>

The deploy options variant for a retained-era contract whose private state is stored
NOWHERE: the constructor runs against `undefined` and nothing is written.

The other variant is [Ledger8DeployContractOptionsWithPrivateState](Ledger8DeployContractOptionsWithPrivateState.md).

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

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: `undefined`

DECLARED on this variant, and only ever `undefined` — see
[Ledger8DeployContractOptionsBase.privateStateId](#privatestateid) for why the member
is present rather than absent.

***

### privateStateId?

> `readonly` `optional` **privateStateId?**: `undefined`

DECLARED on this variant, and only ever `undefined`.

Left off the variant entirely, `{ compiledContract, privateStateId: 'x' }`
compiled: union excess-property checking admits a member declared on the
SIBLING variant as long as one variant is satisfied, and `compiledContract` alone
satisfies this one. The constructor then ran against `undefined`,
`undefined` was stored under the caller's id, and the handle reported an
`initialPrivateState` typed non-optional while actually undefined.

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
