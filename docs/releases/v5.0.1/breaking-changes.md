# Breaking Changes v5.0.1

v5.0.1 removes and renames nothing. Three behaviour changes in `level-private-state-provider` and the
testkit `InMemoryPrivateStateProvider` can change what your code sees at runtime.

## 1. A wrong password is refused on every operation (#1648)

**Before:** only reads checked the password, by failing to decrypt a stored record. A `set`,
`setSigningKey`, `remove`, `clear` or `importSigningKeys` with the wrong password succeeded. A write
stored a record that the right password could not decrypt.

**After:** every read, write, remove, clear and `importSigningKeys` checks the password against the
store's key check first. A wrong password throws `PrivateStateDecryptionError` with
`reason === 'wrong-key'`, and nothing changes. A `get` with the wrong password now throws even when
no value is stored for the key; before, it returned `null`.

Who is affected: code whose password provider can return a different password than the one the store
was written with. The common case is a password rotation:

```typescript
// Before: a write between these two lines used the old password and corrupted the store
await provider.changePassword(oldPassword, newPassword);
currentPassword = newPassword;

// After: the same write fails with wrong-key and changes nothing. Run it again
// once the password provider returns the new password.
```

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
import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-types';

try {
  await provider.setSigningKey(address, signingKey);
} catch (error) {
  if (error instanceof InvalidArgumentError) {
    // address is not a contract address
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
  }
```

Export calls are unchanged: they still throw `PrivateStateExportError` / `SigningKeyExportError`.
