# Migration Guide v4.1.0 → v4.1.1

**Migration complexity:** Minimal — one error-field rename. Otherwise drop-in.

v4.1.1 is a patch release. The only required code change is for consumers that catch `IndexerFormattedError` and read its GraphQL-error array: that field has moved from `.cause` to `.errors`. TypeScript flags this at compile time **only** when the caught value is narrowed to `IndexerFormattedError` (a broader `catch (e) { if (e instanceof Error) e.cause }` typechecks under both versions but silently reads `undefined` in v4.1.1). All other v4.1.0 imports continue to work identically — see Step 3 for the rename and Step 2 for a grep hint.

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

If your test suite passed against v4.1.0, it will pass against v4.1.1 **unless** you catch `IndexerFormattedError` (narrowed to the subclass) and read `err.cause` — TypeScript flags those reads as the only signature change in the public API. For broader catches that only narrow to `Error`, grep for `err.cause` in any `catch` block that handles indexer paths — that read returns `undefined` in v4.1.1 without a compile error. See Step 3 below.

## Step 3 (conditional) — Rename `IndexerFormattedError.cause` → `.errors`

If `yarn build` reports `Property 'cause' does not exist on type 'IndexerFormattedError'` (or you previously had code that reads `err.cause` on a caught `IndexerFormattedError`), update those reads to `err.errors`:

```diff
  } catch (e) {
    if (e instanceof IndexerFormattedError) {
-     console.error('GraphQL errors:', e.cause);
+     console.error('GraphQL errors:', e.errors);
    }
  }
```

Both fields hold the same `readonly GraphQLFormattedError[]`. The rename is only a slot move — no logic changes are needed on the consumer side. The standard `Error.cause` slot is no longer shadowed, so `util.inspect`, Sentry, and structured loggers will now render the chain correctly.

## Step 4 (conditional) — Review the four behaviour changes

Skim [breaking-changes.md](./breaking-changes.md). The release contains four fixes that surface as behaviour changes; each is gated behind a specific code path. Action is required **only if** your application uses one of the affected paths:

| If your code... | Then... |
|---|---|
| Subscribes to `contractStateObservable({ type: 'blockHeight' \| 'blockHash' })` | You now receive emissions instead of an empty observable. Verify your subscriber handles them. |
| Calls `exportPrivateState` / `exportSigningKey` with programmatically-generated passwords | The password must now satisfy the full storage policy (classes + no repeats + no sequences). Catch `PrivateStateExportError` / `SigningKeyExportError` and read `cause.reason`. |
| Imports a signing-key export | Malformed entries now fail-fast with no partial writes. Genuine exports are unaffected. |
| Constructs `IndexerPublicDataProvider` or `HttpClientProofProvider` with `http://` / `ws://` against a remote host | You will see one `console.warn` at construction. Switch to `https://` / `wss://` or filter the warning. |

### Optionally: narrow on the new `IndexerError` hierarchy

If your code needs to distinguish between transport failures, server-returned GraphQL errors, malformed subscription payloads, and consumer-side misconfiguration, you can now branch on subclasses of the new abstract `IndexerError` instead of inspecting messages:

```typescript
import {
  IndexerError,
  IndexerFormattedError,
  IndexerQueryError,
  IndexerSubscriptionDataError,
  IndexerDataError,
  IndexerProviderConfigError
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

try {
  await indexer.queryDeployContractState(address);
} catch (e) {
  if (e instanceof IndexerFormattedError) {
    // server returned one or more GraphQLFormattedError entries
    handleGraphQlErrors(e.errors);
  } else if (e instanceof IndexerQueryError) {
    // Apollo / transport failure; original error preserved on e.cause
    handleNetwork(e);
  } else if (e instanceof IndexerDataError) {
    // structurally inconsistent indexer response; branch on e.context.kind
    handleData(e.context);
  } else if (e instanceof IndexerError) {
    // unhandled provider error — still under the same umbrella
    handleUnknown(e);
  } else {
    throw e;
  }
}
```

This is purely additive — catching `Error` (or letting the error bubble) continues to work.

## Step 5 (optional) — Use the new utils re-exports

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
