# API Changes Reference v4.1.1

Summary: **no removals, no signature changes**. All changes below are either additive (new exports) or internal-only (file moves with the same barrel surface).

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

### Modified Internals (public API preserved)

#### `indexerPublicDataProvider` factory

A `warnIfInsecureRemoteUrl` call is now made at factory invocation for the configured `indexerUri` and (where present) the websocket subscription URL. No factory signature change.

#### `contractStateObservable`

Public signature unchanged. The internal `Rx.filter(isRegularTransaction)` over `waitForBlockToAppear` emissions has been removed (bug fix #911); the resulting observable now emits for `blockHeight` / `blockHash` configs as documented.

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

None.

### Deprecated Exports

None.
