[**Midnight.js API Reference v5.0.0-beta.7**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / contracts

# contracts

## Namespaces

- [ContractLog](namespaces/ContractLog/README.md)

## Classes

- [CallTxFailedError](classes/CallTxFailedError.md)
- [ContractTypeError](classes/ContractTypeError.md)
- [DeployTxFailedError](classes/DeployTxFailedError.md)
- [IncompleteCallTxPrivateStateConfig](classes/IncompleteCallTxPrivateStateConfig.md)
- [IncompleteFindContractPrivateStateConfig](classes/IncompleteFindContractPrivateStateConfig.md)
- [InsertVerifierKeyTxFailedError](classes/InsertVerifierKeyTxFailedError.md)
- [RemoveVerifierKeyTxFailedError](classes/RemoveVerifierKeyTxFailedError.md)
- [ReplaceMaintenanceAuthorityTxFailedError](classes/ReplaceMaintenanceAuthorityTxFailedError.md)
- [TxFailedError](classes/TxFailedError.md)

## Interfaces

- [CallOptionsBase](interfaces/CallOptionsBase.md)
- [CallOptionsProviderDataDependencies](interfaces/CallOptionsProviderDataDependencies.md)
- [CallResult](interfaces/CallResult.md)
- [CallResultPrivate](interfaces/CallResultPrivate.md)
- [CallResultPublic](interfaces/CallResultPublic.md)
- [CircuitMaintenanceTxInterface](interfaces/CircuitMaintenanceTxInterface.md)
- [ContractConstructorOptionsBase](interfaces/ContractConstructorOptionsBase.md)
- [ContractConstructorOptionsProviderDataDependencies](interfaces/ContractConstructorOptionsProviderDataDependencies.md)
- [ContractConstructorResult](interfaces/ContractConstructorResult.md)
- [ContractMaintenanceTxInterface](interfaces/ContractMaintenanceTxInterface.md)
- [ContractStates](interfaces/ContractStates.md)
- [DeployedContract](interfaces/DeployedContract.md)
- [FinalizedCallTxData](interfaces/FinalizedCallTxData.md)
- [FinalizedCallTxPublicData](interfaces/FinalizedCallTxPublicData.md)
- [FinalizedDeployTxData](interfaces/FinalizedDeployTxData.md)
- [FinalizedDeployTxDataBase](interfaces/FinalizedDeployTxDataBase.md)
- [FinalizedDeployTxPublicData](interfaces/FinalizedDeployTxPublicData.md)
- [FindDeployedContractOptionsBase](interfaces/FindDeployedContractOptionsBase.md)
- [FindDeployedContractOptionsExistingPrivateState](interfaces/FindDeployedContractOptionsExistingPrivateState.md)
- [FindDeployedContractOptionsStorePrivateState](interfaces/FindDeployedContractOptionsStorePrivateState.md)
- [FoundContract](interfaces/FoundContract.md)
- [PublicContractStates](interfaces/PublicContractStates.md)
- [ScopedTransactionOptions](interfaces/ScopedTransactionOptions.md)
- [SubmittedCallTx](interfaces/SubmittedCallTx.md)
- [SubmitTxOptions](interfaces/SubmitTxOptions.md)
- [TransactionContext](interfaces/TransactionContext.md)
- [UnsubmittedCallTxData](interfaces/UnsubmittedCallTxData.md)
- [UnsubmittedCallTxPrivateData](interfaces/UnsubmittedCallTxPrivateData.md)
- [UnsubmittedDeployTxData](interfaces/UnsubmittedDeployTxData.md)
- [UnsubmittedDeployTxDataBase](interfaces/UnsubmittedDeployTxDataBase.md)
- [UnsubmittedDeployTxPrivateData](interfaces/UnsubmittedDeployTxPrivateData.md)
- [UnsubmittedDeployTxPrivateDataFull](interfaces/UnsubmittedDeployTxPrivateDataFull.md)
- [UnsubmittedDeployTxPublicData](interfaces/UnsubmittedDeployTxPublicData.md)
- [UnsubmittedTxData](interfaces/UnsubmittedTxData.md)

## Type Aliases

- [CallOptions](type-aliases/CallOptions.md)
- [CallOptionsWithArguments](type-aliases/CallOptionsWithArguments.md)
- [CallOptionsWithPrivateState](type-aliases/CallOptionsWithPrivateState.md)
- [CallOptionsWithProviderDataDependencies](type-aliases/CallOptionsWithProviderDataDependencies.md)
- [CallTxOptions](type-aliases/CallTxOptions.md)
- [CallTxOptionsBase](type-aliases/CallTxOptionsBase.md)
- [CallTxOptionsWithPrivateStateId](type-aliases/CallTxOptionsWithPrivateStateId.md)
- [CircuitCallTxInterface](type-aliases/CircuitCallTxInterface.md)
- [CircuitMaintenanceTxInterfaces](type-aliases/CircuitMaintenanceTxInterfaces.md)
- [ContractConstructorOptions](type-aliases/ContractConstructorOptions.md)
- [ContractConstructorOptionsWithArguments](type-aliases/ContractConstructorOptionsWithArguments.md)
- [ContractConstructorOptionsWithPrivateState](type-aliases/ContractConstructorOptionsWithPrivateState.md)
- [ContractConstructorOptionsWithProviderDataDependencies](type-aliases/ContractConstructorOptionsWithProviderDataDependencies.md)
- [ContractProviders](type-aliases/ContractProviders.md)
- [DeployContractOptions](type-aliases/DeployContractOptions.md)
- [DeployContractOptionsBase](type-aliases/DeployContractOptionsBase.md)
- [DeployContractOptionsWithPrivateState](type-aliases/DeployContractOptionsWithPrivateState.md)
- [DeployTxOptions](type-aliases/DeployTxOptions.md)
- [DeployTxOptionsBase](type-aliases/DeployTxOptionsBase.md)
- [DeployTxOptionsWithPrivateState](type-aliases/DeployTxOptionsWithPrivateState.md)
- [DeployTxOptionsWithPrivateStateId](type-aliases/DeployTxOptionsWithPrivateStateId.md)
- [FindDeployedContractOptions](type-aliases/FindDeployedContractOptions.md)
- [LogEvent](type-aliases/LogEvent.md)
- [SubmitTxProviders](type-aliases/SubmitTxProviders.md)
- [UnprovenCallTxProvidersBase](type-aliases/UnprovenCallTxProvidersBase.md)
- [UnprovenCallTxProvidersWithPrivateState](type-aliases/UnprovenCallTxProvidersWithPrivateState.md)
- [UnprovenDeployTxOptions](type-aliases/UnprovenDeployTxOptions.md)
- [UnprovenDeployTxProviders](type-aliases/UnprovenDeployTxProviders.md)

## Variables

- [createCallTxOptions](variables/createCallTxOptions.md)
- [createCircuitCallTxInterface](variables/createCircuitCallTxInterface.md)
- [createCircuitMaintenanceTxInterface](variables/createCircuitMaintenanceTxInterface.md)
- [createCircuitMaintenanceTxInterfaces](variables/createCircuitMaintenanceTxInterfaces.md)
- [createContractMaintenanceTxInterface](variables/createContractMaintenanceTxInterface.md)
- [getPublicStates](variables/getPublicStates.md)
- [getStates](variables/getStates.md)
- [getUnshieldedBalances](variables/getUnshieldedBalances.md)
- [submitInsertVerifierKeyTx](variables/submitInsertVerifierKeyTx.md)
- [submitRemoveVerifierKeyTx](variables/submitRemoveVerifierKeyTx.md)
- [submitReplaceAuthorityTx](variables/submitReplaceAuthorityTx.md)
- [submitTx](variables/submitTx.md)
- [submitTxAsync](variables/submitTxAsync.md)
- [verifierKeysEqual](variables/verifierKeysEqual.md)
- [verifyContractState](variables/verifyContractState.md)
- [withContractScopedTransaction](variables/withContractScopedTransaction.md)

## Functions

- [createUnprovenCallTx](functions/createUnprovenCallTx.md)
- [createUnprovenCallTxFromInitialStates](functions/createUnprovenCallTxFromInitialStates.md)
- [createUnprovenDeployTx](functions/createUnprovenDeployTx.md)
- [createUnprovenDeployTxFromVerifierKeys](functions/createUnprovenDeployTxFromVerifierKeys.md)
- [deployContract](functions/deployContract.md)
- [findDeployedContract](functions/findDeployedContract.md)
- [submitCallTx](functions/submitCallTx.md)
- [submitCallTxAsync](functions/submitCallTxAsync.md)
- [submitDeployTx](functions/submitDeployTx.md)
