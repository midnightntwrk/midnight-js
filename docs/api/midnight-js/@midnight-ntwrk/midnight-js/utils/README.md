[**Midnight.js API Reference v5.0.0-beta.8**](../../../README.md)

***

[Midnight.js API Reference](../../../packages.md) / [@midnight-ntwrk/midnight-js](../README.md) / utils

# utils

## Classes

- [DeserializationError](classes/DeserializationError.md)
- [PasswordValidationError](classes/PasswordValidationError.md)
- [TagParseError](classes/TagParseError.md)
- [UnhandledUnionMemberError](classes/UnhandledUnionMemberError.md)
- [ZkArtifactContractInfoError](classes/ZkArtifactContractInfoError.md)
- [ZkArtifactIntegrityError](classes/ZkArtifactIntegrityError.md)

## Interfaces

- [CallSiteContext](interfaces/CallSiteContext.md)
- [DeserializationCallSite](interfaces/DeserializationCallSite.md)
- [DeserializationContext](interfaces/DeserializationContext.md)
- [ExtractedInfo](interfaces/ExtractedInfo.md)
- [ParsedSerializedTag](interfaces/ParsedSerializedTag.md)
- [PatternEntry](interfaces/PatternEntry.md)
- [ZkArtifactManifest](interfaces/ZkArtifactManifest.md)
- [ZkArtifactManifestFile](interfaces/ZkArtifactManifestFile.md)
- [ZkConfigIntegrityOptions](interfaces/ZkConfigIntegrityOptions.md)

## Type Aliases

- [Classification](type-aliases/Classification.md)
- [ContractsErrorCode](type-aliases/ContractsErrorCode.md)
- [Direction](type-aliases/Direction.md)
- [MidnightJsErrorCode](type-aliases/MidnightJsErrorCode.md)
- [ParsedHexString](type-aliases/ParsedHexString.md)
- [PasswordValidationFailure](type-aliases/PasswordValidationFailure.md)
- [ProviderErrorCode](type-aliases/ProviderErrorCode.md)
- [SourceLibrary](type-aliases/SourceLibrary.md)
- [UtilsErrorCode](type-aliases/UtilsErrorCode.md)
- [ZkArtifactIntegrityMode](type-aliases/ZkArtifactIntegrityMode.md)

## Variables

- [classify](variables/classify.md)
- [computeSha256Hex](variables/computeSha256Hex.md)
- [CONTRACTS\_ERROR\_CODES](variables/CONTRACTS_ERROR_CODES.md)
- [contractStateEnvelopeVersion](variables/contractStateEnvelopeVersion.md)
- [decodeLedgerStateValue](variables/decodeLedgerStateValue.md)
- [deserializeCompactContractState](variables/deserializeCompactContractState.md)
- [deserializeContractState](variables/deserializeContractState.md)
- [deserializeLedgerParameters](variables/deserializeLedgerParameters.md)
- [deserializeLedgerTransaction](variables/deserializeLedgerTransaction.md)
- [deserializeZswapChainState](variables/deserializeZswapChainState.md)
- [fromHex](variables/fromHex.md)
- [isDeserializationError](variables/isDeserializationError.md)
- [isHex](variables/isHex.md)
- [isValidSigningKey](variables/isValidSigningKey.md)
- [ledgerParametersEnvelopeVersion](variables/ledgerParametersEnvelopeVersion.md)
- [MAX\_CONSECUTIVE\_REPEATED](variables/MAX_CONSECUTIVE_REPEATED.md)
- [MAX\_SAFE\_NAME\_LENGTH](variables/MAX_SAFE_NAME_LENGTH.md)
- [MIDNIGHT\_JS\_ERROR\_CODES](variables/MIDNIGHT_JS_ERROR_CODES.md)
- [MIN\_CHARACTER\_CLASSES](variables/MIN_CHARACTER_CLASSES.md)
- [MIN\_PASSWORD\_LENGTH](variables/MIN_PASSWORD_LENGTH.md)
- [MIN\_SEQUENTIAL\_LENGTH](variables/MIN_SEQUENTIAL_LENGTH.md)
- [parseCoinPublicKeyToHex](variables/parseCoinPublicKeyToHex.md)
- [parseEncPublicKeyToHex](variables/parseEncPublicKeyToHex.md)
- [parseHex](variables/parseHex.md)
- [parseSerializedTag](variables/parseSerializedTag.md)
- [PATTERNS](variables/PATTERNS.md)
- [PROVIDER\_ERROR\_CODES](variables/PROVIDER_ERROR_CODES.md)
- [SOURCE\_PACKAGES](variables/SOURCE_PACKAGES.md)
- [toHex](variables/toHex.md)
- [ttlOneHour](variables/ttlOneHour.md)
- [UTILS\_ERROR\_CODES](variables/UTILS_ERROR_CODES.md)
- [validatePassword](variables/validatePassword.md)
- [withDeserializationContext](variables/withDeserializationContext.md)
- [ZK\_CONTRACT\_INFO\_FILE\_NAME](variables/ZK_CONTRACT_INFO_FILE_NAME.md)
- [ZK\_MANIFEST\_DIR](variables/ZK_MANIFEST_DIR.md)
- [ZK\_MANIFEST\_FILE\_NAME](variables/ZK_MANIFEST_FILE_NAME.md)

## Functions

- [assertDefined](functions/assertDefined.md)
- [assertIsContractAddress](functions/assertIsContractAddress.md)
- [assertIsHex](functions/assertIsHex.md)
- [assertManifestHash](functions/assertManifestHash.md)
- [assertNever](functions/assertNever.md)
- [assertSafeName](functions/assertSafeName.md)
- [assertSemVer](functions/assertSemVer.md)
- [assertUndefined](functions/assertUndefined.md)
- [hasErrorCode](functions/hasErrorCode.md)
- [parseZkArtifactManifest](functions/parseZkArtifactManifest.md)
- [parseZkArtifactRuntimeVersion](functions/parseZkArtifactRuntimeVersion.md)
- [verifyZkArtifactIntegrity](functions/verifyZkArtifactIntegrity.md)
- [warnIfInsecureRemoteUrl](functions/warnIfInsecureRemoteUrl.md)
