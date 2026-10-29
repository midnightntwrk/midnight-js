[**Midnight.js API Reference v5.0.0-rc.5**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../README.md) / [contracts](../README.md) / Ledger8DeployContractOptions

# Type Alias: Ledger8DeployContractOptions\<C\>

> **Ledger8DeployContractOptions**\<`C`\> = [`Ledger8ConstructorParameters`](Ledger8ConstructorParameters.md)\<`C`\> *extends* \[\] ? [`Ledger8DeployContractOptionsBase`](../interfaces/Ledger8DeployContractOptionsBase.md)\<`C`\> \| [`Ledger8DeployContractOptionsWithPrivateState`](../interfaces/Ledger8DeployContractOptionsWithPrivateState.md)\<`C`\> : [`Ledger8DeployContractOptionsBase`](../interfaces/Ledger8DeployContractOptionsBase.md)\<`C`\> \| [`Ledger8DeployContractOptionsWithPrivateState`](../interfaces/Ledger8DeployContractOptionsWithPrivateState.md)\<`C`\> & `object`

Configuration for deploying a retained-era contract.

`args` is CONDITIONAL, exactly as [Ledger8CallTxOptionsBase](Ledger8CallTxOptionsBase.md)'s is: a
constructor that takes no arguments of its own has no `args` member at all.
A retained constructor CAN take arguments — `Ledger8Contract.initialState`
says so, and the pipeline under this overload has always passed them through — so
denying them here made a zero-argument constructor the only deployable one.

The conditional is applied to the WHOLE union, so it reaches both variants: a
constructor with parameters demands `args` whether or not private state is
named, and a nullary one carries the member on neither. Writing the union
inside one branch only would have made the private-state variant the one shape a
caller could not supply arguments on.

`additionalCoinEncPublicKeyMappings`, which the current era's deploy options
also carry, stays absent by decision; see [KeepStatePipeline](../../documents/KeepStatePipeline.md).

## Type Parameters

### C

`C` *extends* [`Ledger8Contract`](../interfaces/Ledger8Contract.md)
