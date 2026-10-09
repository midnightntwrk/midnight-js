[**Midnight.js API Reference v5.0.0-rc.4**](../../../README.md)

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
- [`AnyEraTxFailedError`](../contracts/classes/AnyEraTxFailedError.md)
- [`BlankVerifierKeySlotError`](../contracts/classes/BlankVerifierKeySlotError.md)
- [`ContractNotFoundError`](../contracts/classes/ContractNotFoundError.md)
- [`ContractTypeError`](../contracts/classes/ContractTypeError.md)
- [`EraArtifactMismatchError`](../contracts/classes/EraArtifactMismatchError.md)
- [`EraInvariantViolationError`](../contracts/classes/EraInvariantViolationError.md)
- [`HeadReadFailedError`](../contracts/classes/HeadReadFailedError.md)
- [`HeadStateEraMismatchError`](../contracts/classes/HeadStateEraMismatchError.md)
- [`IncompleteCallTxPrivateStateConfig`](../contracts/classes/IncompleteCallTxPrivateStateConfig.md)
- [`IncompleteDeployContractPrivateStateConfig`](../contracts/classes/IncompleteDeployContractPrivateStateConfig.md)
- [`IncompleteFindContractPrivateStateConfig`](../contracts/classes/IncompleteFindContractPrivateStateConfig.md)
- [`IndexerInconsistencyError`](../contracts/classes/IndexerInconsistencyError.md)
- [`LedgerParametersUnservedError`](../contracts/classes/LedgerParametersUnservedError.md)
- [`MixedEraScopeError`](../contracts/classes/MixedEraScopeError.md)
- [`PrivateStateNotFoundError`](../contracts/classes/PrivateStateNotFoundError.md)
- [`RetainedArtifactOnCurrentEraStateError`](../contracts/classes/RetainedArtifactOnCurrentEraStateError.md)
- [`ScopedTransactionIdentityMismatchError`](../contracts/classes/ScopedTransactionIdentityMismatchError.md)
- [`ScopedTxEraUnsupportedError`](../contracts/classes/ScopedTxEraUnsupportedError.md)
- [`StaleHeadError`](../contracts/classes/StaleHeadError.md)
- [`SubmitRejectionUndiagnosedError`](../contracts/classes/SubmitRejectionUndiagnosedError.md)
- [`UnrecognisedResultEraError`](../contracts/classes/UnrecognisedResultEraError.md)
- [`VerifierKeyMismatchError`](../contracts/classes/VerifierKeyMismatchError.md)
- [`ZswapOutputResolutionError`](../contracts/classes/ZswapOutputResolutionError.md)
- [`ArtifactRuntimeVersionUnavailableError`](../types/classes/ArtifactRuntimeVersionUnavailableError.md)
- [`InvalidProtocolSchemeError`](../types/classes/InvalidProtocolSchemeError.md)
- [`PrivateStateDecryptionError`](../types/classes/PrivateStateDecryptionError.md)
- [`PrivateStateExportError`](../types/classes/PrivateStateExportError.md)
- [`PrivateStateImportError`](../types/classes/PrivateStateImportError.md)
- [`PrivateStateLimitExceededError`](../types/classes/PrivateStateLimitExceededError.md)
- [`PrivateStateSerializationError`](../types/classes/PrivateStateSerializationError.md)
- [`PrivateStateStorageError`](../types/classes/PrivateStateStorageError.md)
- [`ProofServerError`](../types/classes/ProofServerError.md)
- [`SeamEraUnsupportedError`](../types/classes/SeamEraUnsupportedError.md)
- [`SigningKeyExportError`](../types/classes/SigningKeyExportError.md)
- [`UntaggedPayloadError`](../types/classes/UntaggedPayloadError.md)
- [`V8PayloadUnsupportedError`](../types/classes/V8PayloadUnsupportedError.md)
- [`ZKArtifactNotFoundError`](../types/classes/ZKArtifactNotFoundError.md)
- [`ZkArtifactFetchError`](../types/classes/ZkArtifactFetchError.md)
- [`DeserializationError`](../utils/classes/DeserializationError.md)
- [`PasswordValidationError`](../utils/classes/PasswordValidationError.md)
- [`TagParseError`](../utils/classes/TagParseError.md)
- [`UnhandledUnionMemberError`](../utils/classes/UnhandledUnionMemberError.md)
- [`ZkArtifactContractInfoError`](../utils/classes/ZkArtifactContractInfoError.md)
- [`ZkArtifactIntegrityError`](../utils/classes/ZkArtifactIntegrityError.md)
- [`AmbiguousEntryPointError`](../contracts/namespaces/Ledger8/classes/AmbiguousEntryPointError.md)
- [`DeployNotStoredError`](../contracts/namespaces/Ledger8/classes/DeployNotStoredError.md)
- [`DeployOnV9Error`](../contracts/namespaces/Ledger8/classes/DeployOnV9Error.md)
- [`DeployUnconfirmedError`](../contracts/namespaces/Ledger8/classes/DeployUnconfirmedError.md)
- [`RecipientUnmappableError`](../contracts/namespaces/Ledger8/classes/RecipientUnmappableError.md)
- [`SeamFailedError`](../contracts/namespaces/Ledger8/classes/SeamFailedError.md)
- [`ShieldedSpendUnsupportedError`](../contracts/namespaces/Ledger8/classes/ShieldedSpendUnsupportedError.md)
- [`SigningKeyUnusableError`](../contracts/namespaces/Ledger8/classes/SigningKeyUnusableError.md)
- [`AmbiguousEntryPointError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/AmbiguousEntryPointError.md)
- [`DeployNotStoredError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/DeployNotStoredError.md)
- [`DeployOnV9Error`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/DeployOnV9Error.md)
- [`DeployUnconfirmedError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/DeployUnconfirmedError.md)
- [`RecipientUnmappableError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/RecipientUnmappableError.md)
- [`SeamFailedError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/SeamFailedError.md)
- [`ShieldedSpendUnsupportedError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/ShieldedSpendUnsupportedError.md)
- [`SigningKeyUnusableError`](../../midnight-js-contracts/index/namespaces/Ledger8/classes/SigningKeyUnusableError.md)
- [`AnyEraTxFailedError`](../../midnight-js-contracts/index/classes/AnyEraTxFailedError.md)
- [`BlankVerifierKeySlotError`](../../midnight-js-contracts/index/classes/BlankVerifierKeySlotError.md)
- [`ContractNotFoundError`](../../midnight-js-contracts/index/classes/ContractNotFoundError.md)
- [`ContractTypeError`](../../midnight-js-contracts/index/classes/ContractTypeError.md)
- [`EraArtifactMismatchError`](../../midnight-js-contracts/index/classes/EraArtifactMismatchError.md)
- [`EraInvariantViolationError`](../../midnight-js-contracts/index/classes/EraInvariantViolationError.md)
- [`HeadReadFailedError`](../../midnight-js-contracts/index/classes/HeadReadFailedError.md)
- [`HeadStateEraMismatchError`](../../midnight-js-contracts/index/classes/HeadStateEraMismatchError.md)
- [`IncompleteCallTxPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteCallTxPrivateStateConfig.md)
- [`IncompleteDeployContractPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteDeployContractPrivateStateConfig.md)
- [`IncompleteFindContractPrivateStateConfig`](../../midnight-js-contracts/index/classes/IncompleteFindContractPrivateStateConfig.md)
- [`IndexerInconsistencyError`](../../midnight-js-contracts/index/classes/IndexerInconsistencyError.md)
- [`LedgerParametersUnservedError`](../../midnight-js-contracts/index/classes/LedgerParametersUnservedError.md)
- [`MixedEraScopeError`](../../midnight-js-contracts/index/classes/MixedEraScopeError.md)
- [`PrivateStateNotFoundError`](../../midnight-js-contracts/index/classes/PrivateStateNotFoundError.md)
- [`RetainedArtifactOnCurrentEraStateError`](../../midnight-js-contracts/index/classes/RetainedArtifactOnCurrentEraStateError.md)
- [`ScopedTransactionIdentityMismatchError`](../../midnight-js-contracts/index/classes/ScopedTransactionIdentityMismatchError.md)
- [`ScopedTxEraUnsupportedError`](../../midnight-js-contracts/index/classes/ScopedTxEraUnsupportedError.md)
- [`StaleHeadError`](../../midnight-js-contracts/index/classes/StaleHeadError.md)
- [`SubmitRejectionUndiagnosedError`](../../midnight-js-contracts/index/classes/SubmitRejectionUndiagnosedError.md)
- [`UnrecognisedResultEraError`](../../midnight-js-contracts/index/classes/UnrecognisedResultEraError.md)
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
