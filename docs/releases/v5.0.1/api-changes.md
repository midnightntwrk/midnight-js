# API Changes v5.0.1

## Added

### `@midnight-ntwrk/midnight-js-types`

| Export | Kind | Notes |
|--------|------|-------|
| `ImportPasswordValidationError` | class | extends `PrivateStateImportError`; field `passwordError` |
| `PROVIDER_ERROR_CODES.IMPORT_PASSWORD_INVALID` | constant | `'MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID'`, category `USAGE` |

`PrivateStateImportErrorCause` gains `'invalid_password'`.

## Changed behaviour (no signature change)

### `PrivateStateProvider` methods

Applies to `level-private-state-provider` and the testkit `InMemoryPrivateStateProvider`:

| Method | New `@throws` |
|--------|---------------|
| `getSigningKey`, `setSigningKey`, `removeSigningKey` | `InvalidArgumentError` if `address` is not a contract address |
| `importSigningKeys` | `InvalidExportFormatError` if the export holds an address that is not a contract address (nothing imported); `ImportPasswordValidationError` for a weak `options.password` (was `SigningKeyExportError`) |

Applies to `level-private-state-provider` only:

| Method | New `@throws` |
|--------|---------------|
| `getSigningKey`, `setSigningKey`, `removeSigningKey`, `clearAll`, `clearSigningKeys`, `exportSigningKeys`, `importSigningKeys` | `PrivateStateDecryptionError` (`wrong-key`) if the password does not match the store |

### `ContractPrivateStates` methods (from `forContract`)

| Method | New `@throws` | Providers |
|--------|---------------|-----------|
| `importPrivateStates` | `ImportPasswordValidationError` for a weak `options.password` (was `PrivateStateExportError`) | level, in-memory |
| `get`, `set`, `remove`, `clear`, `exportPrivateStates`, `importPrivateStates` | `PrivateStateDecryptionError` (`wrong-key`) if the password does not match the store; `get` throws even when no value is stored | level only |

### `levelPrivateStateProvider` rotation methods

`changePassword` and `changeSigningKeysPassword` are on the object `levelPrivateStateProvider`
returns, not on the `PrivateStateProvider` interface. They already refused a wrong old password with
`InvalidArgumentError` when the store held a record. They now also refuse it on an empty store that
has a key check. An empty store that 5.0.1 has not opened yet has no key check, so it still accepts
any old password.

## Storage format

The store metadata entry `__midnight_encryption_metadata__` gains a `keyCheck` field next to `salt`
and `version`. It is written on the first operation against a store created by 4.x or 5.0.0:

- if the store holds an encrypted record, only after the password has opened that record;
- if it holds no encrypted record, with the password of that first operation, unchecked.

Older versions ignore the field and still open the store.

## Removed

Nothing.
