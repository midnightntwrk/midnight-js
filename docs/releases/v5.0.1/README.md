# midnight-js v5.0.1 Release Documentation

**Release Date:** November 17, 2026
**Previous Version:** v5.0.0
**Node.js Requirement:** >=22.12
**Migration Complexity:** Low. Update the dependency. Check your code only if you catch errors
around private-state **import**, or if your password provider can change while a password rotation
runs.

## Quick Links

- [Release Notes](./release-notes.md): a one-page summary.
- [Breaking Changes](./breaking-changes.md): no API breaks; three behaviour changes in the private state provider.
- [New Features](./new-features.md): one new error class.
- [API Changes](./api-changes.md): additions to `types`.
- [Migration Guide](./migration-guide.md): the upgrade step by step.

## Breaking Changes

None in the API. Three behaviour changes in `level-private-state-provider` (and the testkit
`InMemoryPrivateStateProvider`):

- **A wrong password is refused on every operation**, including writes, removes and clears. It fails
  with `PrivateStateDecryptionError` (reason `wrong-key`) and changes nothing. Before, a write with
  the wrong password succeeded and left records encrypted under two passwords (#1648).
- **Signing-key methods validate the contract address.** A value that is not a contract address
  fails with `InvalidArgumentError`; an import that holds one fails with `InvalidExportFormatError`
  and imports nothing (#1648).
- **A weak password on import throws `ImportPasswordValidationError`**, not
  `PrivateStateExportError` / `SigningKeyExportError` (#1656).

## Key Security Fixes

- Private state and signing-key stores now hold a key check. A stale or early password during
  password rotation can no longer write records that the store can never decrypt (#1648).
- `setSigningKey('__midnight_encryption_metadata__', …)` and similar calls can no longer overwrite
  the store metadata and lose every stored signing key (#1648).

## Dependencies

- Ledger 9 stack moves from release candidates to final releases: `ledger-v9` 1.0.2,
  `onchain-runtime-v4` 4.0.2, `compact-js` 3.0.2 (#1655, #1660, #1671).
- `wallet-sdk-address-format` 4.0.1, `graphql-ws` 6.4.1, `pino` 10.4.0 (#1644, #1671).

## Quick Migration

```bash
yarn up @midnight-ntwrk/midnight-js@5.0.1
```

See [migration-guide.md](./migration-guide.md) if you catch import errors or rotate passwords.

## Test Evidence

- **CI on the release commit `1b492fca7` (`chore(release): bump version to 5.0.1`):**
  [run 44084498050](https://github.com/midnightntwrk/midnight-js/actions/runs/44084498050). All 55
  jobs passed: build, lint, unit and integration tests, testkit e2e (both eras), Hard fork lanes and
  consumer e2e.
- **CI on the tagged commit `e55e489f1`:**
  [run 44086109779](https://github.com/midnightntwrk/midnight-js/actions/runs/44086109779) was
  cancelled before the e2e jobs finished. Build, lint, unit tests and 8 of 9 Hard fork lanes passed.
  This commit (#1654) changes only the build tooling (`.nvmrc`, `.npmrc`, `.envrc`, CI workflows),
  not package source, so the run above covers the published code.

## Testing Checklist

- [ ] TypeScript compilation passes
- [ ] Unit and integration tests pass
- [ ] If you catch errors around `importPrivateStates` / `importSigningKeys`: handle
      `ImportPasswordValidationError` (or its base `PrivateStateImportError`)
- [ ] If you rotate passwords: the password provider returns the new password only after
      `changePassword` and `changeSigningKeysPassword` finish
- [ ] If you pass signing-key addresses from user input: handle `InvalidArgumentError`

---

**Last Updated:** November 17, 2026
**License:** Apache-2.0
