[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / Ledger9FindDeployedContractOptionsExistingPrivateState

# Interface: Ledger9FindDeployedContractOptionsExistingPrivateState\<C\>

[findDeployedContract](../functions/findDeployedContract.md) base configuration that includes an initial private
state to store and the private state ID at which to store it. Only used if
the intention is to overwrite the private state currently stored at the given
private state ID.

## Extends

- [`Ledger9FindDeployedContractOptionsBase`](Ledger9FindDeployedContractOptionsBase.md)\<`C`\>

## Extended by

- [`Ledger9FindDeployedContractOptionsStorePrivateState`](Ledger9FindDeployedContractOptionsStorePrivateState.md)

## Type Parameters

### C

`C` *extends* [`Contract.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The compiled contract to use to execute circuits.

#### Inherited from

[`Ledger9FindDeployedContractOptionsBase`](Ledger9FindDeployedContractOptionsBase.md).[`compiledContract`](Ledger9FindDeployedContractOptionsBase.md#compiledcontract)

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of a previously deployed contract.

#### Inherited from

[`Ledger9FindDeployedContractOptionsBase`](Ledger9FindDeployedContractOptionsBase.md).[`contractAddress`](Ledger9FindDeployedContractOptionsBase.md#contractaddress)

***

### privateStateId

> `readonly` **privateStateId**: `string`

An identifier for the private state of the contract being found.

***

### signingKey?

> `readonly` `optional` **signingKey?**: [`SigningKey`](https://github.com/midnightntwrk/midnight-ledger)

The signing key to use to perform contract maintenance updates. If defined, the given signing
key is stored for this contract address. This is useful when someone has already added the given signing
key to the contract maintenance authority. If undefined, and there is an existing signing key for the
contract address locally, the existing signing key is kept. This is useful when the contract was
deployed locally. If undefined, and there is not an existing signing key for the contract address
locally, a fresh signing key is generated and stored for the contract address locally. This is
useful when you want to give a signing key to someone else to add you as a maintenance authority.

#### Inherited from

[`Ledger9FindDeployedContractOptionsBase`](Ledger9FindDeployedContractOptionsBase.md).[`signingKey`](Ledger9FindDeployedContractOptionsBase.md#signingkey)
