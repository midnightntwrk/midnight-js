[**Midnight.js API Reference v5.0.0-rc.4**](../../../../README.md)

***

[Midnight.js API Reference](../../../../packages.md) / [@midnight-ntwrk/midnight-js-protocol](../../README.md) / [index](../README.md) / MidnightJsError

# Abstract Class: MidnightJsError

Base class of every error midnight-js raises itself. An error without a registered code came from a
dependency, the platform or user code, and midnight-js passed it through unchanged. Recognise one with
`hasErrorCode`, `isMidnightJsError` or `errorCategory` from the `midnight-js-utils` package: they read
`code`, so they also work when two copies of a package are installed, where `instanceof` does not.

## Extends

- `Error`

## Extended by

- [`InvalidArgumentError`](InvalidArgumentError.md)
- [`ConfigurationError`](ConfigurationError.md)
- [`EnvironmentUnsupportedError`](EnvironmentUnsupportedError.md)
- [`InvariantViolationError`](InvariantViolationError.md)
- [`UnknownProtocolVersionError`](UnknownProtocolVersionError.md)
- [`Ledger8RuntimeMissingError`](Ledger8RuntimeMissingError.md)
- [`Ledger8InstanceMismatchError`](Ledger8InstanceMismatchError.md)
- [`DownConvertFailedError`](DownConvertFailedError.md)
- [`MerkleNotRehashedError`](MerkleNotRehashedError.md)
- [`ComposeFailedError`](ComposeFailedError.md)
- [`ComposeOptionError`](ComposeOptionError.md)
- [`StateDecodeFailedError`](StateDecodeFailedError.md)
- [`StateInconsistentError`](StateInconsistentError.md)
- [`Ledger8RuntimeInvalidError`](Ledger8RuntimeInvalidError.md)
- [`UnknownLedger8AxisError`](UnknownLedger8AxisError.md)
- [`UnknownLedgerVersionError`](UnknownLedgerVersionError.md)
- [`PayloadNotATransactionError`](PayloadNotATransactionError.md)
- [`ContractExecutionError`](ContractExecutionError.md)
- [`ArtifactRuntimeVersionUnavailableError`](../../../midnight-js-types/index/classes/ArtifactRuntimeVersionUnavailableError.md)
- [`InvalidProtocolSchemeError`](../../../midnight-js-types/index/classes/InvalidProtocolSchemeError.md)
- [`PrivateStateDecryptionError`](../../../midnight-js-types/index/classes/PrivateStateDecryptionError.md)
- [`PrivateStateExportError`](../../../midnight-js-types/index/classes/PrivateStateExportError.md)
- [`PrivateStateImportError`](../../../midnight-js-types/index/classes/PrivateStateImportError.md)
- [`PrivateStateLimitExceededError`](../../../midnight-js-types/index/classes/PrivateStateLimitExceededError.md)
- [`PrivateStateSerializationError`](../../../midnight-js-types/index/classes/PrivateStateSerializationError.md)
- [`PrivateStateStorageError`](../../../midnight-js-types/index/classes/PrivateStateStorageError.md)
- [`ProofServerError`](../../../midnight-js-types/index/classes/ProofServerError.md)
- [`SeamEraUnsupportedError`](../../../midnight-js-types/index/classes/SeamEraUnsupportedError.md)
- [`SigningKeyExportError`](../../../midnight-js-types/index/classes/SigningKeyExportError.md)
- [`UntaggedPayloadError`](../../../midnight-js-types/index/classes/UntaggedPayloadError.md)
- [`V8PayloadUnsupportedError`](../../../midnight-js-types/index/classes/V8PayloadUnsupportedError.md)
- [`ZkArtifactFetchError`](../../../midnight-js-types/index/classes/ZkArtifactFetchError.md)
- [`ZKArtifactNotFoundError`](../../../midnight-js-types/index/classes/ZKArtifactNotFoundError.md)
- [`DeserializationError`](../../../midnight-js-utils/index/classes/DeserializationError.md)
- [`PasswordValidationError`](../../../midnight-js-utils/index/classes/PasswordValidationError.md)
- [`TagParseError`](../../../midnight-js-utils/index/classes/TagParseError.md)
- [`UnhandledUnionMemberError`](../../../midnight-js-utils/index/classes/UnhandledUnionMemberError.md)
- [`ZkArtifactContractInfoError`](../../../midnight-js-utils/index/classes/ZkArtifactContractInfoError.md)
- [`ZkArtifactIntegrityError`](../../../midnight-js-utils/index/classes/ZkArtifactIntegrityError.md)

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
