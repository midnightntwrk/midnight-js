[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../README.md) / [index](../README.md) / deployContract

# Function: deployContract()

Creates and submits a contract deployment transaction. This function is the entry point for the transaction
construction workflow and is used to create a [Ledger9DeployedContract](../interfaces/Ledger9DeployedContract.md) instance.

## Param

**providers**

The providers used to manage the transaction lifecycle.

## Param

**options**

Configuration.

## Throws

TxFailedError If the transaction is submitted successfully but produces an error
                      when executed by the node, in either era. Carries the contract address and
                      the signing key, because a `FailFallible` deployment landed.

## Throws

EraMismatchError If `options.compiledContract` belongs to neither Compact era, is
                                 a raw current-era contract instance passed instead of its
                                 `CompiledContract` container, or its artifacts declare no
                                 toolchain this framework can place. Raised before anything is
                                 built or submitted; the ZK config provider is asked for the
                                 artifacts' declared runtime version, and no other provider is
                                 consulted.

## Throws

Ledger8SigningKeyError with reason `'unusable'` If a retained-era deploy is given a `signingKey` that is not a
                                       `schnorr` key of 64 hex characters. Raised before anything
                                       is composed.

## Throws

EraMismatchError with reason `'ledger8-deploy-on-ledger9-network'` If a retained-era artifact is deployed after the fork.
                               Raised before the constructor runs and before any verifier key is
                               fetched.

## Throws

Ledger8UnconfirmedError with operation `'deploy'` If what the chain did with a submitted retained-era
                                       deployment cannot be confirmed - the record unreadable, or
                                       back from an era the head it composed on cannot have
                                       recorded. Carries the signing key, and the underlying
                                       failure on `cause`.

## Throws

IncompleteDeployContractPrivateStateConfig If `privateStateId` is present without
                                                   `initialPrivateState`, or `initialPrivateState`
                                                   holds a value without `privateStateId`. The
                                                   option types refuse both shapes, so only a
                                                   caller the compiler never checked can reach it.
                                                   Raised on both eras, before any provider is
                                                   touched.

## Throws

InvalidArgumentError If `privateStateId` is present with an undefined value, which is a caller that
              believes it named an id. Raised on both eras, before any provider is touched, and
              ahead of the pairing refusal.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger8DeployedContract`](../interfaces/Ledger8DeployedContract.md)\<`C`\>\>

The retained-era overload. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

Reachable only BEFORE THE FORK: the retained era has no post-fork deployment, so a retained
artifact after the fork is refused with `EraMismatchError` (reason `'ledger8-deploy-on-ledger9-network'`). Recompile with the
current toolchain and deploy that artifact instead; the retained artifact keeps working for calls
against contracts deployed before the fork.

A verifier key is registered for every entry point the artifact declares.

A maintenance authority of one key at threshold 1 is registered, that key being
`options.signingKey` or a freshly sampled one. Once the chain has recorded the deployment the key
is stored against the minted address through `providers.privateStateProvider` and reported at
`deployTxData.private.signingKey`. THAT PROVIDER IS THE ONLY COPY besides the returned handle:
the key is not on chain and not derivable from anything that is, so a store that is lost or
cleared leaves a contract on which no verifier key can ever be inserted, removed or replaced by
anyone.

### Type Parameters

#### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)\<`unknown`\>

### Parameters

#### providers

[`Ledger8ContractProviders`](../type-aliases/Ledger8ContractProviders.md)\<`C`, [`Ledger8CircuitId`](../type-aliases/Ledger8CircuitId.md)\<`C`\>\>

#### options

[`Ledger8DeployContractOptions`](../type-aliases/Ledger8DeployContractOptions.md)\<`C`\>

### Returns

`Promise`\<[`Ledger8DeployedContract`](../interfaces/Ledger8DeployedContract.md)\<`C`\>\>

### See

 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.
 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for why every slot has to be registered here, and for the
maintenance authority this builds.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\>\>

Deploys a contract that declares no private state, so no private state id is required.

### Type Parameters

#### C

`C` *extends* [`Contract`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`, [`Witnesses`](https://github.com/midnightntwrk/midnight-sdk)\<`undefined`\>\>

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`, [`ProvableCircuitId`](https://github.com/midnightntwrk/midnight-sdk)\<`C`\>, `unknown`\>

#### options

[`Ledger9DeployContractOptionsBase`](../type-aliases/Ledger9DeployContractOptionsBase.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\>\>

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<[`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\>\>

Deploys a contract that declares private state, naming where to store the initial state.

### Type Parameters

#### C

`C` *extends* [`Any`](https://github.com/midnightntwrk/midnight-sdk)

### Parameters

#### providers

[`Ledger9ContractProviders`](../type-aliases/Ledger9ContractProviders.md)\<`C`\>

#### options

[`Ledger9DeployContractOptionsWithPrivateState`](../type-aliases/Ledger9DeployContractOptionsWithPrivateState.md)\<`C`\>

### Returns

`Promise`\<[`Ledger9DeployedContract`](../interfaces/Ledger9DeployedContract.md)\<`C`\>\>
