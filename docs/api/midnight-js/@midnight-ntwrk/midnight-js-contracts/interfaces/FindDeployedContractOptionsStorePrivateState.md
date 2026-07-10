[**Midnight.js API Reference v5.0.0-beta.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../README.md) / FindDeployedContractOptionsStorePrivateState

# Interface: FindDeployedContractOptionsStorePrivateState\<C\>

[findDeployedContract](../functions/findDeployedContract.md) configuration that includes an initial private
state to store and the private state ID at which to store it. Only used if
the intention is to overwrite the private state currently stored at the given
private state ID.

## Extends

- [`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

## Type Parameters

### C

`C` *extends* `Contract.Any`

## Properties

### compiledContract

> `readonly` **compiledContract**: `CompiledContract`\<`C`, `any`\>

The compiled contract to use to execute circuits.

#### Inherited from

[`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md).[`compiledContract`](FindDeployedContractOptionsExistingPrivateState.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of a previously deployed contract.

#### Inherited from

[`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md).[`contractAddress`](FindDeployedContractOptionsExistingPrivateState.md#contractaddress)

***

### initialPrivateState

> `readonly` **initialPrivateState**: `PrivateState`\<`C`\>

For types of contract that make no use of private state and or witnesses that operate upon it, this
property may be `undefined`. Otherwise, the value provided via this property should be same initial
state that was used when calling [deployContract](../functions/deployContract.md).

***

### privateStateId

> `readonly` **privateStateId**: `string`

An identifier for the private state of the contract being found.

#### Inherited from

[`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md).[`privateStateId`](FindDeployedContractOptionsExistingPrivateState.md#privatestateid)

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

#### Inherited from

[`FindDeployedContractOptionsExistingPrivateState`](FindDeployedContractOptionsExistingPrivateState.md).[`signingKey`](FindDeployedContractOptionsExistingPrivateState.md#signingkey)
