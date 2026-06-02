# API Changes Reference v4.1.1

Summary: **no removals, no signature changes — except one field rename**. `IndexerFormattedError.cause` is renamed to `.errors` (see [Renamed Exports](#renamed-exports) at the bottom). All other changes are either additive (new exports) or internal-only (file moves with the same barrel surface).

## Package: `@midnight-ntwrk/midnight-js-utils`

### New Exports (additive)

#### `validatePassword`

```typescript
export function validatePassword(password: string | undefined): void;
```

Throws `PasswordValidationError` if `password` fails the storage password policy. Moved up from `level-private-state-provider` so every `PrivateStateProvider` implementation shares one policy.

**Policy:**
- Defined: not `undefined`, not empty (`reason: 'missing'`)
- Length: ≥16 (`reason: 'too_short'`)
- Character classes: ≥3 of lower / upper / digit / symbol (`reason: 'insufficient_classes'`)
- No character repeated more than 3 times in a row (`reason: 'repeated_characters'`)
- No monotonic ASCII sequence of length ≥4 (`reason: 'sequential_pattern'`)

#### `PasswordValidationError`

```typescript
export class PasswordValidationError extends Error {
  constructor(
    message: string,
    public readonly reason: PasswordValidationFailure
  );
}

export type PasswordValidationFailure =
  | 'missing'
  | 'too_short'
  | 'insufficient_classes'
  | 'repeated_characters'
  | 'sequential_pattern';
```

Typed `reason` discriminator for programmatic UI handling. The actual password length is **not** included in `too_short` error messages to avoid log-sink leakage.

#### `MIN_PASSWORD_LENGTH`, `MIN_CHARACTER_CLASSES`, `MAX_CONSECUTIVE_REPEATED`, `MIN_SEQUENTIAL_LENGTH`

```typescript
export const MIN_PASSWORD_LENGTH = 16;
export const MIN_CHARACTER_CLASSES = 3;
export const MAX_CONSECUTIVE_REPEATED = 3;
export const MIN_SEQUENTIAL_LENGTH = 4;
```

Policy constants exposed for UI hint text and test fixtures.

#### `warnIfInsecureRemoteUrl`

```typescript
export function warnIfInsecureRemoteUrl(url: string, label: string): void;
```

Emits one `console.warn` when `url` uses `http:` / `ws:` and the host is not loopback. Never throws. The `label` argument is prefixed to the warning to identify the calling provider.

## Package: `@midnight-ntwrk/midnight-js-level-private-state-provider`

### Modified Internals (public API preserved)

#### `validatePassword`

**v4.1.0:** Defined inside `level-private-state-provider`; not exported.

**v4.1.1:** Re-exported from `@midnight-ntwrk/midnight-js-utils`. Internal call sites updated to import from utils. No behaviour change for storage-password validation.

#### Export wrappers re-throw `PasswordValidationError` as the package's own export error

`exportPrivateState` / `exportSigningKey` catch `PasswordValidationError` and re-throw `PrivateStateExportError` / `SigningKeyExportError` with `cause: PasswordValidationError`. Callers can drill into `cause.reason` to switch on the specific policy violation.

## Package: `@midnight-ntwrk/midnight-js-types`

### Modified Internals (public API preserved)

#### `PrivateStateExportError` / `SigningKeyExportError`

The class signatures and constructor parameters are unchanged. They now carry a `cause: PasswordValidationError` when the export was rejected by the password policy, in addition to existing failure causes.

#### `InvalidExportFormatError` — additional throw site (no signature change)

`importSigningKeys` now throws `InvalidExportFormatError` (with message `"Invalid signing key value"`) when any entry in the decrypted payload fails the structural validator (`typeof === 'string'`, even-length hex, length ≥ 6). The class signature is unchanged; this is an additional fail-fast throw site on top of the existing format checks (unrecognized format, missing fields, version mismatch, salt format).

## Package: `@midnight-ntwrk/midnight-js-indexer-public-data-provider`

### New Exports (additive)

A coherent `IndexerError` hierarchy replaces the prior mix of generic `new Error(...)` throws and non-null-assertion crashes (#937). The base class is abstract, so every subclass can be caught with one `instanceof IndexerError` check.

#### `IndexerError` (abstract base class)

```typescript
export abstract class IndexerError extends Error {}
```

Catches every error this provider raises — analogous to `PrivateStateImportError` in `@midnight-ntwrk/midnight-js-types`.

#### `IndexerQueryError`

```typescript
export class IndexerQueryError extends IndexerError {
  constructor(message: string, options?: ErrorOptions);
}
```

Raised when an Apollo query or fetch fails at the transport layer (network failure, malformed response, Apollo client error). The original Apollo error is preserved via the standard `Error.cause` slot — distinct from `IndexerFormattedError`, which represents a well-formed response carrying `GraphQLFormattedError` entries.

#### `IndexerDataError` + `IndexerDataErrorContext`

```typescript
export type IndexerDataErrorContext =
  | { kind: 'unknown-status'; value: string }
  | { kind: 'missing-contract-action'; contractAddress: string }
  | {
      kind: 'missing-identifier';
      contractAddress: string;
      actionIndex: number;
      identifiersLength: number;
    };

export class IndexerDataError extends IndexerError {
  constructor(public readonly context: IndexerDataErrorContext);

  static unknownStatus(value: string): IndexerDataError;
  static missingContractAction(contractAddress: string): IndexerDataError;
  static missingIdentifier(
    contractAddress: string,
    actionIndex: number,
    identifiersLength: number
  ): IndexerDataError;
}
```

Raised when indexer-returned data is structurally inconsistent with the provider's expectations: unknown enum values, broken referential integrity between related rows, or missing relations the schema implies should be present. The discriminated `context` field lets consumers branch on the failure mode without parsing the error message; static factories keep message and context in sync at construction.

#### `IndexerSubscriptionDataError` + `IndexerSubscriptionField`

```typescript
export type IndexerSubscriptionField = 'blocks' | 'contractActions';

export class IndexerSubscriptionDataError extends IndexerError {
  constructor(public readonly missingField: IndexerSubscriptionField);
}
```

Raised when an indexer subscription payload is missing a top-level field the provider relies on. The field name is a literal union for compile-time typo safety at throw sites.

#### `IndexerProviderConfigError`

```typescript
export class IndexerProviderConfigError extends IndexerError {
  constructor(message: string);
}
```

Raised when the consumer passes a configuration the indexer provider cannot serve (e.g. an observable mode unsupported by the indexer's query surface). Signals API misuse, not server-side issues — a separate semantic category from `IndexerDataError`.

### Modified Exports

#### `IndexerFormattedError`

**v4.1.0:**

```typescript
export class IndexerFormattedError extends Error {
  constructor(public readonly cause: readonly GraphQLFormattedError[]);
}
```

**v4.1.1:**

```typescript
export class IndexerFormattedError extends IndexerError {
  constructor(public readonly errors: readonly GraphQLFormattedError[]);
}
```

Two changes:

1. **Base class** moved from `Error` → new abstract `IndexerError` (additive — narrower for `instanceof IndexerError`, still `instanceof Error`).
2. **Field rename** `cause` → `errors`. This is the one breaking change in v4.1.1 (see [breaking-changes.md](./breaking-changes.md) and [Renamed Exports](#renamed-exports) below). The output message format also changes: indices now precede each error in a flat numbered list (`1. msg\n\t2. msg`) instead of the v4.1.0 reverse-order growing-indent format (was a regression — #823).

### Modified Internals (public API preserved)

#### `indexerPublicDataProvider` factory

A `warnIfInsecureRemoteUrl` call is now made at factory invocation for the configured `indexerUri` and (where present) the websocket subscription URL. No factory signature change.

#### `contractStateObservable`

Public signature unchanged. The internal `Rx.filter(isRegularTransaction)` over `waitForBlockToAppear` emissions has been removed (bug fix #911); the resulting observable now emits for `blockHeight` / `blockHash` configs as documented.

#### `queryDeployContractState`, `watchForDeployTxData`, `waitForContractToAppear`, `waitForUnshieldedBalancesToAppear`, `unshieldedBalancesObservable`, `toTxStatus`

Public signatures unchanged. Previously these used non-null assertions (`!`) or generic `new Error(...)` throws on indexer payloads. They now raise typed `IndexerDataError`, `IndexerSubscriptionDataError`, or `IndexerProviderConfigError` instances under the new `IndexerError` umbrella (#937). Where non-null assertions previously masked silent failures (e.g. `identifiers[findIndex(...)]` becoming an `undefined` or empty-string `txId` in `FinalizedTxData`), the typed error now interrupts that path.

## Package: `@midnight-ntwrk/midnight-js-http-client-proof-provider`

### Modified Internals (public API preserved)

#### `httpClientProofProvider` factory

A `warnIfInsecureRemoteUrl` call is now made at factory invocation for the configured proof-server URL. No factory signature change.

## Package: `@midnight-ntwrk/midnight-js-contracts`

### Internal Reorganisation (no public API change)

The following exports moved from top-level source files to `src/governance/` and are re-exported via the package barrel. **All import paths remain stable** at the package barrel:

| Export | v4.1.0 source | v4.1.1 source |
|---|---|---|
| `submitInsertVerifierKeyTx` | `src/submit-insert-vk-tx.ts` | `src/governance/submit-insert-vk-tx.ts` |
| `submitRemoveVerifierKeyTx` | `src/submit-remove-vk-tx.ts` | `src/governance/submit-remove-vk-tx.ts` |
| `submitReplaceAuthorityTx` | `src/submit-replace-authority-tx.ts` | `src/governance/submit-replace-authority-tx.ts` |
| `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`, `ReplaceMaintenanceAuthorityTxFailedError` | `src/errors.ts` | `src/governance/errors.ts` |
| `CircuitMaintenanceTxInterface`, `CircuitMaintenanceTxInterfaces`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` | `src/tx-interfaces.ts` (mixed with call-tx types) | `src/governance/tx-interfaces.ts` (governance-only); call-tx types remain in `src/tx-interfaces.ts` |

Helpers under `src/governance/unproven-tx.ts` are **package-private** — they are intentionally not re-exported by the governance or top-level barrel. They were also not exported in v4.1.0.

## Package: `@midnight-ntwrk/midnight-js-level-private-state-provider` (testkit twin)

The in-memory equivalent — `InMemoryPrivateStateProvider` in `testkit-js` — now mirrors the same signing-key entry validator as `level-private-state-provider`. The testkit provider's exported surface is unchanged.

## Cross-cutting

### `@midnight-ntwrk/midnight-js-protocol` — dependency version bump

Bumps the wrapped `@midnight-ntwrk/ledger-v8` peer from `8.0.3` to `8.1.0`. Consumers importing types via `@midnight-ntwrk/midnight-js-protocol/ledger` see the new minor version's additions automatically; no protocol-package API surface change.

### Removed Exports

None.

### Renamed Exports

#### `IndexerFormattedError.cause` → `IndexerFormattedError.errors` (#937)

The `readonly GraphQLFormattedError[]` field carried by `IndexerFormattedError` is renamed from `cause` to `errors`. The slot type is unchanged.

The standard ES2022 `Error.cause` slot is contractually a single underlying error, not a peer collection. Shadowing it broke Node's `util.inspect` causal chain, Sentry error grouping, and structured loggers. The dedicated `.errors` field clears the `cause` slot so the standard machinery works correctly, and `IndexerFormattedError` instances no longer need to special-case loggers.

Consumer migration: rename `err.cause` → `err.errors` at catch sites that read this field. See [migration-guide.md § Step 3](./migration-guide.md#step-3-conditional--rename-indexerformattederrorcause--errors).

### Deprecated Exports

None.
