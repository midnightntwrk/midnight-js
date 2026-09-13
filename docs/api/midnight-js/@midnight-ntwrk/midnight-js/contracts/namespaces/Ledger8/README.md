[**Midnight.js API Reference v5.0.0-beta.7**](../../../../../README.md)

***

[Midnight.js API Reference](../../../../../packages.md) / [@midnight-ntwrk/midnight-js](../../../README.md) / [contracts](../../README.md) / Ledger8

# Ledger8

Everything the RETAINED era publishes, under one name.

The barrel re-exports this module as `Ledger8`, so a caller writes
`Ledger8.FoundContract<C>` and `Ledger8.CallTxFailedError`. The era prefix is
dropped inside, because the namespace already carries it -- so a declaration
this reference calls `Ledger8X` is the member published as `Ledger8.X`.

Membership is the retained era's own family: its contract and result types,
its interface factory, and the refusals its pipeline raises. Names that serve
BOTH eras stay on the flat surface, so a consumer that only receives results
never imports the transitional half.

## See

[RetainedEraNamespace](../../../documents/RetainedEraNamespace.md) for what qualifies, what is held back, and
     how the surface is withdrawn.

## Classes

- [AmbiguousEntryPointError](classes/AmbiguousEntryPointError.md)
- [CallTxFailedError](classes/CallTxFailedError.md)
- [DeployOnV9Error](classes/DeployOnV9Error.md)
- [DeployUnmaintainableError](classes/DeployUnmaintainableError.md)
- [RecipientUnmappableError](classes/RecipientUnmappableError.md)
- [SeamFailedError](classes/SeamFailedError.md)
- [ShieldedSpendUnsupportedError](classes/ShieldedSpendUnsupportedError.md)

## Interfaces

- [CallResultPrivate](interfaces/CallResultPrivate.md)
- [CallResultPublic](interfaces/CallResultPublic.md)
- [CallTxTarget](interfaces/CallTxTarget.md)
- [CircuitContext](interfaces/CircuitContext.md)
- [CircuitResult](interfaces/CircuitResult.md)
- [Contract](interfaces/Contract.md)
- [ContractCall](interfaces/ContractCall.md)
- [ContractCallPublic](interfaces/ContractCallPublic.md)
- [DeployContractOptionsBase](interfaces/DeployContractOptionsBase.md)
- [FinalizedCallTxData](interfaces/FinalizedCallTxData.md)
- [FindDeployedContractOptions](interfaces/FindDeployedContractOptions.md)
- [FoundContract](interfaces/FoundContract.md)
- [InitialStateResult](interfaces/InitialStateResult.md)
- [SubmittedCallTx](interfaces/SubmittedCallTx.md)
- [UnsubmittedCallTxData](interfaces/UnsubmittedCallTxData.md)

## Type Aliases

- [CallTxOptions](type-aliases/CallTxOptions.md)
- [CallTxOptionsBase](type-aliases/CallTxOptionsBase.md)
- [CallTxOptionsWithPrivateStateId](type-aliases/CallTxOptionsWithPrivateStateId.md)
- [Circuit](type-aliases/Circuit.md)
- [CircuitCallTxInterface](type-aliases/CircuitCallTxInterface.md)
- [CircuitId](type-aliases/CircuitId.md)
- [CircuitParameters](type-aliases/CircuitParameters.md)
- [CircuitReturnType](type-aliases/CircuitReturnType.md)
- [ConstructorParameters](type-aliases/ConstructorParameters.md)
- [ContractProviders](type-aliases/ContractProviders.md)
- [DeployContractOptions](type-aliases/DeployContractOptions.md)
- [FinalizedCallTxPublicData](type-aliases/FinalizedCallTxPublicData.md)
- [PrivateState](type-aliases/PrivateState.md)
- [Witness](type-aliases/Witness.md)

## Variables

- [createCircuitCallTxInterface](variables/createCircuitCallTxInterface.md)
