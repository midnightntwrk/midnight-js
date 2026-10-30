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
(`USAGE`, `ENVIRONMENT`, `TRANSIENT`, `REJECTED`, `UNCERTAIN`, `INTEGRITY`, `INTERNAL`).

The code is the contract. Consumers recognise errors with `hasErrorCode`, `isMidnightJsError` and
`errorCategory` from `@midnight-ntwrk/midnight-js-utils`, which read `e.code` and so work across package
copies. `instanceof` is a convenience, not a guarantee.

Each code group owner keeps a total `code → category` table next to its code table; a class reads its
category from that table. A new sub-family below the base exists only when callers handle the whole family
the same way. The `TxFailedError` families predate this rule and sit three levels down.

A submission whose outcome is unknown is `UNCERTAIN`, never `TRANSIENT`: the transaction may already be on
chain, and a generic retry would submit it twice (a second deploy lands at a new address and strands the
first deploy's signing key).

Building a plain `Error`/`TypeError`/`RangeError`/`AggregateError` to throw or reject with, and declaring a
class that extends one of them directly, are forbidden in `packages/*/src` (tests, the `compact` CLI and
`network-id` exempt; `network-id` is deprecated and being removed). The lint gate matches the usual shapes
(`throw new`, `throw Error(...)`, a variable later thrown, `Promise.reject`, `reject(...)`, `Effect.fail`);
a plain error built only as a `cause` stays allowed. Failures of `fetch` at provider I/O seams, including
reading the response body, are wrapped with the original on `cause`. An error midnight-js did not raise —
from a dependency, the platform or user code — passes through unchanged and uncoded.

## Consequences

- **Positive:** one way to handle every error; the compiler refuses a subclass that declares no `code` or
  `category` (it does not check that the code is registered or that the category matches it — the
  per-package class tests do); the category tells the caller what to do.
- **Negative:** `ContractTypeError` is no longer a `TypeError`; `SubmitRejectionUndiagnosedError` is no
  longer an `AggregateError` (keeps `errors`, now an own enumerable field); 14 former
  `TypeError`/`RangeError` throws change class. When a level-provider operation fails and closing the
  database fails too, `cause` is the operation's failure and `closeError` the close failure. A lone failure
  carrying a coded error passes through `runOrRethrow` and `exitResultOrError` as that coded error; several
  concurrent failures are reported together as `ContractExecutionError`, which keeps every failure object on
  `errors`. The scoped-transaction wrappers no longer rebuild a failure: every failure leaves unchanged and
  the root scope logs it under `err`, naming the scope, so the log keeps its stack and `cause` chain. A
  coded provider error that carries a `cause` is sanitized at the retained-era seams like any external
  failure.
- **Follow-ups:** wrap ledger WASM exceptions outside the deserialization wrappers; the native `TypeError`
  from `inflate` on malformed input; compact-js errors from `exitResultOrError`; bech32 parsing.

## Alternatives considered

- **No common base, codes only.** Rejected: nothing forces a new class to carry a code; consumers get no
  single type to narrow to.
- **Category as an inheritance level (`UsageError`, `TransientError`, …).** Rejected: `instanceof` fails
  across package copies, and moving an error between categories would be a breaking re-parent.
- **A `retryable` flag only.** Rejected: it does not separate "fix your configuration" from "report a bug".

## Category assignments

Category meanings: `USAGE` fix own code/config, do not retry · `ENVIRONMENT` fix installation, versions or infrastructure · `TRANSIENT` may retry · `REJECTED` the operation was refused by contract or network rules · `UNCERTAIN` a submitted transaction may or may not be on chain; check before doing anything else · `INTEGRITY` corrupt or mismatched data, stop and alert · `INTERNAL` a midnight-js bug, report it.

`src/test/adr-category-coverage.test.ts` in `utils` checks these tables against the code tables in both directions.

**New codes** (`*` = new class):

| Group | Code (suffix) | Category | Class |
|---|---|---|---|
| G | `INVALID_ARGUMENT` | USAGE | `InvalidArgumentError`* |
| G | `CONFIGURATION_MISSING` | USAGE | `ConfigurationError`* |
| G | `ENVIRONMENT_UNSUPPORTED` | ENVIRONMENT | `EnvironmentUnsupportedError`* |
| G | `INVARIANT_VIOLATED` | INTERNAL | `InvariantViolationError`* |
| P | `CONTRACT_EXECUTION_FAILED` | REJECTED | `ContractExecutionError`* |
| P | `MAINTENANCE_AUTHORITY_MISMATCH` | USAGE | `MaintenanceAuthorityMismatchError`* |
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
| PR | `UNUSABLE_ERA_ENTRY` | USAGE | `UnusableEraEntryError`* |
| PR | `FOREIGN_LEDGER_TRANSACTION` | ENVIRONMENT | `ForeignLedgerTransactionError`* |
| PR | `INVALID_TRANSACTION_HANDLE` | USAGE | `InvalidTransactionHandleError`* |
| PR | `TRANSACTION_ERA_MISMATCH` | USAGE | `TransactionEraMismatchError`* |
| PR | `INVALID_LEDGER_STATE` | USAGE | `InvalidLedgerStateError`* |
| PR | `LEDGER_STATE_DECODER_MISSING` | USAGE | `LedgerStateDecoderMissingError`* |
| PR | `LEDGER_STATE_DECODE_FAILED` | INTEGRITY | `LedgerStateDecodeFailedError`* |
| PR | `STORED_SIGNING_KEY_INVALID` | INTEGRITY | `StoredSigningKeyFormatError` |
| C | `CONTRACT_TYPE_MISMATCH` | USAGE | `ContractTypeError` |
| C | `INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteCallTxPrivateStateConfig` |
| C | `INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteDeployContractPrivateStateConfig` |
| C | `INCOMPLETE_FIND_PRIVATE_STATE_CONFIG` | USAGE | `IncompleteFindContractPrivateStateConfig` |
| C | `SCOPED_TRANSACTION_IDENTITY_MISMATCH` | USAGE | `ScopedTransactionIdentityMismatchError` |
| C | `LEDGER8_AMBIGUOUS_ENTRY_POINT` | INTEGRITY | `Ledger8AmbiguousEntryPointError` |
| C | `LEDGER8_SIGNING_KEY` | USAGE | `Ledger8SigningKeyError`* |
| C | `LEDGER8_UNCONFIRMED` | UNCERTAIN | `Ledger8UnconfirmedError`* |
| C | `LEDGER8_NOT_STORED` | ENVIRONMENT | `Ledger8NotStoredError`* |
| C | `LEDGER8_CALL_UNSUPPORTED` | USAGE | `Ledger8CallUnsupportedError`* |
| C | `NETWORK_VERSION_READ_FAILED` | TRANSIENT | `NetworkVersionReadFailedError`* |
| C | `ZSWAP_OUTPUT_UNRESOLVED` | USAGE | `ZswapOutputResolutionError`* |
| C | `CONTRACT_NOT_FOUND` | USAGE | `ContractNotFoundError`* |
| C | `PRIVATE_STATE_NOT_FOUND` | USAGE | `PrivateStateNotFoundError`* |
| C | `PUBLIC_STATES_ERA_MISMATCH` | INTEGRITY | `PublicStatesEraMismatchError`* |
| U | `ZK_ARTIFACT_INTEGRITY_FAILED` | INTEGRITY | `ZkArtifactIntegrityError` |
| U | `ZK_ARTIFACT_CONTRACT_INFO_INVALID` | INTEGRITY | `ZkArtifactContractInfoError` |
| U | `PASSWORD_INVALID` | USAGE | `PasswordValidationError` |
| U | `DESERIALIZATION_FAILED` | INTEGRITY | `DeserializationError` |

**Existing codes, category only:**

| Group | Code (suffix) → Category |
|---|---|
| P | `UNKNOWN_PROTOCOL_VERSION_READ`, `UNKNOWN_PROTOCOL_VERSION_CONSTRUCT`, `LEDGER8_RUNTIME_MISSING`, `UNKNOWN_LEDGER_VERSION`, `LEDGER8_RUNTIME_INVALID` → ENVIRONMENT · `STATE_CONVERSION_FAILED`, `STATE_DECODE_FAILED`, `STATE_INCONSISTENT` → INTEGRITY · `COMPOSE_FAILED`, `COMPOSE_OPTION_INVALID`, `PAYLOAD_NOT_A_TRANSACTION` → USAGE |
| PR | `PROVIDER_ERA_UNSUPPORTED`, `PRIVATE_STATE_NOT_SERIALIZABLE` → USAGE · `DECODER_ERA_UNSUPPORTED`, `UNKNOWN_RECORD_ERA` → ENVIRONMENT |
| C | `TX_FAILED` → REJECTED · `NETWORK_VERSION_STATE_MISMATCH` → TRANSIENT · `FORK_CROSSED_DURING_OPERATION`, `SUBMIT_REJECTION_UNDIAGNOSED` → UNCERTAIN · `INDEXER_INCONSISTENCY`, `BLANK_VERIFIER_KEY_SLOT`, `VERIFIER_KEY_MISMATCH` → INTEGRITY · `PROVIDER_FAILED`, `LEDGER_PARAMETERS_UNSERVED` → ENVIRONMENT · `ERA_MISMATCH` → USAGE · `ERA_INVARIANT_VIOLATION` → INTERNAL |
| U | `TAG_PARSE_FAILED` → INTEGRITY · `UNHANDLED_UNION_MEMBER` → INTERNAL |

## Amendment — the on-chain state errors are renamed (2026-10-29)

Issue #1568. `InvalidLedgerStateError` is `InvalidSerializedStateError`,
`LedgerStateDecoderMissingError` is `SerializedStateDecoderMissingError`, and
`LedgerStateDecodeFailedError` is `SerializedStateDecodeFailedError`. Their codes
(`INVALID_LEDGER_STATE`, `LEDGER_STATE_DECODER_MISSING`, `LEDGER_STATE_DECODE_FAILED`) and
categories are unchanged: codes are the contract. The table above keeps the names that were
current when it was written.

## Amendment — one class per fault (2026-10-29)

Issue #1557. The decision is unchanged. It changes how classes are cut.

- (a) One class per fault, with a `reason` or `operation` field that says which case it was. Classes are
  merged only within one category, so a caller never has to read the field to learn what to do.
  Failed transactions are one `TxFailedError` with an `operation`. The five ledger 8 classes that are
  left carry a `reason`, an `operation` or a `stage`.
- (b) A wrong-era fault stays split by who is at fault. `EraMismatchError` is USAGE: the caller passed
  something of the wrong era. `EraInvariantViolationError` is INTERNAL: a provider or the framework broke
  the era rule. `PublicStatesEraMismatchError` and `IndexerInconsistencyError` are INTEGRITY: the data
  served does not agree with itself.
- (c) A value with no era moves to ENVIRONMENT. It means an outdated provider or an outdated midnight-js,
  so the fix is in the installation. `UnknownLedgerVersionError` now covers it, with a
  `requestedVersion` of `undefined`.
- (d) Codes renamed: `ERA_ARTIFACT_MISMATCH` is `ERA_MISMATCH`. Codes removed: `UNKNOWN_RESULT_ERA`,
  `SCOPED_TRANSACTION_ERA_UNSUPPORTED`, `MIXED_ERA_SCOPE`, `LEDGER8_DEPLOY_ON_LEDGER9`,
  `LEDGER8_MAINTENANCE_ON_LEDGER9`, `LEDGER8_ARTIFACT_ON_LEDGER9_STATE`,
  `LEDGER8_CONTRACT_STATE_UNSUPPORTED` (all now reasons of `ERA_MISMATCH`);
  `LEDGER8_SIGNING_KEY_UNUSABLE`, `LEDGER8_SIGNING_KEY_UNAVAILABLE`, `LEDGER8_DEPLOY_UNCONFIRMED`,
  `LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED`, `LEDGER8_DEPLOY_NOT_STORED`, `LEDGER8_SIGNING_KEY_NOT_STORED`,
  `LEDGER8_SHIELDED_SPEND_UNSUPPORTED`, `LEDGER8_RECIPIENT_UNMAPPABLE` (now `LEDGER8_SIGNING_KEY`,
  `LEDGER8_UNCONFIRMED`, `LEDGER8_NOT_STORED`, `LEDGER8_CALL_UNSUPPORTED`); and in `utils`
  `LEDGER8_VALUE_UNSUPPORTED` and `UNRECOGNISED_ERA_TAG`. The "TxFailedError families sit three levels
  down" sentence above is history: there is one class now. The code tables above already show the result.
