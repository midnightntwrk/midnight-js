[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../README.md) / index

# index

## Classes

- [ComposeFailedError](classes/ComposeFailedError.md)
- [ComposeOptionError](classes/ComposeOptionError.md)
- [ConfigurationError](classes/ConfigurationError.md)
- [ContractExecutionError](classes/ContractExecutionError.md)
- [DownConvertFailedError](classes/DownConvertFailedError.md)
- [EnvironmentUnsupportedError](classes/EnvironmentUnsupportedError.md)
- [InvalidArgumentError](classes/InvalidArgumentError.md)
- [InvariantViolationError](classes/InvariantViolationError.md)
- [Ledger8InstanceMismatchError](classes/Ledger8InstanceMismatchError.md)
- [Ledger8RuntimeInvalidError](classes/Ledger8RuntimeInvalidError.md)
- [Ledger8RuntimeMissingError](classes/Ledger8RuntimeMissingError.md)
- [MerkleNotRehashedError](classes/MerkleNotRehashedError.md)
- [MidnightJsError](classes/MidnightJsError.md)
- [PayloadNotATransactionError](classes/PayloadNotATransactionError.md)
- [StateDecodeFailedError](classes/StateDecodeFailedError.md)
- [StateInconsistentError](classes/StateInconsistentError.md)
- [UnknownLedger8AxisError](classes/UnknownLedger8AxisError.md)
- [UnknownLedgerVersionError](classes/UnknownLedgerVersionError.md)
- [UnknownProtocolVersionError](classes/UnknownProtocolVersionError.md)

## Interfaces

- [ComposeCallEntry](interfaces/ComposeCallEntry.md)
- [ComposeCallOptions](interfaces/ComposeCallOptions.md)
- [ComposeCallResultPojo](interfaces/ComposeCallResultPojo.md)
- [ComposeDeployOptions](interfaces/ComposeDeployOptions.md)
- [ConstructorResultPojo](interfaces/ConstructorResultPojo.md)
- [ContractEntryPointPojo](interfaces/ContractEntryPointPojo.md)
- [ContractStatePojo](interfaces/ContractStatePojo.md)
- [DeployResultPojo](interfaces/DeployResultPojo.md)
- [Ledger8Engine](interfaces/Ledger8Engine.md)
- [LedgerEra](interfaces/LedgerEra.md)
- [PartitionContext](interfaces/PartitionContext.md)
- [ProtocolVersionSource](interfaces/ProtocolVersionSource.md)
- [RetainedContract](interfaces/RetainedContract.md)
- [RunRetainedCircuitOptions](interfaces/RunRetainedCircuitOptions.md)
- [RunRetainedConstructorOptions](interfaces/RunRetainedConstructorOptions.md)
- [TranscriptPojo](interfaces/TranscriptPojo.md)
- [VersionedRecord](interfaces/VersionedRecord.md)
- [WrapKeepStateCallOptions](interfaces/WrapKeepStateCallOptions.md)

## Type Aliases

- [CallTranscriptSource](type-aliases/CallTranscriptSource.md)
- [CodedMidnightJsError](type-aliases/CodedMidnightJsError.md)
- [CommonErrorCode](type-aliases/CommonErrorCode.md)
- [ComposeOption](type-aliases/ComposeOption.md)
- [ComposeStage](type-aliases/ComposeStage.md)
- [ContractBalance](type-aliases/ContractBalance.md)
- [CurrentLedgerVersion](type-aliases/CurrentLedgerVersion.md)
- [DownConvertStage](type-aliases/DownConvertStage.md)
- [Ledger8InstanceAxis](type-aliases/Ledger8InstanceAxis.md)
- [Ledger8SigningKey](type-aliases/Ledger8SigningKey.md)
- [LedgerParametersOption](type-aliases/LedgerParametersOption.md)
- [LedgerVersion](type-aliases/LedgerVersion.md)
- [MidnightJsErrorCategory](type-aliases/MidnightJsErrorCategory.md)
- [MidnightJsErrorCodeFormat](type-aliases/MidnightJsErrorCodeFormat.md)
- [PartitionedCallTranscript](type-aliases/PartitionedCallTranscript.md)
- [ProtocolErrorCode](type-aliases/ProtocolErrorCode.md)
- [ProtocolV8](type-aliases/ProtocolV8.md)
- [ProtocolVersionUnknownReason](type-aliases/ProtocolVersionUnknownReason.md)
- [RetainedEraSubpath](type-aliases/RetainedEraSubpath.md)
- [RetainedLedgerVersion](type-aliases/RetainedLedgerVersion.md)
- [VerifierKeyReader](type-aliases/VerifierKeyReader.md)
- [VersionResolutionPath](type-aliases/VersionResolutionPath.md)
- [ZswapOfferFactory](type-aliases/ZswapOfferFactory.md)

## Variables

- [COMMON\_ERROR\_CATEGORIES](variables/COMMON_ERROR_CATEGORIES.md)
- [COMMON\_ERROR\_CODES](variables/COMMON_ERROR_CODES.md)
- [CURRENT\_LEDGER\_VERSION](variables/CURRENT_LEDGER_VERSION.md)
- [INITIAL\_LEDGER\_PARAMETERS](variables/INITIAL_LEDGER_PARAMETERS.md)
- [LEDGER\_VERSIONS](variables/LEDGER_VERSIONS.md)
- [MIDNIGHT\_JS\_ERROR\_CATEGORIES](variables/MIDNIGHT_JS_ERROR_CATEGORIES.md)
- [NO\_CIRCUIT](variables/NO_CIRCUIT.md)
- [PROTOCOL\_ERROR\_CATEGORIES](variables/PROTOCOL_ERROR_CATEGORIES.md)
- [PROTOCOL\_ERROR\_CODES](variables/PROTOCOL_ERROR_CODES.md)
- [RETAINED\_LEDGER\_VERSIONS](variables/RETAINED_LEDGER_VERSIONS.md)
- [TRANSACTION\_TAG\_PREFIX](variables/TRANSACTION_TAG_PREFIX.md)

## Functions

- [findCodedCause](functions/findCodedCause.md)
- [loadLedger8](functions/loadLedger8.md)
- [loadLedger8Engine](functions/loadLedger8Engine.md)
- [loadLedgerEra](functions/loadLedgerEra.md)
- [networkHeadVersion](functions/networkHeadVersion.md)
- [protocolVersionToLedger](functions/protocolVersionToLedger.md)
- [versionOfRecord](functions/versionOfRecord.md)
