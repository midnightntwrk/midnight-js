# Migration Guide v5.0.0 → v5.0.1

Most dApps only update the dependency. Steps 2 to 4 apply only if your code does what they describe.

## Step 1 — Update dependencies

```bash
yarn up @midnight-ntwrk/midnight-js@5.0.1
```

If you install the packages one by one, move every `@midnight-ntwrk/midnight-js-*` package to
`5.0.1` together.

Existing private state databases need no migration. The first operation on each store adds a key
check to its metadata. If the store holds an encrypted record, this happens only after the password
has opened that record. If the store is empty, the password of that first operation is used without
a check, so make sure it is the right one. Versions 4.x and 5.0.0 can still open the store afterwards.

## Step 2 — Catch the new import password error

Applies if you catch errors around `importPrivateStates` or `importSigningKeys`.

Replace `PrivateStateExportError` / `SigningKeyExportError` (or their codes) in those `catch` blocks
with `ImportPasswordValidationError`, or with its base `PrivateStateImportError` to catch every
import failure. See [breaking-changes.md](./breaking-changes.md#3-a-weak-password-on-import-throws-importpasswordvalidationerror-1656).

## Step 3 — Switch the password provider after rotation

Applies if you call `changePassword` or `changeSigningKeysPassword` on a `levelPrivateStateProvider`.

Both methods take password providers (functions), not strings. Both stores read the same
`privateStoragePasswordProvider`, and each has its own rotation. Use this order:

1. Run `changePassword(() => oldPassword, () => newPassword)`.
2. Run `changeSigningKeysPassword(() => oldPassword, () => newPassword)`.
3. Make `privateStoragePasswordProvider` return `newPassword`.

Between steps 1 and 3, an operation on a store that is already rotated fails with
`PrivateStateDecryptionError` (reason `wrong-key`) and changes nothing. Run it again after step 3.
If your app retries failed operations, treat `wrong-key` during a rotation as retryable.

## Step 4 — Validate signing-key addresses

Applies if a signing-key address can come from user input or another untrusted source.

`getSigningKey`, `setSigningKey` and `removeSigningKey` now throw `InvalidArgumentError` (exported
from `@midnight-ntwrk/midnight-js`) for a value that is not a contract address. `importSigningKeys`
throws `InvalidExportFormatError` and imports nothing if the export holds such a value. Handle these
errors where you call the methods.

## Checklist

- [ ] Dependencies on `5.0.1`
- [ ] `tsc` passes
- [ ] Import error handling updated (Step 2)
- [ ] Password rotation order checked (Step 3)
- [ ] Unit and integration tests pass
