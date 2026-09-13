[**Midnight.js API Reference v5.0.0-beta.7**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / findDeployedContract

# Function: findDeployedContract()

Creates an instance of [FoundContract](../interfaces/FoundContract.md) given the address of a deployed contract and an
optional private state ID at which an existing private state is stored. When given, the current value
at the private state ID is used as the `initialPrivateState` value in the `finalizedDeployTxData`
property of the returned `FoundContract`.

## Param

**providers**

The providers used to manage transaction lifecycles.

## Param

**options**

Configuration.

## Throws

Error Improper `privateStateId` and `initialPrivateState` configuration.

## Throws

Error No contract state could be found at `contractAddress`.

## Throws

TypeError Thrown if `contractAddress` is not correctly formatted as a contract address.

## Throws

ContractTypeError One or more circuits defined on `contract` are undefined on the contract
                          state found at `contractAddress`, carry no deployed verifier key, or
                          have mis-matched verifier keys.

## Throws

IncompleteFindContractPrivateStateConfig If an `initialPrivateState` is given but no
                                                 `privateStateId` is given to store it under.

## Throws

EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, or
                                 is a raw current-era contract instance passed instead of its
                                 `CompiledContract` container, or its artifacts declare no
                                 toolchain this framework can place. Raised before anything is
                                 read from the chain; the ZK config provider is asked for the
                                 artifacts' declared runtime version, and no other provider is
                                 consulted.

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../namespaces/Ledger8/interfaces/FoundContract.md)\<`C`\>\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

A READ path, so it composes and submits nothing. It still resolves the head era, dates the
fetched state's envelope against it, and byte-matches every local verifier key against the slot
the chain holds — the checks that make a later call against this contract safe, done once here
so a mis-dispatch is caught at attach time rather than at the first call.

The deploy record is returned VERSION-TAGGED rather than narrowed to the current era: a
retained-era contract was deployed in whichever era was current at the time, and refusing the
pre-fork arm would refuse exactly the contracts this arm exists to keep callable.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

#### options

[`FindDeployedContractOptions`](../namespaces/Ledger8/interfaces/FindDeployedContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../namespaces/Ledger8/interfaces/FoundContract.md)\<`C`\>\>

### See

[OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract that declares no private state.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`FindDeployedContractOptionsBase`](../interfaces/FindDeployedContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, reusing the private state already stored at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsExistingPrivateState`](../interfaces/FindDeployedContractOptionsExistingPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

## Call Signature

> **findDeployedContract**\<`C`\>(`providers`, `options`): `Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>

Attaches to a deployed contract, storing the given `initialPrivateState` at `privateStateId`.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`FindDeployedContractOptionsStorePrivateState`](../interfaces/FindDeployedContractOptionsStorePrivateState.md)\<`C`\>

### Returns

`Promise`\<[`FoundContract`](../interfaces/FoundContract.md)\<`C`\>\>
