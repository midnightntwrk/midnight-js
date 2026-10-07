# 0017. Error codes are the contract; every error extends MidnightJsError

- Status: Accepted
- Date: 2026-10-07
- Deciders: Szymon Paluchowski
- Related: #1438

## Context

midnight-js throws ~75 error classes from five packages plus ~85 plain `Error`/`TypeError`/`RangeError`
throws. Only three families share a base class. About half the classes carry no code, so `hasErrorCode`
cannot see them. A consumer cannot tell whether to retry, fix configuration or report a bug.
`instanceof` is unreliable here: two copies of a package can be installed in one process (ledger-v8 already
is, under two npm scopes).

## Decision

We will make every error thrown through a public API extend the abstract `MidnightJsError` from
`@midnight-ntwrk/midnight-js-protocol/errors`, carrying a registered `code` and a `category`
(`USAGE`, `ENVIRONMENT`, `TRANSIENT`, `REJECTED`, `INTEGRITY`, `INTERNAL`).

The code is the contract. Consumers recognise errors with `hasErrorCode`, `isMidnightJsError` and
`errorCategory` from `@midnight-ntwrk/midnight-js-utils`, which read `e.code` and so work across package
copies. `instanceof` is a convenience, not a guarantee.

Each code group owner keeps a total `code → category` table next to its code table; a class reads its
category from that table. Inheritance below the base is at most two levels, and a sub-family exists only
when callers handle the whole family the same way.

Plain `throw new Error/TypeError/RangeError/AggregateError` is forbidden in `packages/*/src` (tests and the
`compact` CLI exempt). Failures of `fetch` at provider I/O seams are wrapped with the original on `cause`.

## Consequences

- **Positive:** one way to handle every error; the compiler refuses a class without a code; the category
  tells the caller what to do.
- **Negative:** `ContractTypeError` is no longer a `TypeError`; `SubmitRejectionUndiagnosedError` is no
  longer an `AggregateError` (keeps `errors`); 14 former `TypeError`/`RangeError` throws change class.
- **Follow-ups:** wrap ledger WASM exceptions outside the deserialization wrappers.

## Alternatives considered

- **No common base, codes only.** Rejected: nothing forces a new class to carry a code; consumers get no
  single type to narrow to.
- **Category as an inheritance level (`UsageError`, `TransientError`, …).** Rejected: `instanceof` fails
  across package copies, and moving an error between categories would be a breaking re-parent.
- **A `retryable` flag only.** Rejected: it does not separate "fix your configuration" from "report a bug".

## Category assignments

Category meanings: `USAGE` fix own code/config, do not retry · `ENVIRONMENT` fix installation, versions or infrastructure · `TRANSIENT` may retry · `REJECTED` the operation was refused by contract or network rules · `INTEGRITY` corrupt or mismatched data, stop and alert · `INTERNAL` a midnight-js bug, report it.

**New codes** (`*` = new class):

| Group | Code (suffix) | Category | Class |
|---|---|---|---|
| G | `INVALID_ARGUMENT` | USAGE | `InvalidArgumentError`* |
| G | `CONFIGURATION_MISSING` | USAGE | `ConfigurationError`* |
| G | `ENVIRONMENT_UNSUPPORTED` | ENVIRONMENT | `EnvironmentUnsupportedError`* |
| G | `INVARIANT_VIOLATED` | INTERNAL | `InvariantViolationError`* |
| P | `CONTRACT_EXECUTION_FAILED` | REJECTED | `ContractExecutionError`* |
| P | `CONTRACT_STATE_INVALID` | INTEGRITY | `ContractStateInvalidError`* |
| PR | `INVALID_PROTOCOL_SCHEME` | USAGE | `InvalidProtocolSchemeError` |
| PR | `ARTIFACT_RUNTIME_VERSION_UNAVAILABLE` | ENVIRONMENT | `ArtifactRuntimeVersionUnavailableError` |
| PR | `ZK_ARTIFACT_NOT_FOUND` | ENVIRONMENT | `ZKArtifactNotFoundError` |
| PR | `ZK_ARTIFACT_FETCH_FAILED` | TRANSIENT | `ZkArtifactFetchError`* (network failure, HTTP 408, 429 or ≥ 500) |
| PR | `ZK_ARTIFACT_NOT_SERVED` | ENVIRONMENT | `ZkArtifactFetchError`* (other HTTP < 500 or HTML fallback) |
| PR | `PROOF_SERVER_UNAVAILABLE` | TRANSIENT | `ProofServerError`* (network failure, HTTP 408, 429 or ≥ 500) |
| PR | `PROOF_SERVER_REFUSED` | ENVIRONMENT | `ProofServerError`* (other HTTP < 500) |
| PR | `PRIVATE_STATE_EXPORT_FAILED` | USAGE | `PrivateStateExportError` |
| PR | `SIGNING_KEY_EXPORT_FAILED` | USAGE | `SigningKeyExportError` |
| PR | `PRIVATE_STATE_IMPORT_FAILED` | INTEGRITY | `PrivateStateImportError` |
| PR | `EXPORT_DECRYPTION_FAILED` | INTEGRITY | `ExportDecryptionError` |
| PR | `INVALID_EXPORT_FORMAT` | INTEGRITY | `InvalidExportFormatError` |
| PR | `IMPORT_CONFLICT` | USAGE | `ImportConflictError` |
| PR | `PRIVATE_STATE_DECRYPTION_FAILED` | INTEGRITY | `PrivateStateDecryptionError`* |
| PR | `PRIVATE_STATE_STORAGE_FAILED` | ENVIRONMENT | `PrivateStateStorageError`* |
| PR | `PRIVATE_STATE_LIMIT_EXCEEDED` | USAGE | `PrivateStateLimitExceededError`* |
| PR | `INDEXER_GRAPHQL_FAILED` | ENVIRONMENT | `IndexerFormattedError` |
| PR | `INDEXER_QUERY_FAILED` | TRANSIENT | `IndexerQueryError` |
| PR | `INDEXER_DATA_INVALID` | INTEGRITY | `IndexerDataError` |
| PR | `INDEXER_SUBSCRIPTION_DATA_INVALID` | INTEGRITY | `IndexerSubscriptionDataError` |
| PR | `INDEXER_CONFIG_INVALID` | USAGE | `IndexerProviderConfigError` |
| PR | `INDEXER_INVARIANT_VIOLATED` | INTERNAL | `IndexerInvariantError` |
| PR | `INDEXER_PAYLOAD_TOO_LARGE` | INTEGRITY | `IndexerPayloadTooLargeError`* |
| PR | `STORED_SIGNING_KEY_INVALID` | INTEGRITY | `StoredSigningKeyFormatError` |
| C | `CONTRACT_TYPE_MISMATCH` | USAGE | `ContractTypeError` |
| C | `INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteCallTxPrivateStateConfig` |
| C | `INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteDeployContractPrivateStateConfig` |
| C | `INCOMPLETE_FIND_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteFindContractPrivateStateConfig` |
| C | `SCOPED_TX_IDENTITY_MISMATCH` | USAGE | `ScopedTransactionIdentityMismatchError` |
| C | `LEDGER8_DEPLOY_UNCONFIRMED` | TRANSIENT | `Ledger8DeployUnconfirmedError` |
| C | `LEDGER8_AMBIGUOUS_ENTRY_POINT` | USAGE | `Ledger8AmbiguousEntryPointError` |
| C | `LEDGER8_RECIPIENT_UNMAPPABLE` | USAGE | `Ledger8RecipientUnmappableError` |
| C | `LEDGER8_DEPLOY_NOT_STORED` | ENVIRONMENT | `Ledger8DeployNotStoredError` |
| C | `LEDGER8_SIGNING_KEY_UNUSABLE` | USAGE | `Ledger8SigningKeyUnusableError` |
| C | `HEAD_READ_FAILED` | TRANSIENT | `HeadReadFailedError`* |
| C | `ZSWAP_OUTPUT_UNRESOLVED` | USAGE | `ZswapOutputResolutionError`* |
| C | `CONTRACT_NOT_FOUND` | USAGE | `ContractNotFoundError`* |
| C | `PRIVATE_STATE_NOT_FOUND` | USAGE | `PrivateStateNotFoundError`* |
| U | `ZK_ARTIFACT_INTEGRITY_FAILED` | INTEGRITY | `ZkArtifactIntegrityError` |
| U | `ZK_ARTIFACT_CONTRACT_INFO_INVALID` | INTEGRITY | `ZkArtifactContractInfoError` |
| U | `PASSWORD_INVALID` | USAGE | `PasswordValidationError` |
| U | `DESERIALIZATION_FAILED` | INTEGRITY | `DeserializationError` |

**Existing codes, category only:**

| Group | Code (suffix) → Category |
|---|---|
| P | `UNKNOWN_PROTOCOL_VERSION_READ`, `UNKNOWN_PROTOCOL_VERSION_CONSTRUCT`, `LEDGER8_INSTANCE_MISMATCH`, `LEDGER8_RUNTIME_MISSING`, `UNKNOWN_LEDGER_VERSION`, `LEDGER8_RUNTIME_INVALID` → ENVIRONMENT · `DOWN_CONVERT_FAILED`, `STATE_DECODE_FAILED` → INTEGRITY · `COMPOSE_FAILED`, `COMPOSE_OPTION_INVALID`, `PAYLOAD_NOT_A_TRANSACTION` → USAGE · `MERKLE_NOT_REHASHED`, `UNKNOWN_LEDGER8_AXIS` → INTERNAL |
| PR | `V8_PAYLOAD_UNSUPPORTED`, `UNTAGGED_PAYLOAD`, `SEAM_ERA_UNSUPPORTED`, `PRIVATE_STATE_NOT_SERIALIZABLE` → USAGE · `ERA_UNSUPPORTED`, `ERA_UNRESOLVABLE` → ENVIRONMENT |
| C | `TX_FAILED` → REJECTED · `HEAD_STATE_ERA_MISMATCH`, `STALE_HEAD`, `SUBMIT_REJECTION_UNDIAGNOSED` → TRANSIENT · `INDEXER_INCONSISTENCY`, `BLANK_VERIFIER_KEY_SLOT`, `VERIFIER_KEY_MISMATCH` → INTEGRITY · `LEDGER8_SEAM_FAILED`, `LEDGER_PARAMETERS_UNSERVED` → ENVIRONMENT · `ERA_ARTIFACT_MISMATCH`, `UNRECOGNISED_RESULT_ERA`, `LEDGER8_DEPLOY_ON_V9`, `RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE`, `LEDGER8_SHIELDED_SPEND_UNSUPPORTED`, `SCOPED_TX_ERA_UNSUPPORTED`, `MIXED_ERA_SCOPE` → USAGE · `ERA_INVARIANT_VIOLATION` → INTERNAL |
| U | `TAG_PARSE_FAILED` → INTEGRITY · `UNHANDLED_UNION_MEMBER` → INTERNAL |
