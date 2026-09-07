# Troubleshooting

Common issues and solutions when developing with Midnight.js.

## Node.js Version Issues

### Wrong Node Version

**Symptom:** Build or runtime errors mentioning unsupported syntax or APIs.

**Solution:**
```bash
# Check current version
node -v

# Switch to correct version
nvm use

# If version not installed
nvm install
```

### Node Version Not Found

**Symptom:** `N/A: version "X" is not yet installed`

**Solution:**
```bash
nvm install
nvm use
```

### Corepack Not Enabled

**Symptom:** `yarn: command not found` or wrong Yarn version.

**Solution:**
```bash
corepack enable
```

## direnv Setup

### What direnv Does

The `.envrc` file automatically:
- Sets `COMPACTC_VERSION` environment variable
- Activates correct Node.js version via nvm
- Configures GPG signing for commits

### Installation

```bash
# macOS
brew install direnv

# Ubuntu/Debian
sudo apt install direnv

# Add to shell (bash)
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc

# Add to shell (zsh)
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
```

### direnv Not Loading

**Symptom:** Environment variables not set, wrong Node version.

**Solution:**
```bash
# Allow direnv for this directory
direnv allow

# Check status
direnv status
```

### Working Without direnv

If you prefer not to use direnv, manually set environment:

```bash
export COMPACTC_VERSION=0.33.0-rc.1
nvm use
git config --local commit.gpgSign true
git config --local tag.gpgSign true
```

## Build Failures

### Stale Build Artifacts

**Symptom:** Type errors or runtime errors after pulling changes.

**Solution:**
```bash
yarn clean
yarn build
```

### TypeScript Errors After Dependency Update

**Symptom:** Type errors in node_modules or dependency mismatches.

**Solution:**
```bash
rm -rf node_modules
yarn install
yarn clean-build
```

### Turbo Cache Issues

**Symptom:** Changes not reflected after build.

**Solution:**
```bash
# Force rebuild ignoring cache
yarn turbo run build --force
```

### Out of Memory During Build

**Symptom:** `JavaScript heap out of memory`

**Solution:**
```bash
NODE_OPTIONS=--max-old-space-size=8192 yarn build
```

## Test Failures

### Integration Tests Require Docker

**Symptom:** Integration tests fail with connection errors.

**Cause:** Integration tests require Docker services running.

**Solution:**
```bash
# Start Docker and required services
cd testkit-js
docker compose up -d

# Verify services are healthy
docker compose ps
```

### Vitest Timeout Errors

**Symptom:** `Test timed out after 90000ms`

**Solution:**
```bash
# Increase timeout for specific test
cd packages/<package>
yarn vitest --testTimeout=180000
```

### Tests Hang Indefinitely

**Symptom:** Tests start but never complete.

**Cause:** Often unresolved promises or missing mocks.

**Solution:**
```bash
# Run with verbose output
yarn vitest --reporter=verbose
```

## Git Hook Issues

### GPG Signing Failures

**Symptom:** `error: gpg failed to sign the data`

**Solutions:**

1. **GPG not configured:**
   ```bash
   # List keys
   gpg --list-secret-keys --keyid-format=long

   # Configure Git to use key
   git config --global user.signingkey <KEY_ID>
   ```

2. **GPG agent not running:**
   ```bash
   gpgconf --launch gpg-agent
   ```

3. **TTY issues:**
   ```bash
   export GPG_TTY=$(tty)
   ```

4. **Temporarily disable signing:**
   ```bash
   git commit --no-gpg-sign -m "message"
   ```

### Pre-push Hook Slow

**Symptom:** `git push` takes a long time.

**Cause:** Pre-push runs full lint and typecheck.

**Workaround (use sparingly):**
```bash
git push --no-verify
```

### Commit Message Rejected

**Symptom:** `commitlint` error on commit.

**Cause:** Commit message doesn't follow [Conventional Commits](https://www.conventionalcommits.org/).

**Solution:** Use correct format:
```bash
# Format
<type>(<scope>): <description>

# Examples
git commit -m "feat(contracts): add batch deployment"
git commit -m "fix(utils): handle empty input"
git commit -m "docs: update README"
```

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

### Lint-Staged Errors

**Symptom:** Pre-commit fails with lint errors.

**Solution:**
```bash
# Auto-fix issues
yarn lint:fix

# Then commit again
git add .
git commit -m "message"
```

## Common Errors

### `Cannot find module '@midnight-ntwrk/...'`

**Cause:** Package not built or dependency not linked.

**Solution:**
```bash
yarn build
```

### `ERR_MODULE_NOT_FOUND` for Local Packages

**Cause:** Workspace resolution issue.

**Solution:**
```bash
rm -rf node_modules
yarn install
yarn build
```

### `ENOENT: no such file or directory` During Build

**Cause:** Missing build output from dependency.

**Solution:**
```bash
# Build with dependencies
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-<package>...
```

### Type Errors: `Property 'X' does not exist`

**Cause:** TypeScript declarations out of sync.

**Solution:**
```bash
yarn clean
yarn build
```

### `COMPACTC_VERSION is not set`

**Cause:** Environment variable not configured.

**Solution:**
```bash
# With direnv
direnv allow

# Without direnv
export COMPACTC_VERSION=0.33.0-rc.1
```

### Docker Compose Service Unhealthy

**Symptom:** `container is unhealthy` errors.

**Solution:**
```bash
cd testkit-js

# Check logs
docker compose logs <service-name>

# Restart services
docker compose down
docker compose up -d

# Wait for healthy status
docker compose ps
```

## Midnight.js error codes

Every error midnight-js raises with a stable `code` is listed here. Discriminate on
one with `hasErrorCode(error, code)` from `@midnight-ntwrk/midnight-js-utils`; the
one-argument form answers "is this one of ours" and returns `false` for a foreign
coded error such as Node's `ECONNREFUSED`.

The set below is asserted against the code registry by
`packages/utils/src/test/troubleshooting-coverage.test.ts` in both directions, so a
new coded error cannot ship without an entry here and an entry cannot outlive its code.

### Version resolution (`MIDNIGHT_JS_P_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ` | A record's `protocolVersion` maps to no ledger era this build knows, while *reading* history. | The record predates or postdates what this framework version supports. Check the indexer's network against the framework version; node 0.x is deliberately unmapped. |
| `MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT` | Same, while resolving the era to *build* a transaction against. | The network head is on a version this build cannot target. Upgrade the framework; do not retry, the answer will not change. |
| `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING` | The retained-era runtime could not be resolved or initialised. | Read the wrapped cause for the module that failed. Usually a broken or partial install — reinstall dependencies. |
| `MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID` | The retained-era module resolved but does not expose what the loader needs. | A shimmed, mocked or wrongly aliased install. Check for a `resolutions`/`overrides` entry redirecting the package. |
| `MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH` | Two physically distinct copies of a retained-era runtime are loaded in one process; objects from one are rejected by the other. | The message names the packages. Trace them with `yarn why` and align on one name and version. Depending on both npm scopes at once is itself a duplicate. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS` | An internal instance-guard axis was requested that does not exist. | A framework bug — report it with the stack. |
| `MIDNIGHT_JS_P_DOWN_CONVERT_FAILED` | Contract state could not be converted to the retained era's representation. | Read the cause: it separates a tag mismatch (state from a different era) from truncated or empty bytes. Pass the state the target era produced. |
| `MIDNIGHT_JS_P_MERKLE_NOT_REHASHED` | A bounded Merkle tree's root was read before the tree was rehashed. | Call `rehash()` on the tree before executing against it. |
| `MIDNIGHT_JS_P_COMPOSE_FAILED` | Transaction composition refused. `stage` says which step and `circuitId` which entry point. | Branch on `stage`; each carries its own remediation in the message. Most commonly a contract state built in memory rather than read from chain. |
| `MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID` | A composition option was rejected — empty network id, invalid time-to-live, or an unusable contract state. | `option` names which. Supply the value explicitly rather than letting it default. |
| `MIDNIGHT_JS_P_STATE_DECODE_FAILED` | Serialized contract state failed to decode on the era it was dated to. | Read the cause. If the era and the envelope disagree, this is the fork window — see `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH`. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION` | An era was requested by name that is not a `LedgerVersion`. | `requestedVersion` carries it. Usually a hand-built value; use `LEDGER_VERSIONS`. |
| `MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION` | Bytes handed to the retained-era proving seam do not carry a transaction tag. | The payload came from somewhere other than a sanctioned serialization seam. Do not re-wrap bytes by hand. |

### Era dispatch and the fork window (`MIDNIGHT_JS_C_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_C_STALE_HEAD` | The operation resolved one era, and the network had moved to the other before it landed. | **Calls:** confirm the original did not finalize, *then* re-run unchanged. **Deploys:** see the runtime-deploy chapter of the migration guide — a re-run cannot help. |
| `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH` | The resolved head era and the fetched state's envelope era disagree, and a fresh head read confirms the head reading was the stale half. | The fork is in progress. Apply the two-step remediation as for `STALE_HEAD`. |
| `MIDNIGHT_JS_C_INDEXER_INCONSISTENCY` | Head and state disagree, but the fresh head read shows the fork is long past — so this is a lagging or inconsistent indexer, not the boundary. | Retry later or check indexer health. Do not apply the fork-window remediation. |
| `MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9` | A retained-toolchain contract was deployed against a post-fork head. | Recompile with the current toolchain and deploy that artifact. See the runtime-deploy chapter of the migration guide. |
| `MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH` | The contract artifact's era and the era the operation needs do not match. | Use the artifact built for the era the contract was deployed in. |
| `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION` | An internal result carried an era tag that contradicts the pipeline that produced it. | A framework bug — report it with the stack. |
| `MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED` | A provider call on the retained-era path failed. | The provider's error is on `cause`, redacted of transaction and witness material. Read the provider's own logs for the unredacted detail. |
| `MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED` | A retained-era call tried to spend a previously held shielded coin. | Not composable on the retained path. Run this circuit against a contract produced by the current toolchain. Shielded value the same call receives and pays out is unaffected. |
| `MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT` | The contract state declares an entry point whose verifier key slot is blank. | The state came from a constructor result rather than from chain. Read the state after a successful deploy. |
| `MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH` | The verifier key presented does not match the one the contract declares for that circuit. | Usually a stale or foreign key file picked up by globbing. Supply keys for exactly the circuits this contract declares. |
| `MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED` | A scoped transaction was attempted on an era that does not support them. | Scoped transactions are current-era only. Split the work into separate transactions. |
| `MIDNIGHT_JS_C_MIXED_ERA_SCOPE` | One scoped transaction mixed contracts from both eras. | A scope cannot straddle the boundary. Group by era and submit separately. |
| `MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED` | A submission was rejected and no diagnosis matched it. | An `AggregateError`: read every member. Report it if the rejection is reproducible. |

### Provider seams (`MIDNIGHT_JS_PR_*`, `MIDNIGHT_JS_U_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD` | A payload reached a provider seam without a `version` tag. | Build provider implementations with `createWalletProvider` / `createMidnightProvider` rather than tagging by hand. |
| `MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED` | A retained-era payload reached a seam that does not implement that arm. | The provider in use is current-era only. Configure one that carries both. |
| `MIDNIGHT_JS_PR_ERA_UNSUPPORTED` | A record was read whose era this provider cannot decode. | `seam`, `era`, `protocolVersion` and `recordRef` identify it. Upgrade the framework if the era is newer than this build. |
| `MIDNIGHT_JS_PR_ERA_UNRESOLVABLE` | The indexer reported a `protocolVersion` that resolves to no era. | The originating error is on `cause`. Check the indexer's network matches the framework version. |
| `MIDNIGHT_JS_U_TAG_PARSE_FAILED` | A serialized payload's `namespace:version:` tag prefix could not be parsed. | Verify the payload came from a sanctioned seam — a wallet balance response, a proof request, or a raw contract-state query. |

## Getting Help

If issues persist:

1. Check existing [GitHub Issues](https://github.com/midnightntwrk/midnight-js/issues)
2. Open a new issue with:
   - Node version (`node -v`)
   - Yarn version (`yarn -v`)
   - OS and version
   - Full error message
   - Steps to reproduce
