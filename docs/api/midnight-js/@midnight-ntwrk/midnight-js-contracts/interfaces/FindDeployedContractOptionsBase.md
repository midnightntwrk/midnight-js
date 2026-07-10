[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FindDeployedContractOptionsBase

# Interface: FindDeployedContractOptionsBase\<C\>

Base type for the configuration options for [findDeployedContract](../functions/findDeployedContract.md).

## Extended by

- [`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md)

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### compiledContract

> `readonly` **compiledContract**: `CompiledContract`\<`C`, `any`\>

The compiled contract to use to execute circuits.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of a previously deployed contract.

***

### signingKey?

> `readonly` `optional` **signingKey?**: `SigningKey`

The signing key to use to perform contract maintenance updates. If defined, the given signing
key is stored for this contract address. This is useful when someone has already added the given signing
key to the contract maintenance authority. If undefined, and there is an existing signing key for the
contract address locally, the existing signing key is kept. This is useful when the contract was
deployed locally. If undefined, and there is not an existing signing key for the contract address
locally, a fresh signing key is generated and stored for the contract address locally. This is
useful when you want to give a signing key to someone else to add you as a maintenance authority.
