[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / deployContract

# Function: deployContract()

Creates and submits a contract deployment transaction. This function is the entry point for the transaction
construction workflow and is used to create a [DeployedContract](../interfaces/DeployedContract.md) instance.

## Param

**providers**

The providers used to manage the transaction lifecycle.

## Param

**options**

Configuration.

## Throws

DeployTxFailedError If the transaction is submitted successfully but produces an error
                            when executed by the node. Current-era arms only; the retained arm
                            raises `Ledger8DeployTxFailedError`, which carries a version-tagged
                            record and the signing key, instead.

## Throws

EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, is
                                 a raw current-era contract instance passed instead of its
                                 `CompiledContract` container, or its artifacts declare no
                                 toolchain this framework can place. Raised before anything is
                                 built or submitted; the ZK config provider is asked for the
                                 artifacts' declared runtime version, and no other provider is
                                 consulted.

## Throws

Ledger8DeployOnV9Error If a retained-era artifact is deployed against a post-fork head.
                               Raised before the constructor runs and before any verifier key is
                               fetched.

## Throws

Ledger8DeployTxFailedError If the retained-era deployment was recorded with a non-success
                                   status. Carries the signing key, because a `FailFallible`
                                   deployment landed.

## Throws

Ledger8DeployUnconfirmedError If what the chain did with a submitted retained-era
                                       deployment cannot be confirmed - the record unreadable, or
                                       back from an era the head it composed on cannot have
                                       recorded. Carries the signing key, and the underlying
                                       failure on `cause`.

## Throws

IncompleteDeployContractPrivateStateConfig If an `initialPrivateState` reaches the
                                                   retained arm with no `privateStateId` to store
                                                   it under.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../namespaces/Ledger8/interfaces/DeployedContract.md)\<`C`\>\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Reachable only on a PRE-FORK head: the retained era has no post-fork deployment, so a retained
artifact against a post-fork head is refused with `Ledger8DeployOnV9Error`. Recompile with the
current toolchain and deploy that artifact instead; the retained artifact keeps working for calls
against contracts deployed before the fork.

A verifier key is registered for every entry point the artifact declares, because a retained
constructor builds every slot BLANK and the retained deploy registers none of its own.

KEEP THE SIGNING KEY THE RESULT CARRIES. This arm registers a maintenance authority of one key
at threshold 1, sampling that key when `options.signingKey` names none, and this framework
stores it nowhere — not in the private-state provider, not on chain. It appears once, on
`Ledger8DeployedContract.signingKey`, and a contract whose key was never copied off that handle
can never have a verifier key inserted, removed or replaced by anyone. Decide where the key is
going before calling this, not after.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

#### options

[`DeployContractOptions`](../namespaces/Ledger8/type-aliases/DeployContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../namespaces/Ledger8/interfaces/DeployedContract.md)\<`C`\>\>

### See

[OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

Deploys a contract that declares no private state, so no private state id is required.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`DeployContractOptionsBase`](../type-aliases/DeployContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>

Deploys a contract that declares private state, naming where to store the initial state.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`ContractProviders`](../type-aliases/ContractProviders.md)\<`C`\>

#### options

[`DeployContractOptionsWithPrivateState`](../type-aliases/DeployContractOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`DeployedContract`](../interfaces/DeployedContract.md)\<`C`\>\>
