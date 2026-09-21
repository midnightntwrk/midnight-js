[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / DeployContractOptionsBase

# Type Alias: DeployContractOptionsBase\<C\>

> **DeployContractOptionsBase**\<`C`\> = [`DeployContractOptionsShared`](DeployContractOptionsShared.md)\<`C`\> & `object`

The [deployContract](../functions/deployContract.md) arm for a contract whose private state is stored
NOWHERE: the constructor runs against `undefined` and nothing is written.

The other arm is [DeployContractOptionsWithPrivateState](DeployContractOptionsWithPrivateState.md).

## Type Declaration

### initialPrivateState?

> `readonly` `optional` **initialPrivateState?**: `never`

DECLARED on this arm, and only ever `undefined` — see
DeployContractOptionsBase.privateStateId for why the member is
present rather than absent.

### privateStateId?

> `readonly` `optional` **privateStateId?**: `never`

DECLARED on this arm, and only ever `undefined`.

Left off the arm entirely, `{ compiledContract, privateStateId: 'x' }`
compiled: union excess-property checking admits a member declared on the
SIBLING arm as long as one arm is satisfied, and `compiledContract` alone
satisfies this one. The constructor then ran against `undefined`,
`undefined` was stored under the caller's id, and
`deployTxData.private.initialPrivateState` was typed non-optional while
actually undefined.

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)
