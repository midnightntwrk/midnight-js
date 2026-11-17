# API Changes v5.0.1

## Added

### `@midnight-ntwrk/midnight-js-types`

| Export | Kind | Notes |
|--------|------|-------|
| `ImportPasswordValidationError` | class | extends `PrivateStateImportError`; field `passwordError` |
| `PROVIDER_ERROR_CODES.IMPORT_PASSWORD_INVALID` | constant | `'MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID'`, category `USAGE` |

`PrivateStateImportErrorCause` gains `'invalid_password'`.

## Changed behaviour (no signature change)

### `PrivateStateProvider` (`level-private-state-provider`, testkit `InMemoryPrivateStateProvider`)

| Method | New `@throws` |
|--------|---------------|
| `getSigningKey`, `setSigningKey`, `removeSigningKey` | `InvalidArgumentError` if `address` is not a contract address |
| `importSigningKeys` | `InvalidExportFormatError` if the export holds an address that is not a contract address (nothing imported); `ImportPasswordValidationError` for a weak `options.password` (was `SigningKeyExportError`) |
| `clearAll`, `clearSigningKeys`, `removeSigningKey`, `setSigningKey`, `getSigningKey` | `PrivateStateDecryptionError` (`wrong-key`) if the password does not match the store |
| `changePassword`, `changeSigningKeysPassword` | `InvalidArgumentError` if the old password does not match, also on an empty store |

### `ContractPrivateStates` (from `forContract`)

| Method | New `@throws` |
|--------|---------------|
| `get`, `set`, `remove`, `clear` | `PrivateStateDecryptionError` (`wrong-key`) if the password does not match the store; `get` throws even when no value is stored |
| `importPrivateStates` | `ImportPasswordValidationError` for a weak `options.password` (was `PrivateStateExportError`) |

## Storage format

The store metadata entry `__midnight_encryption_metadata__` gains a `keyCheck` field next to `salt`
and `version`. It is written on the first operation against a store created by 4.x or 5.0.0. Older
versions ignore the field and still open the store.

## Removed

Nothing.
