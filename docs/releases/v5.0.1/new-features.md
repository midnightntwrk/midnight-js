# New Features v5.0.1

v5.0.1 is a patch release. It adds one public class.

## `ImportPasswordValidationError` (#1656)

Thrown by `importPrivateStates` and `importSigningKeys` when the import password fails the password
policy. It extends `PrivateStateImportError`, so a `catch` for that base class also catches it.

| Field | Value |
|-------|-------|
| `name` | `'ImportPasswordValidationError'` |
| `code` | `MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID` |
| category | `USAGE` |
| `cause` | `'invalid_password'` |
| `passwordError` | the original `PasswordValidationError` |

Read the policy failure from `passwordError.reason`:

```typescript
import { ImportPasswordValidationError } from '@midnight-ntwrk/midnight-js-types';
import { PasswordValidationError } from '@midnight-ntwrk/midnight-js-utils';

try {
  await provider.importSigningKeys(exportData, { password });
} catch (error) {
  if (
    error instanceof ImportPasswordValidationError &&
    error.passwordError instanceof PasswordValidationError
  ) {
    console.error(`Import password rejected: ${error.passwordError.reason}`);
  }
  throw error;
}
```

`reason` is one of `'missing'`, `'too_short'`, `'insufficient_classes'`, `'repeated_characters'`,
`'sequential_pattern'`.
