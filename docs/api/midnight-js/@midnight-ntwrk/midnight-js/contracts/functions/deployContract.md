[**Midnight.js API Reference v5.0.0-beta.8**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / deployContract

# Function: deployContract()

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
