# Breaking Changes v5.0.1

v5.0.1 removes and renames nothing. Three behaviour changes in the private state provider can change
what your code sees at runtime.

| Change | `level-private-state-provider` | testkit `InMemoryPrivateStateProvider` |
|--------|:------------------------------:|:--------------------------------------:|
| 1. Wrong password refused on every operation | yes | no (it has no storage password) |
| 2. Signing-key address validation | yes | yes |
| 3. `ImportPasswordValidationError` on import | yes | yes |

## 1. A wrong password is refused on every operation (#1648)

**Before:** only reads checked the password, by failing to decrypt a stored record. A `set`,
`setSigningKey`, `remove`, `clear` or `importSigningKeys` with the wrong password succeeded. A write
stored a record that the right password could not decrypt.

**After:** every read, write, remove, clear, import and export checks the password against the
store's key check first. A wrong password throws `PrivateStateDecryptionError` with
`reason === 'wrong-key'`, and nothing changes. A `get` with the wrong password now throws even when
no value is stored for the key; before, it returned `null`.

Who is affected: code whose password provider can return a different password than the one the store
was written with. The common case is a password rotation. `changePassword` and
`changeSigningKeysPassword` take password providers (functions), not strings:

```typescript
let currentPassword = oldPassword;
const provider = levelPrivateStateProvider({
  accountId,
  privateStoragePasswordProvider: () => currentPassword
});

await provider.changePassword(() => oldPassword, () => newPassword);
await provider.changeSigningKeysPassword(() => oldPassword, () => newPassword);
currentPassword = newPassword;
```

Between the first rotation and the last line, the provider still returns `oldPassword` for a store
that is already rotated:

- **Before:** a write in that window succeeded and stored a record under the old password, which the
  new password could never decrypt.
- **After:** the write fails with `wrong-key` and changes nothing. Run it again once the password
  provider returns the new password.

`clearAll` and `clearSigningKeys` also need the right password now. A store whose password is lost
can only be reset by deleting the database.

## 2. Signing-key methods validate the contract address (#1648)

**Before:** any string was accepted. `setSigningKey('__midnight_encryption_metadata__', key)`
overwrote the store metadata and made every stored signing key unreadable.

**After:**

| Method | Value that is not a contract address |
|--------|--------------------------------------|
| `getSigningKey`, `setSigningKey`, `removeSigningKey` | throws `InvalidArgumentError` |
| `importSigningKeys` | throws `InvalidExportFormatError`; nothing is imported |

```typescript
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js';

try {
  await provider.setSigningKey(address, signingKey);
} catch (error) {
  if (error instanceof InvalidArgumentError) {
    showInvalidAddressMessage(address);
  }
  throw error;
}
```

## 3. A weak password on import throws `ImportPasswordValidationError` (#1656)

**Before:** `importPrivateStates` / `importSigningKeys` threw `PrivateStateExportError` /
`SigningKeyExportError` when the import password failed the password policy.

**After:** they throw `ImportPasswordValidationError`, a subclass of `PrivateStateImportError`, with
code `MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID`.

```diff
- import { PrivateStateExportError } from '@midnight-ntwrk/midnight-js-types';
+ import { ImportPasswordValidationError } from '@midnight-ntwrk/midnight-js-types';

  try {
    await provider.forContract(contractAddress).importPrivateStates(exportData, { password });
  } catch (error) {
-   if (error instanceof PrivateStateExportError) {
+   if (error instanceof ImportPasswordValidationError) {
      showWeakPasswordMessage();
    }
    throw error;
  }
```

Export calls are unchanged: they still throw `PrivateStateExportError` / `SigningKeyExportError`.
