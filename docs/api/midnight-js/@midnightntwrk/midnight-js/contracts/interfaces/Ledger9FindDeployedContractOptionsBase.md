[**Midnight.js API Reference v5.0.3**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnightntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger9FindDeployedContractOptionsBase

# Interface: Ledger9FindDeployedContractOptionsBase\<C\>

Base type for the configuration options for [findDeployedContract](../functions/findDeployedContract.md).

## Extended by

- [`Ledger9FindDeployedContractOptionsExistingPrivateState`](Ledger9FindDeployedContractOptionsExistingPrivateState.md)

## Type Parameters

### C

`C` *extends* [`Contract$1.Any`](https://github.com/midnightntwrk/midnight-sdk)

## Properties

### circuitIds?

> `readonly` `optional` **circuitIds?**: readonly [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>[]

The circuits to check and to call. Use it for a contract that has only some of its circuits on
chain, for example one that receives more verifier keys later through maintenance updates.

When given, only these circuits must be on chain with the local verifier key, and a call through
`callTx` to any other circuit is refused before a proof is made. The check runs once, when the
contract is found: after a verifier key is inserted, replaced or removed, find the contract again.
Maintenance through `circuitMaintenanceTx` stays available for every circuit.

When omitted, every circuit the compiled contract declares is checked.

#### Throws

InvalidArgumentError when the list is empty or names a circuit the compiled contract does
                             not declare.

***

### compiledContract

> `readonly` **compiledContract**: [`CompiledContract`](https://github.com/midnightntwrk/midnight-sdk)\<`C`, `any`\>

The compiled contract to use to execute circuits.

***

### contractAddress

> `readonly` **contractAddress**: `string`

The address of a previously deployed contract.

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
