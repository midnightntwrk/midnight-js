[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../README.md) / index

# index

## Classes

- [ComposeFailedError](classes/ComposeFailedError.md)
- [ComposeOptionError](classes/ComposeOptionError.md)
- [DownConvertFailedError](classes/DownConvertFailedError.md)
- [Ledger8InstanceMismatchError](classes/Ledger8InstanceMismatchError.md)
- [Ledger8RuntimeInvalidError](classes/Ledger8RuntimeInvalidError.md)
- [Ledger8RuntimeMissingError](classes/Ledger8RuntimeMissingError.md)
- [MerkleNotRehashedError](classes/MerkleNotRehashedError.md)
- [PayloadNotATransactionError](classes/PayloadNotATransactionError.md)
- [StateDecodeFailedError](classes/StateDecodeFailedError.md)
- [UnknownLedger8AxisError](classes/UnknownLedger8AxisError.md)
- [UnknownLedgerVersionError](classes/UnknownLedgerVersionError.md)
- [UnknownProtocolVersionError](classes/UnknownProtocolVersionError.md)

## Interfaces

- [ComposeCallEntry](interfaces/ComposeCallEntry.md)
- [ComposeCallOptions](interfaces/ComposeCallOptions.md)
- [ComposeDeployOptions](interfaces/ComposeDeployOptions.md)
- [ConstructorResultPojo](interfaces/ConstructorResultPojo.md)
- [ContractEntryPointPojo](interfaces/ContractEntryPointPojo.md)
- [ContractStatePojo](interfaces/ContractStatePojo.md)
- [DeployResultPojo](interfaces/DeployResultPojo.md)
- [DownConvertedState](interfaces/DownConvertedState.md)
- [EraPartitionCallOptions](interfaces/EraPartitionCallOptions.md)
- [ExecuteCircuitOptions](interfaces/ExecuteCircuitOptions.md)
- [ExecuteConstructorOptions](interfaces/ExecuteConstructorOptions.md)
- [Ledger8Engine](interfaces/Ledger8Engine.md)
- [LedgerEra](interfaces/LedgerEra.md)
- [PartitionContext](interfaces/PartitionContext.md)
- [ProtocolVersionSource](interfaces/ProtocolVersionSource.md)
- [TranscriptPojo](interfaces/TranscriptPojo.md)
- [VersionedRecord](interfaces/VersionedRecord.md)
- [WrapKeepStateCallOptions](interfaces/WrapKeepStateCallOptions.md)

## Type Aliases

- [CallTranscriptSource](type-aliases/CallTranscriptSource.md)
- [ComposeOption](type-aliases/ComposeOption.md)
- [ComposeStage](type-aliases/ComposeStage.md)
- [CurrentLedgerVersion](type-aliases/CurrentLedgerVersion.md)
- [DownConvertStage](type-aliases/DownConvertStage.md)
- [Ledger8ChargedState](type-aliases/Ledger8ChargedState.md)
- [Ledger8DeployableContractState](type-aliases/Ledger8DeployableContractState.md)
- [Ledger8InstanceAxis](type-aliases/Ledger8InstanceAxis.md)
- [Ledger8StateValue](type-aliases/Ledger8StateValue.md)
- [LedgerParametersOption](type-aliases/LedgerParametersOption.md)
- [LedgerVersion](type-aliases/LedgerVersion.md)
- [PartitionedCallTranscript](type-aliases/PartitionedCallTranscript.md)
- [ProtocolErrorCode](type-aliases/ProtocolErrorCode.md)
- [ProtocolV8](type-aliases/ProtocolV8.md)
- [ProtocolVersionUnknownReason](type-aliases/ProtocolVersionUnknownReason.md)
- [RetainedEraSubpath](type-aliases/RetainedEraSubpath.md)
- [RetainedLedgerVersion](type-aliases/RetainedLedgerVersion.md)
- [VersionResolutionPath](type-aliases/VersionResolutionPath.md)

## Variables

- [CURRENT\_LEDGER\_VERSION](variables/CURRENT_LEDGER_VERSION.md)
- [INITIAL\_LEDGER\_PARAMETERS](variables/INITIAL_LEDGER_PARAMETERS.md)
- [LEDGER\_VERSIONS](variables/LEDGER_VERSIONS.md)
- [NO\_CIRCUIT](variables/NO_CIRCUIT.md)
- [PROTOCOL\_ERROR\_CODES](variables/PROTOCOL_ERROR_CODES.md)
- [RETAINED\_LEDGER\_VERSIONS](variables/RETAINED_LEDGER_VERSIONS.md)
- [TRANSACTION\_TAG\_PREFIX](variables/TRANSACTION_TAG_PREFIX.md)

## Functions

- [loadLedger8](functions/loadLedger8.md)
- [loadLedger8Engine](functions/loadLedger8Engine.md)
- [loadLedgerEra](functions/loadLedgerEra.md)
- [networkHeadVersion](functions/networkHeadVersion.md)
- [protocolVersionToLedger](functions/protocolVersionToLedger.md)
- [versionOfRecord](functions/versionOfRecord.md)
