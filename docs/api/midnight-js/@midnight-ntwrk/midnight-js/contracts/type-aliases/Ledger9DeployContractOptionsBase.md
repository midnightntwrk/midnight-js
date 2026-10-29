[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9DeployContractOptionsBase

# Type Alias: Ledger9DeployContractOptionsBase\<C\>

> **Ledger9DeployContractOptionsBase**\<`C`\> = [`DeployContractOptionsShared`](DeployContractOptionsShared.md)\<`C`\> & `object`

The [deployContract](../functions/deployContract.md) options variant for a contract whose private state is stored
NOWHERE: the constructor runs against `undefined` and nothing is written.

The other variant is [Ledger9DeployContractOptionsWithPrivateState](Ledger9DeployContractOptionsWithPrivateState.md).

## Type Declaration

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: `never`

DECLARED on this variant, and only ever `undefined` — see
Ledger9DeployContractOptionsBase.privateStateId for why the member is
present rather than absent.

### privateStateId?

> `readonly` `optional` **privateStateId?**: `never`

DECLARED on this variant, and only ever `undefined`.

Left off the variant entirely, `{ compiledContract, privateStateId: 'x' }`
compiled: union excess-property checking admits a member declared on the
SIBLING variant as long as one variant is satisfied, and `compiledContract` alone
satisfies this one. The constructor then ran against `undefined`,
`undefined` was stored under the caller's id, and
`deployTxData.private.initialPrivateState` was typed non-optional while
actually undefined.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
