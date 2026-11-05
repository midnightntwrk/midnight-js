# 0017. Error codes are the contract; every error extends MidnightJsError

- Status: Accepted
- Date: 2026-10-07
- Related: [ADR 0006](./0006-version-tagged-payloads-at-provider-seams.md)

## Context

midnight-js throws errors from many packages. A consumer must be able to tell what to do with
one: retry, fix the configuration, or report a bug. `instanceof` cannot be the answer: two copies
of a package can be installed in one process, and a class from one copy is not an `instanceof`
the other.

## Decision

Every error thrown through a public API extends the abstract `MidnightJsError` from
`@midnight-ntwrk/midnight-js-protocol/errors`. It carries a registered `code` and a `category`.

**The code is the contract.** Consumers recognise errors with `hasErrorCode`, `isMidnightJsError`
and `errorCategory` from `@midnight-ntwrk/midnight-js-utils`. They read `e.code`, so they work
across package copies. `instanceof` is a convenience, not a guarantee.

**Categories** say what the caller should do:

- `USAGE`: fix your own code or configuration; do not retry.
- `ENVIRONMENT`: fix the installation, the versions or the infrastructure.
- `TRANSIENT`: you may retry.
- `REJECTED`: the contract or the network refused the operation.
- `UNCERTAIN`: a submitted transaction may or may not be on chain. Check before doing anything
  else. An unknown outcome is never `TRANSIENT`: a generic retry would submit twice, and a second
  deploy lands at a new address and strands the first deploy's signing key.
- `INTEGRITY`: the data is corrupt or does not agree with itself. Stop and alert.
- `INTERNAL`: a midnight-js bug. Report it.

**Where codes live.** Each group owner keeps its code table and a total `code → category` table
next to it. A class reads its category from that table.

| Group | Prefix | Declared in |
|---|---|---|
| G | `MIDNIGHT_JS_G_` | `packages/protocol/src/errors.ts` (`COMMON_ERROR_CODES`) |
| P | `MIDNIGHT_JS_P_` | `packages/protocol/src/errors.ts` (`PROTOCOL_ERROR_CODES`) |
| PR | `MIDNIGHT_JS_PR_` | `packages/types/src/errors.ts` (`PROVIDER_ERROR_CODES`) |
| C | `MIDNIGHT_JS_C_` | `packages/utils/src/error-codes.ts` (`CONTRACTS_ERROR_CODES`) |
| U | `MIDNIGHT_JS_U_` | `packages/utils/src/error-codes.ts` (`UTILS_ERROR_CODES`) |

- `PROVIDER_ERROR_CODES` is declared once, in `types`, and published on the `./errors` leaf
  subpath, which imports nothing. Reading a code must not load `effect` or a ledger. `utils`
  imports the group from there and folds it into the registry. `types` does not depend on
  `utils` in any form: with the `utils → types` edge, a dev dependency back would be a cycle in
  the build graph.
- `CONTRACTS_ERROR_CODES` lives in `utils`, not in `contracts`, because the registry that
  `hasErrorCode` reads must be complete, and `utils` sits below `contracts`.
- `packages/utils/src/test/troubleshooting-coverage.test.ts` pins the registry against
  `TROUBLESHOOTING.md` in both directions, and needs a remedy per code.

**The guard is typed to the registry.** `hasErrorCode(e, code)` takes only a
`MidnightJsErrorCode`, so a misspelled code is a compile error. A foreign code, such as Node's
`ECONNREFUSED`, goes through `hasForeignErrorCode`. That function refuses one of our codes at
compile time, and refuses a string that starts with `MIDNIGHT_JS_` at run time, because a
misspelling of our code is exactly what sends a caller to the foreign form.

**One class per fault.** A class is one fault. When a fault has several cases, the class carries a
field that names the case (`reason`, `operation` or `stage`). Classes are merged only within one
category, so a caller never reads the field to learn what to do. Examples: every failed
transaction, in either era, is one `TxFailedError` with an `operation`. `EraMismatchError` carries
a `reason`. A new sub-family below `MidnightJsError` exists only when callers handle the whole
family the same way.

**A wrong-era fault is split by who is at fault.** `EraMismatchError` is `USAGE`: the caller
passed something of the wrong era. `EraInvariantViolationError` is `INTERNAL`: a provider or the
framework broke the era rule. `PublicStatesEraMismatchError` and `IndexerInconsistencyError` are
`INTEGRITY`: the served data does not agree with itself. A value with no era is
`UnknownLedgerEraError` (`ENVIRONMENT`, `requestedVersion` is `undefined`): an outdated provider or
an outdated midnight-js.

**No plain errors.** In `packages/*/src`, building a plain `Error`, `TypeError`, `RangeError` or
`AggregateError` to throw or reject with, and declaring a class that extends one of them, are
forbidden. Tests and the `compact` CLI are exempt. The ESLint gate matches the usual shapes
(`throw new`, `throw Error(...)`, a variable later thrown, `Promise.reject`, `reject(...)`,
`Effect.fail`). A plain error built only as a `cause` is allowed. A `fetch` failure at a provider,
including reading the body, is wrapped with the original on `cause`. An error midnight-js did not
raise (from a dependency, the platform or user code) passes through unchanged and uncoded, with one
exception: a rejection from a provider method that `contracts` calls is wrapped in
`ProviderFailedError` with a sanitized `cause` (`atProviderMethod`), because it may carry external
material. A registered error with no `cause` passes through unchanged, and a sanitized `cause` keeps
its registered `code`. Several
concurrent failures are reported together as `ContractExecutionError`, which keeps every failure
on `errors`.

**Messages do not copy caller data where it is untrusted.** `PayloadNotATransactionError` names
the kind of value it refused. For a plain object that name is caller data, so it is cut to 32
characters and then kept only if it is a plain identifier, checked after the cut.

## Consequences

- **Positive:** one way to handle every error, across package copies. The category tells the
  caller what to do. The compiler refuses a subclass without a `code` or a `category`; the
  per-package class tests check that the code is registered and the category matches.
- **Positive:** a typo in a code passed to `hasErrorCode` does not compile, instead of silently
  returning `false` forever.
- **Negative:** a code renamed in the registry and in `TROUBLESHOOTING.md` in one change passes
  every gate. Codes are public, so a rename is a breaking change and needs review.
- **Negative:** a caller handling one case of a merged class reads its field, not its class.
- **Follow-ups:** wrap the errors that still leave uncoded: ledger WASM exceptions outside the
  deserialization wrappers, the native `TypeError` that `inflate` raises on malformed input, and
  compact-js errors that reach callers through `exitResultOrError`.

## Alternatives considered

- **Codes only, no common base.** Rejected: nothing forces a new class to carry a code, and
  consumers get no single type to narrow to.
- **Category as an inheritance level (`UsageError`, `TransientError`, ...).** Rejected:
  `instanceof` fails across package copies, and moving an error between categories would be a
  breaking re-parent.
- **A `retryable` flag only.** Rejected: it does not separate "fix your configuration" from
  "report a bug".
- **A loose `hasErrorCode(e, code: string)`.** Rejected: a typo compiles and always answers
  `false`.

## Codes

`packages/utils/src/test/adr-category-coverage.test.ts` checks this table against the code tables
in both directions. Every registered code appears here exactly once, with its category.

| Group | Code (suffix) | Category | Class |
|---|---|---|---|
| G | `INVALID_ARGUMENT` | USAGE | `InvalidArgumentError` |
| G | `CONFIGURATION_MISSING` | USAGE | `ConfigurationError` |
| G | `ENVIRONMENT_UNSUPPORTED` | ENVIRONMENT | `EnvironmentUnsupportedError` |
| G | `INVARIANT_VIOLATED` | INTERNAL | `InvariantViolationError` |
| P | `UNKNOWN_PROTOCOL_VERSION_READ` | ENVIRONMENT | `UnknownProtocolVersionError` |
| P | `UNKNOWN_PROTOCOL_VERSION_CONSTRUCT` | ENVIRONMENT | `UnknownProtocolVersionError` |
| P | `LEDGER8_RUNTIME_MISSING` | ENVIRONMENT | `Ledger8RuntimeMissingError` |
| P | `STATE_CONVERSION_FAILED` | INTEGRITY | `StateConversionFailedError` |
| P | `COMPOSE_FAILED` | USAGE | `ComposeFailedError` |
| P | `COMPOSE_OPTION_INVALID` | USAGE | `ComposeOptionError` |
| P | `STATE_DECODE_FAILED` | INTEGRITY | `StateDecodeFailedError` |
| P | `STATE_INCONSISTENT` | INTEGRITY | `StateInconsistentError` |
| P | `UNKNOWN_LEDGER_ERA` | ENVIRONMENT | `UnknownLedgerEraError` |
| P | `LEDGER8_RUNTIME_INVALID` | ENVIRONMENT | `Ledger8RuntimeInvalidError` |
| P | `PAYLOAD_NOT_A_TRANSACTION` | USAGE | `PayloadNotATransactionError` |
| P | `CONTRACT_EXECUTION_FAILED` | REJECTED | `ContractExecutionError` |
| P | `MAINTENANCE_AUTHORITY_MISMATCH` | USAGE | `MaintenanceAuthorityMismatchError` |
| PR | `DECODER_ERA_UNSUPPORTED` | ENVIRONMENT | `DecoderEraUnsupportedError` |
| PR | `UNKNOWN_RECORD_ERA` | ENVIRONMENT | `UnknownRecordEraError` |
| PR | `PROVIDER_ERA_UNSUPPORTED` | USAGE | `ProviderEraUnsupportedError` |
| PR | `PRIVATE_STATE_NOT_SERIALIZABLE` | USAGE | `PrivateStateSerializationError` |
| PR | `INVALID_PROTOCOL_SCHEME` | USAGE | `InvalidProtocolSchemeError` |
| PR | `ARTIFACT_RUNTIME_VERSION_UNAVAILABLE` | ENVIRONMENT | `ArtifactRuntimeVersionUnavailableError` |
| PR | `ZK_ARTIFACT_NOT_FOUND` | ENVIRONMENT | `ZKArtifactNotFoundError` |
| PR | `ZK_ARTIFACT_FETCH_FAILED` | TRANSIENT | `ZkArtifactFetchError` (network failure, HTTP 408, 429 or ≥ 500) |
| PR | `ZK_ARTIFACT_NOT_SERVED` | ENVIRONMENT | `ZkArtifactFetchError` (other HTTP < 500, or an HTML fallback) |
| PR | `PROOF_SERVER_UNAVAILABLE` | TRANSIENT | `ProofServerError` (network failure, HTTP 408, 429 or ≥ 500) |
| PR | `PROOF_SERVER_REFUSED` | ENVIRONMENT | `ProofServerError` (other HTTP < 500) |
| PR | `PRIVATE_STATE_EXPORT_FAILED` | USAGE | `PrivateStateExportError` |
| PR | `SIGNING_KEY_EXPORT_FAILED` | USAGE | `SigningKeyExportError` |
| PR | `PRIVATE_STATE_IMPORT_FAILED` | INTEGRITY | `PrivateStateImportError` |
| PR | `EXPORT_DECRYPTION_FAILED` | INTEGRITY | `ExportDecryptionError` |
| PR | `INVALID_EXPORT_FORMAT` | INTEGRITY | `InvalidExportFormatError` |
| PR | `IMPORT_CONFLICT` | USAGE | `ImportConflictError` |
| PR | `PRIVATE_STATE_DECRYPTION_FAILED` | INTEGRITY | `PrivateStateDecryptionError` |
| PR | `PRIVATE_STATE_STORAGE_FAILED` | ENVIRONMENT | `PrivateStateStorageError` |
| PR | `PRIVATE_STATE_LIMIT_EXCEEDED` | USAGE | `PrivateStateLimitExceededError` |
| PR | `STORED_SIGNING_KEY_INVALID` | INTEGRITY | `StoredSigningKeyFormatError` |
| PR | `INDEXER_GRAPHQL_FAILED` | ENVIRONMENT | `IndexerFormattedError` |
| PR | `INDEXER_QUERY_FAILED` | TRANSIENT | `IndexerQueryError` |
| PR | `INDEXER_DATA_INVALID` | INTEGRITY | `IndexerDataError` |
| PR | `INDEXER_SUBSCRIPTION_DATA_INVALID` | INTEGRITY | `IndexerSubscriptionDataError` |
| PR | `INDEXER_CONFIG_INVALID` | USAGE | `IndexerProviderConfigError` |
| PR | `INDEXER_INVARIANT_VIOLATED` | INTERNAL | `IndexerInvariantError` |
| PR | `INDEXER_PAYLOAD_TOO_LARGE` | INTEGRITY | `IndexerPayloadTooLargeError` |
| PR | `UNUSABLE_ERA_ENTRY` | USAGE | `UnusableEraEntryError` |
| PR | `INVALID_TRANSACTION_HANDLE` | USAGE | `InvalidTransactionHandleError` |
| PR | `TRANSACTION_ERA_MISMATCH` | USAGE | `TransactionEraMismatchError` |
| PR | `TRANSACTION_DECODER_MISSING` | USAGE | `TransactionDecoderMissingError` |
| PR | `TRANSACTION_DECODE_FAILED` | INTEGRITY | `TransactionDecodeFailedError` |
| PR | `INVALID_LEDGER_STATE` | USAGE | `InvalidSerializedStateError` |
| PR | `LEDGER_STATE_DECODER_MISSING` | USAGE | `SerializedStateDecoderMissingError` |
| PR | `LEDGER_STATE_DECODE_FAILED` | INTEGRITY | `SerializedStateDecodeFailedError` |
| PR | `WATCH_TIMED_OUT` | UNCERTAIN | `WatchTimeoutError` |
| C | `ERA_INVARIANT_VIOLATION` | INTERNAL | `EraInvariantViolationError` |
| C | `ERA_MISMATCH` | USAGE | `EraMismatchError` |
| C | `TX_FAILED` | REJECTED | `TxFailedError` |
| C | `NETWORK_VERSION_STATE_MISMATCH` | TRANSIENT | `NetworkVersionStateMismatchError` |
| C | `INDEXER_INCONSISTENCY` | INTEGRITY | `IndexerInconsistencyError` |
| C | `PUBLIC_STATES_ERA_MISMATCH` | INTEGRITY | `PublicStatesEraMismatchError` |
| C | `BLANK_VERIFIER_KEY_SLOT` | INTEGRITY | `BlankVerifierKeySlotError` |
| C | `VERIFIER_KEY_MISMATCH` | INTEGRITY | `VerifierKeyMismatchError` |
| C | `PROVIDER_FAILED` | ENVIRONMENT | `ProviderFailedError` |
| C | `FORK_CROSSED_DURING_OPERATION` | UNCERTAIN | `ForkCrossedDuringOperationError` |
| C | `SUBMIT_REJECTION_UNDIAGNOSED` | UNCERTAIN | `SubmitRejectionUndiagnosedError` |
| C | `LEDGER_PARAMETERS_UNSERVED` | ENVIRONMENT | `LedgerParametersUnservedError` |
| C | `CONTRACT_TYPE_MISMATCH` | USAGE | `ContractTypeError` |
| C | `INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteCallTxPrivateStateConfig` |
| C | `INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteDeployContractPrivateStateConfig` |
| C | `INCOMPLETE_FIND_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteFindContractPrivateStateConfig` |
| C | `SCOPED_TRANSACTION_IDENTITY_MISMATCH` | USAGE | `ScopedTransactionIdentityMismatchError` |
| C | `LEDGER8_AMBIGUOUS_ENTRY_POINT` | INTEGRITY | `Ledger8AmbiguousEntryPointError` |
| C | `LEDGER8_SIGNING_KEY` | USAGE | `Ledger8SigningKeyError` |
| C | `LEDGER8_UNCONFIRMED` | UNCERTAIN | `Ledger8UnconfirmedError` |
| C | `LEDGER8_NOT_STORED` | ENVIRONMENT | `Ledger8NotStoredError` |
| C | `LEDGER8_CALL_UNSUPPORTED` | USAGE | `Ledger8CallUnsupportedError` |
| C | `NETWORK_VERSION_READ_FAILED` | TRANSIENT | `NetworkVersionReadFailedError` |
| C | `ZSWAP_OUTPUT_UNRESOLVED` | USAGE | `ZswapOutputResolutionError` |
| C | `CONTRACT_NOT_FOUND` | USAGE | `ContractNotFoundError` |
| C | `PRIVATE_STATE_NOT_FOUND` | USAGE | `PrivateStateNotFoundError` |
| U | `TAG_PARSE_FAILED` | INTEGRITY | `TagParseError` |
| U | `UNHANDLED_UNION_MEMBER` | INTERNAL | `UnhandledUnionMemberError` |
| U | `ZK_ARTIFACT_INTEGRITY_FAILED` | INTEGRITY | `ZkArtifactIntegrityError` |
| U | `ZK_ARTIFACT_CONTRACT_INFO_INVALID` | INTEGRITY | `ZkArtifactContractInfoError` |
| U | `PASSWORD_INVALID` | USAGE | `PasswordValidationError` |
| U | `DESERIALIZATION_FAILED` | INTEGRITY | `DeserializationError` |
