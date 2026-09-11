[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../../README.md)

***

[Midnight.js API Reference](../../../../../../packages.md) / [@midnight-ntwrk/midnight-js-contracts](../../../../README.md) / [index](../../../README.md) / [Ledger8](../README.md) / DeployContractOptions

# Type Alias: DeployContractOptions\<C\>

> **DeployContractOptions**\<`C`\> = [`ConstructorParameters`](ConstructorParameters.md)\<`C`\> *extends* \[\] ? [`DeployContractOptionsBase`](../interfaces/DeployContractOptionsBase.md)\<`C`\> : [`DeployContractOptionsBase`](../interfaces/DeployContractOptionsBase.md)\<`C`\> & `object`

Configuration for deploying a retained-era contract.

`args` is CONDITIONAL, exactly as [Ledger8CallTxOptionsBase](CallTxOptionsBase.md)'s is: a
constructor that takes no arguments of its own has no `args` member at all.
A retained constructor CAN take arguments — `Ledger8Contract.initialState`
says so, and the pipeline under this arm has always passed them through — so
denying them here made a zero-argument constructor the only deployable one.

The private-state members and `additionalCoinEncPublicKeyMappings` the
current era's deploy options carry stay absent by decision; see
[KeepStatePipeline](../../../../documents/KeepStatePipeline.md).

## Type Parameters

### C

`C` *extends* [`Contract`](../interfaces/Contract.md)
