# New Features v4.1.1

v4.1.1 is a patch release. There are no new product features — the additions in this release fall into two categories:

- **`testkit-js` (testing infrastructure)** — compose-image parameterisation and `qanet` support. These do not affect dApps depending on `@midnight-ntwrk/midnight-js` or its sub-packages.
- **Additive exports in publicly consumed packages** — helper utilities in `@midnight-ntwrk/midnight-js-utils` (`validatePassword`, `warnIfInsecureRemoteUrl`) and a new error hierarchy in `@midnight-ntwrk/midnight-js-indexer-public-data-provider` (`IndexerError` and its five subclasses). These ride along with bug fixes — every v4.1.0 import continues to work, and the new exports are optional.

## testkit-js: Parameterised compose image versions + nightly e2e matrix (#917)

Image tags for the `proof-server`, `indexer`, and `midnight-node` containers used by `testkit-js/compose.yml` and `testkit-js/proof-server.yml` are no longer hardcoded. Each tag is now an env-var reference (`${PROOF_SERVER_IMAGE_TAG}` etc.), and a set of per-environment files under `testkit-js/env/` defines the values:

```
testkit-js/env/
├── qanet
├── preview        ← default
├── preprod
├── mainnet
└── devnet
```

`.envrc` selects one of these via the `TESTKIT_DOCKER_ENV` variable (defaults to `preview`). To run the suite against a different image set:

```bash
TESTKIT_DOCKER_ENV=qanet direnv allow && yarn test:e2e
```

CI gains a nightly workflow (`.github/workflows/nightly-e2e.yml`, daily at 02:00 UTC) that rotates `TESTKIT_DOCKER_ENV` across all five envs against the local docker stack. `ci-testkit-js.yml` exposes a `midnight_env` workflow_call input wired into each direnv step so the right env file is sourced.

`DEVELOPMENT.md` and `testkit-js-e2e/README.md` document the two independent axes: live-target (`MN_TEST_ENVIRONMENT`) vs. image-versions (`TESTKIT_DOCKER_ENV`). Existing setups that did not export `TESTKIT_DOCKER_ENV` keep working — `preview` is the default.

## testkit-js: `qanet` support via NIGHT/dust faucet flow (`73a3fd59`)

`testkit-js` now works end-to-end against the live `qanet.midnight.network` environment. The qanet faucet drips **unshielded NIGHT** (not shielded), which previously caused the shielded-balance gate in `waitForFunds` never to match — wallets started with no dust available to pay subsequent fees.

The changes bundled into this commit:

- `faucet-client` — switched to the new `recipientAddress` + amount payload and the `X-Captcha-Token` header expected by the qanet faucet
- `environment-provider` — maps `preview` / `preprod` / `qanet` env keys to their matching network IDs (was: generic `test` / `dev`)
- `qanet-test-environment` — points at the live `qanet.midnight.network` indexer / node / faucet endpoints
- `wallet-factory` + `wallet-configuration-mapper` — drops the legacy `additionalFeeOverhead` (now `0n`)
- `waitForFunds` — checks unshielded NIGHT balance and, when the wallet holds NIGHT but no dust, waits for dust accrual

Purely additive to the testkit; existing devnet/testnet flows are unaffected.

---

## Helper additions in `@midnight-ntwrk/midnight-js-utils` (additive, no API removal)

These ride along with bug fixes in this release but are useful as standalone helpers:

### `warnIfInsecureRemoteUrl(url, label)` (#920)

```typescript
import { warnIfInsecureRemoteUrl } from '@midnight-ntwrk/midnight-js-utils';

warnIfInsecureRemoteUrl('http://indexer.example.com/graphql', 'IndexerPublicDataProvider');
// → emits console.warn (scheme is http: and host is not loopback)

warnIfInsecureRemoteUrl('https://indexer.example.com/graphql', 'IndexerPublicDataProvider');
// → no warning

warnIfInsecureRemoteUrl('http://localhost:8088/graphql', 'IndexerPublicDataProvider');
// → no warning (loopback host exempt)
```

Already wired into `IndexerPublicDataProvider` and `HttpClientProofProvider` — direct calls are only needed for custom provider factories.

### `validatePassword` and `PasswordValidationError` re-exports (#922)

`validatePassword`, `PasswordValidationError`, and the `PasswordValidationFailure` reason type — previously internal to `level-private-state-provider` — are now exported from `@midnight-ntwrk/midnight-js-utils` and shared by every `PrivateStateProvider` implementation.

```typescript
import {
  validatePassword,
  PasswordValidationError,
  type PasswordValidationFailure
} from '@midnight-ntwrk/midnight-js-utils';

try {
  validatePassword(userInput);
} catch (e) {
  if (e instanceof PasswordValidationError) {
    // e.reason: 'missing' | 'too_short' | 'insufficient_classes'
    //         | 'repeated_characters' | 'sequential_pattern'
    showUserFriendlyError(e.reason);
  }
}
```

Useful for surfacing the exact policy violation in a dApp UI before attempting export/import.

## Indexer error hierarchy in `@midnight-ntwrk/midnight-js-indexer-public-data-provider` (#937)

A coherent set of typed errors replaces the previous mix of generic `new Error(...)` throws and non-null-assertion crashes. Every error this provider raises is now a subclass of a new abstract `IndexerError`, so consumers can catch the full surface with one `instanceof` check.

```typescript
import {
  IndexerError,
  IndexerFormattedError,
  IndexerQueryError,
  IndexerDataError,
  IndexerSubscriptionDataError,
  IndexerProviderConfigError
} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
```

The hierarchy:

```
IndexerError (abstract)
├── IndexerFormattedError         GraphQL errors returned by server (errors[])
├── IndexerQueryError             Apollo transport / query failure (cause preserved)
├── IndexerSubscriptionDataError  Missing top-level field in subscription payload
├── IndexerDataError              Structurally inconsistent indexer response (discriminated context)
│     ├── kind: 'unknown-status'
│     ├── kind: 'missing-contract-action'
│     └── kind: 'missing-identifier'
└── IndexerProviderConfigError    Consumer passed unsupported configuration
```

Two supporting types are also exported:

- `IndexerDataErrorContext` — the discriminated union carried by `IndexerDataError.context`. Lets you branch on the failure mode without parsing error messages.
- `IndexerSubscriptionField` — a literal union (`'blocks' | 'contractActions'`) for `IndexerSubscriptionDataError.missingField`.

Example: distinguish transport failures from server-returned errors:

```typescript
try {
  await indexer.queryDeployContractState(address);
} catch (e) {
  if (e instanceof IndexerFormattedError) {
    // server returned GraphQLFormattedError entries
    log.warn('indexer reported errors', { errors: e.errors });
  } else if (e instanceof IndexerQueryError) {
    // Apollo / transport failure; original error preserved on e.cause
    log.error('indexer transport failure', { cause: e.cause });
  } else if (e instanceof IndexerDataError) {
    // structurally inconsistent indexer response
    switch (e.context.kind) {
      case 'missing-contract-action': /* … */ break;
      case 'missing-identifier':       /* … */ break;
      case 'unknown-status':           /* … */ break;
    }
  } else if (e instanceof IndexerError) {
    // future-proof catch-all under the same umbrella
    log.error('indexer error', { error: e });
  } else {
    throw e;
  }
}
```

This is purely additive. Code that catches `Error` (or lets indexer errors bubble) continues to work — the new types are opt-in narrowing helpers, not a required refactor.

**One related breaking change:** `IndexerFormattedError.cause` is renamed to `.errors`. See [breaking-changes.md](./breaking-changes.md) for the rationale and the rename diff.
