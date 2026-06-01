# Migration Guide v4.1.0 → v4.1.1

**Migration complexity:** None (drop-in)

v4.1.1 is a patch release. There are **no breaking changes** and no required code modifications. Most consumers will need only a dependency bump.

## Step 1 — Bump the dependency

```bash
yarn upgrade @midnight-ntwrk/midnight-js@4.1.1
yarn install
```

If you depend on individual sub-packages directly:

```bash
yarn upgrade \
  @midnight-ntwrk/midnight-js-contracts@4.1.1 \
  @midnight-ntwrk/midnight-js-level-private-state-provider@4.1.1 \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider@4.1.1 \
  @midnight-ntwrk/midnight-js-http-client-proof-provider@4.1.1 \
  @midnight-ntwrk/midnight-js-utils@4.1.1 \
  @midnight-ntwrk/midnight-js-protocol@4.1.1
```

## Step 2 — Verify the build

```bash
yarn build
yarn lint
yarn test
```

If your test suite passed against v4.1.0, it will pass against v4.1.1. There are no type-signature changes in the public API.

## Step 3 (conditional) — Review the four behaviour changes

Skim [breaking-changes.md](./breaking-changes.md). The release contains four fixes that surface as behaviour changes; each is gated behind a specific code path. Action is required **only if** your application uses one of the affected paths:

| If your code... | Then... |
|---|---|
| Subscribes to `contractStateObservable({ type: 'blockHeight' \| 'blockHash' })` | You now receive emissions instead of an empty observable. Verify your subscriber handles them. |
| Calls `exportPrivateState` / `exportSigningKey` with programmatically-generated passwords | The password must now satisfy the full storage policy (classes + no repeats + no sequences). Catch `PrivateStateExportError` / `SigningKeyExportError` and read `cause.reason`. |
| Imports a signing-key export | Malformed entries now fail-fast with no partial writes. Genuine exports are unaffected. |
| Constructs `IndexerPublicDataProvider` or `HttpClientProofProvider` with `http://` / `ws://` against a remote host | You will see one `console.warn` at construction. Switch to `https://` / `wss://` or filter the warning. |

## Step 4 (optional) — Use the new utils re-exports

If your dApp surfaces password-policy errors to users, you can now import the policy directly from utils instead of re-implementing it:

```typescript
import {
  validatePassword,
  PasswordValidationError
} from '@midnight-ntwrk/midnight-js-utils';
```

This is purely additive — old code that catches `PrivateStateExportError` / `SigningKeyExportError` and inspects `error.message` continues to work, though `cause.reason` is the recommended discriminator going forward.

---

## Rollback

If you need to roll back to v4.1.0:

```bash
yarn upgrade @midnight-ntwrk/midnight-js@4.1.0
yarn install
```

No data migration is involved in either direction — on-disk encrypted state formats are identical between v4.1.0 and v4.1.1.

## Need help?

- Compare the full surface in [api-changes.md](./api-changes.md)
- Re-read the v4.1.0 [release notes](../v4.1.0/release-notes.md) if you're skipping versions
- File an issue at https://github.com/midnightntwrk/midnight-js/issues
