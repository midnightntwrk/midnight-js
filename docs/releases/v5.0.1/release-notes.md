# Release Notes v5.0.1

**Release Date:** November 17, 2026
**Previous Version:** v5.0.0
**Node.js Requirement:** >=22.12

v5.0.1 is a patch release. It fixes two security gaps in the private state provider, gives import
its own password error, and moves the ledger 9 stack from release candidates to final releases.
No public API is removed or renamed.

## Security

### Refuse writes with the wrong password (#1648)

The store metadata held only the salt, so the provider could not check a password before it wrote.
If `privateStoragePasswordProvider` returned the old or the new password at the wrong moment around
`changePassword` / `changeSigningKeysPassword`, a `set` or `setSigningKey` encrypted with that
password and succeeded. The store then held records under two passwords, and the next rotation
failed.

Now each store (private states, signing keys) keeps a **key check**: a fixed text encrypted with the
store key, kept in the store metadata. Every read, write, remove, clear and `importSigningKeys`
verifies it first.

- A password that does not match fails with `PrivateStateDecryptionError` (reason `wrong-key`) and
  changes nothing. This also applies when no value is stored for the key.
- `changePassword` / `changeSigningKeysPassword` verify the old password against the key check and
  write the new key check in the same batch as the re-encrypted records. A rotation with a wrong
  old password fails with `InvalidArgumentError`, also on an empty store.
- **Stores written by 4.x or 5.0.0** get the key check on their first operation. If the store holds
  an encrypted record, the key check is written only after the password has opened that record.
  The metadata keeps `salt` and `version`, so older versions still open the store.
- A store that already holds records under two passwords is not repaired.
- `clearAll` and `clearSigningKeys` now need the right password. A store whose password is lost can
  only be reset by deleting the database.

Closes #1643.

### Validate the contract address in signing-key methods (#1648)

`getSigningKey`, `setSigningKey`, `removeSigningKey` and `importSigningKeys` accepted any string. The
value `__midnight_encryption_metadata__` hit the store metadata entry, which made the signing-key
store unusable and lost every stored key.

- `getSigningKey`, `setSigningKey` and `removeSigningKey` throw `InvalidArgumentError` for a value
  that is not a contract address.
- `importSigningKeys` throws `InvalidExportFormatError` when the export holds such a value, and
  imports nothing.

Applies to `level-private-state-provider` and the testkit `InMemoryPrivateStateProvider`.

## Bug Fixes

### Import-specific error for an invalid import password (#1656)

`importPrivateStates` and `importSigningKeys` validated the password with the export validators, so a
weak password on **import** threw `PrivateStateExportError` / `SigningKeyExportError`.

They now throw the new `ImportPasswordValidationError`:

- extends `PrivateStateImportError`;
- code `MIDNIGHT_JS_PR_IMPORT_PASSWORD_INVALID`, category `USAGE`, cause `'invalid_password'`;
- `passwordError` holds the original `PasswordValidationError`, so its `reason` (`too_short`,
  `sequential_pattern`, …) is still available.

Export behaviour does not change. Closes #825.

## Dependencies

### Runtime

| Package | v5.0.0 | v5.0.1 | Used by |
|---------|--------|--------|---------|
| `@midnightntwrk/ledger-v9` | `1.0.0` | `1.0.2` | `protocol` |
| `@midnightntwrk/onchain-runtime-v4` | `4.0.0` | `4.0.2` | `protocol` |
| `@midnight-ntwrk/compact-js` | `3.0.0` | `3.0.2` | `protocol` |
| `@midnightntwrk/wallet-sdk-address-format` | `4.0.0` | `4.0.1` | `utils` |
| `graphql-ws` | `^6.0.8` | `^6.4.1` | `indexer-public-data-provider` |
| `pino` | `^10.3.1` | `^10.4.0` | `logger-provider`, `types` |

`@midnight-ntwrk/compact-runtime` stays at `0.21.0`. The Compact toolchain is `compactc` 0.36.1
(fixes key generation for `JubjubScalar` / `JubjubPoint` circuits and a compiler error on
deserialized `Boolean` values). Contracts compiled with 0.36.0 do not need recompiling (#1655, #1660,
#1671).

### Testkit

- `@midnightntwrk/wallet-sdk` and `wallet-sdk-prover-client` `2.0.0` → `2.0.1`; `zkir-v3` `3.2.1`.
- Test images: node `2.1.101`, indexer `4.4.101`, proof server `9.0.2`, toolkit `2.1.101`. These are
  public images; the private shadow images are no longer used.
- `VerifierKeyRemove` works again on node 2.1.101 (midnight-node#2375). The snark-upgrade and
  signing-key e2e tests assert success again.

### Security and tooling

- Resolutions raised: `tar` ≥7.5.22, `fast-uri` ≥4.2.3, `ip-address` ≥10.7.6, `qs` ≥6.17.1, `pnpm`
  10.34.5 (#1644).
- Node.js for development and CI: `24.11.1` → `24.22.3` (the 2026-11-10 security release). npm is
  pinned to `12.2.2` in CI, with a 7-day release-age cooldown. The package `engines` floor stays
  `>=22.12` (#1654).
- GitHub Actions bumps (#1645).

## Tests

- Cross-contract call assembly: new unit tests (call trees A→B→C, one callee reached from two
  parents, receive/claim matching) and an e2e test with real `vault` / `vault-caller` contracts.
  Production code does not change (#1642, closes #1403).

## Documentation

- ADRs rewritten to state only the current decision. ADR 0013 is superseded by 0018, and ADR 0019 by
  0024. ADR 0017 lists every error code in one table (#1640).
- `level-private-state-provider` README: key check, and when to switch the password provider during
  rotation (#1648).
- API documentation regenerated (#1647, #1653).

## CI

- The turbo build cache is reused between runs; test tasks are never cached. e2e shards no longer
  rebuild every package (#1608).
- The proof server no longer runs in verbose mode in e2e stacks. The cross-contract-call job drops
  from about 24 min to about 5 min (#1662).

## Links

- [Breaking Changes](./breaking-changes.md)
- [New Features](./new-features.md)
- [API Changes](./api-changes.md)
- [Migration Guide](./migration-guide.md)
- [v5.0.0 Release Notes](../v5.0.0/release-notes.md)
