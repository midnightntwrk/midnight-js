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
                            when executed by the node.

## Throws

EraArtifactMismatchError If `options.compiledContract` belongs to neither Compact era, is
                                 a raw current-era contract instance passed instead of its
                                 `CompiledContract` container, or its artifacts declare no
                                 toolchain this framework can place. Raised before anything is
                                 built or submitted; the ZK config provider is asked for the
                                 artifacts' declared runtime version, and no other provider is
                                 consulted.

## Call Signature

> **deployContract**\<`C`\>(`providers`, `options`): `Promise`\<`never`\>

The retained-era arm. Accepts a contract produced by the PREVIOUS Compact toolchain, passed as
the raw contract instance rather than inside a `CompiledContract` container.

ALWAYS REFUSED, with `Ledger8DeployUnmaintainableError`, for a MEASURED reason about the
maintenance authority rather than about the era pairing: nothing on this path sets one, and the
authority a retained constructor leaves behind is an empty committee with a threshold of one, so
the deployed contract could never be maintained by anyone. The deploy TRANSACTION path itself
composes and submits correctly — this refusal is about the result.

Typed `Promise<never>` because that is what an arm that only ever throws returns. It also keeps
the signature free of `Ledger8DeployedContract`, which is deliberately NOT exported: naming an
unexported type in a published signature gives a caller a value they cannot annotate.

The refusal is unconditional and comes BEFORE the network head is read, so `Ledger8DeployOnV9Error`
— the era pairing table's refusal for a retained-era deploy against a post-fork head — is not
reachable through this entry point today. Do NOT branch on it here: through `deployContract` that
branch is never taken.

### Type Parameters

#### C

`C` *extends* [`Contract`](../namespaces/Ledger8/interfaces/Contract.md)\<`unknown`\>

### Parameters

#### providers

[`ContractProviders`](../namespaces/Ledger8/type-aliases/ContractProviders.md)\<`C`, [`CircuitId`](../namespaces/Ledger8/type-aliases/CircuitId.md)\<`C`\>\>

#### options

[`DeployContractOptions`](../namespaces/Ledger8/type-aliases/DeployContractOptions.md)\<`C`\>

### Returns

`Promise`\<`never`\>

### See

 - [KeepStatePipeline](../../documents/KeepStatePipeline.md) for the measurement, what it would take to lift the refusal, and
     the test that pins it.
 - [OverloadTyping](../../documents/OverloadTyping.md) for how the two eras are discriminated.

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
