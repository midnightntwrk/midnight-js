[**Midnight.js API Reference v5.0.0-rc.5**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / [](../README.md) / MidnightJsError

# Abstract Class: MidnightJsError

Base class of every error midnight-js raises itself. An error without a registered code came from a
dependency, the platform or user code, and midnight-js passed it through unchanged. Recognise one with
`hasErrorCode`, `isMidnightJsError` or `errorCategory` from the `midnight-js-utils` package: they read
`code`, so they also work when two copies of a package are installed, where `instanceof` does not.

## Extends

- `Error`

## Extended by

- [`ComposeFailedError`](ComposeFailedError.md)
- [`ComposeOptionError`](ComposeOptionError.md)
- [`ConfigurationError`](ConfigurationError.md)
- [`ContractExecutionError`](ContractExecutionError.md)
- [`EnvironmentUnsupportedError`](EnvironmentUnsupportedError.md)
- [`InvalidArgumentError`](InvalidArgumentError.md)
- [`InvariantViolationError`](InvariantViolationError.md)
- [`Ledger8RuntimeMissingError`](Ledger8RuntimeMissingError.md)
- [`PayloadNotATransactionError`](PayloadNotATransactionError.md)
- [`StateDecodeFailedError`](StateDecodeFailedError.md)
- [`StateInconsistentError`](StateInconsistentError.md)
- [`UnknownLedgerVersionError`](UnknownLedgerVersionError.md)
- [`UnknownProtocolVersionError`](UnknownProtocolVersionError.md)
- [`BlankVerifierKeySlotError`](../contracts/classes/BlankVerifierKeySlotError.md)
- [`ContractNotFoundError`](../contracts/classes/ContractNotFoundError.md)
- [`ContractTypeError`](../contracts/classes/ContractTypeError.md)
- [`EraInvariantViolationError`](../contracts/classes/EraInvariantViolationError.md)
- [`EraMismatchError`](../contracts/classes/EraMismatchError.md)
- [`ForkCrossedDuringOperationError`](../contracts/classes/ForkCrossedDuringOperationError.md)
- [`IncompleteCallTxPrivateStateConfig`](../contracts/classes/IncompleteCallTxPrivateStateConfig.md)
- [`IncompleteDeployContractPrivateStateConfig`](../contracts/classes/IncompleteDeployContractPrivateStateConfig.md)
- [`IncompleteFindContractPrivateStateConfig`](../contracts/classes/IncompleteFindContractPrivateStateConfig.md)
- [`IndexerInconsistencyError`](../contracts/classes/IndexerInconsistencyError.md)
- [`Ledger8AmbiguousEntryPointError`](../contracts/classes/Ledger8AmbiguousEntryPointError.md)
- [`Ledger8CallUnsupportedError`](../contracts/classes/Ledger8CallUnsupportedError.md)
- [`Ledger8NotStoredError`](../contracts/classes/Ledger8NotStoredError.md)
- [`Ledger8SigningKeyError`](../contracts/classes/Ledger8SigningKeyError.md)
- [`Ledger8UnconfirmedError`](../contracts/classes/Ledger8UnconfirmedError.md)
- [`LedgerParametersUnservedError`](../contracts/classes/LedgerParametersUnservedError.md)
- [`NetworkVersionReadFailedError`](../contracts/classes/NetworkVersionReadFailedError.md)
- [`NetworkVersionStateMismatchError`](../contracts/classes/NetworkVersionStateMismatchError.md)
- [`PrivateStateNotFoundError`](../contracts/classes/PrivateStateNotFoundError.md)
- [`ProviderFailedError`](../contracts/classes/ProviderFailedError.md)
- [`PublicStatesEraMismatchError`](../contracts/classes/PublicStatesEraMismatchError.md)
- [`ScopedTransactionIdentityMismatchError`](../contracts/classes/ScopedTransactionIdentityMismatchError.md)
- [`SubmitRejectionUndiagnosedError`](../contracts/classes/SubmitRejectionUndiagnosedError.md)
- [`TxFailedError`](../contracts/classes/TxFailedError.md)
- [`VerifierKeyMismatchError`](../contracts/classes/VerifierKeyMismatchError.md)
- [`ZswapOutputResolutionError`](../contracts/classes/ZswapOutputResolutionError.md)
- [`ArtifactRuntimeVersionUnavailableError`](../types/classes/ArtifactRuntimeVersionUnavailableError.md)
- [`ForeignLedgerTransactionError`](../types/classes/ForeignLedgerTransactionError.md)
- [`InvalidProtocolSchemeError`](../types/classes/InvalidProtocolSchemeError.md)
- [`InvalidSerializedStateError`](../types/classes/InvalidSerializedStateError.md)
- [`InvalidTransactionHandleError`](../types/classes/InvalidTransactionHandleError.md)
- [`PrivateStateDecryptionError`](../types/classes/PrivateStateDecryptionError.md)
- [`PrivateStateExportError`](../types/classes/PrivateStateExportError.md)
- [`PrivateStateImportError`](../types/classes/PrivateStateImportError.md)
- [`PrivateStateLimitExceededError`](../types/classes/PrivateStateLimitExceededError.md)
- [`PrivateStateSerializationError`](../types/classes/PrivateStateSerializationError.md)
- [`PrivateStateStorageError`](../types/classes/PrivateStateStorageError.md)
- [`ProofServerError`](../types/classes/ProofServerError.md)
- [`ProviderEraUnsupportedError`](../types/classes/ProviderEraUnsupportedError.md)
- [`SerializedStateDecodeFailedError`](../types/classes/SerializedStateDecodeFailedError.md)
- [`SerializedStateDecoderMissingError`](../types/classes/SerializedStateDecoderMissingError.md)
- [`SigningKeyExportError`](../types/classes/SigningKeyExportError.md)
- [`TransactionEraMismatchError`](../types/classes/TransactionEraMismatchError.md)
- [`UnusableEraEntryError`](../types/classes/UnusableEraEntryError.md)
- [`ZKArtifactNotFoundError`](../types/classes/ZKArtifactNotFoundError.md)
- [`ZkArtifactFetchError`](../types/classes/ZkArtifactFetchError.md)
- [`DeserializationError`](../utils/classes/DeserializationError.md)
- [`PasswordValidationError`](../utils/classes/PasswordValidationError.md)
- [`TagParseError`](../utils/classes/TagParseError.md)
- [`UnhandledUnionMemberError`](../utils/classes/UnhandledUnionMemberError.md)
- [`ZkArtifactContractInfoError`](../utils/classes/ZkArtifactContractInfoError.md)
- [`ZkArtifactIntegrityError`](../utils/classes/ZkArtifactIntegrityError.md)
- [`BlankVerifierKeySlotError`](../../midnight-js-contracts/index/classes/BlankVerifierKeySlotError.md)
- [`ContractNotFoundError`](../../midnight-js-contracts/index/classes/ContractNotFoundError.md)
- [`ContractTypeError`](../../midnight-js-contracts/index/classes/ContractTypeError.md)
- [`EraInvariantViolationError`](../../midnight-js-contracts/index/classes/EraInvariantViolationError.md)
- [`EraMismatchError`](../../midnight-js-contracts/index/classes/EraMismatchError.md)
- [`ForkCrossedDuringOperationError`](../../midnight-js-contracts/index/classes/ForkCrossedDuringOperationError.md)
- [`IncompleteCallTxPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteCallTxPrivateStateConfig.md)
- [`IncompleteDeployContractPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteDeployContractPrivateStateConfig.md)
- [`IncompleteFindContractPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteFindContractPrivateStateConfig.md)
- [`IndexerInconsistencyError`](../../midnight-js-contracts/index/classes/IndexerInconsistencyError.md)
- [`Ledger8AmbiguousEntryPointError`](../../midnight-js-contracts/index/classes/Ledger8AmbiguousEntryPointError.md)
- [`Ledger8CallUnsupportedError`](../../midnight-js-contracts/index/classes/Ledger8CallUnsupportedError.md)
- [`Ledger8NotStoredError`](../../midnight-js-contracts/index/classes/Ledger8NotStoredError.md)
- [`Ledger8SigningKeyError`](../../midnight-js-contracts/index/classes/Ledger8SigningKeyError.md)
- [`Ledger8UnconfirmedError`](../../midnight-js-contracts/index/classes/Ledger8UnconfirmedError.md)
- [`LedgerParametersUnservedError`](../../midnight-js-contracts/index/classes/LedgerParametersUnservedError.md)
- [`NetworkVersionReadFailedError`](../../midnight-js-contracts/index/classes/NetworkVersionReadFailedError.md)
- [`NetworkVersionStateMismatchError`](../../midnight-js-contracts/index/classes/NetworkVersionStateMismatchError.md)
- [`PrivateStateNotFoundError`](../../midnight-js-contracts/index/classes/PrivateStateNotFoundError.md)
- [`ProviderFailedError`](../../midnight-js-contracts/index/classes/ProviderFailedError.md)
- [`PublicStatesEraMismatchError`](../../midnight-js-contracts/index/classes/PublicStatesEraMismatchError.md)
- [`ScopedTransactionIdentityMismatchError`](../../midnight-js-contracts/index/classes/ScopedTransactionIdentityMismatchError.md)
- [`SubmitRejectionUndiagnosedError`](../../midnight-js-contracts/index/classes/SubmitRejectionUndiagnosedError.md)
- [`TxFailedError`](../../midnight-js-contracts/index/classes/TxFailedError.md)
- [`VerifierKeyMismatchError`](../../midnight-js-contracts/index/classes/VerifierKeyMismatchError.md)
- [`ZswapOutputResolutionError`](../../midnight-js-contracts/index/classes/ZswapOutputResolutionError.md)
- [`IndexerError`](../../midnight-js-indexer-public-data-provider/index/classes/IndexerError.md)
- [`StoredSigningKeyFormatError`](../../midnight-js-level-private-state-provider/classes/StoredSigningKeyFormatError.md)

## Constructors

### Constructor

> **new MidnightJsError**(`message?`): `MidnightJsError`

#### Parameters

##### message?

`string`

#### Returns

`MidnightJsError`

#### Inherited from

`Error.constructor`

### Constructor

> **new MidnightJsError**(`message?`, `options?`): `MidnightJsError`

#### Parameters

##### message?

`string`

##### options?

`ErrorOptions`

#### Returns

`MidnightJsError`

#### Inherited from

`Error.constructor`

## Properties

### category

> `abstract` `readonly` **category**: [`MidnightJsErrorCategory`](../type-aliases/MidnightJsErrorCategory.md)

***

### code

> `abstract` `readonly` **code**: `` `MIDNIGHT_JS_${string}` ``
