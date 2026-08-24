[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / FindDeployedContractOptionsBase

# Interface: FindDeployedContractOptionsBase\<C\>

Defined in: packages/contracts/dist/index.d.ts:866

Base type for the configuration options for [findDeployedContract](../functions/findDeployedContract.md).

## Extended by

- [`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md)

## Type Parameters

### C

`C` *extends* [`Any`](../../../midnight-js-protocol/compact-js/namespaces/Contract/type-aliases/Any.md)

## Properties

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](../../../midnight-js-protocol/compact-js/namespaces/CompiledContract/interfaces/CompiledContract.md)\<`C`, `any`\>

Defined in: packages/contracts/dist/index.d.ts:870

The compiled contract to use to execute circuits.

***

### contractAddress

> `readonly` **contractAddress**: `string`

Defined in: packages/contracts/dist/index.d.ts:874

The address of a previously deployed contract.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](../../../midnight-js-protocol/onchain-runtime/type-aliases/SigningKey.md)

Defined in: packages/contracts/dist/index.d.ts:884

The signing key to use to perform contract maintenance updates. If defined, the given signing
key is stored for this contract address. This is useful when someone has already added the given signing
key to the contract maintenance authority. If undefined, and there is an existing signing key for the
contract address locally, the existing signing key is kept. This is useful when the contract was
deployed locally. If undefined, and there is not an existing signing key for the contract address
locally, a fresh signing key is generated and stored for the contract address locally. This is
useful when you want to give a signing key to someone else to add you as a maintenance authority.
