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
| `MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID` | A runtime object handed to the down-convert engine is missing a binding it needs. Not raised by the loader — a loader failure surfaces as `LEDGER8_RUNTIME_MISSING`. | Read `missingMember` for the absent binding. Pass the classes of the onchain-runtime-v3 copy your application already loaded, all of them from that one copy, rather than assembling the runtime object by hand. |
| `MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH` | Two physically distinct copies of a retained-era runtime are loaded in one process; objects from one are rejected by the other. | The message names the packages. Trace them with `yarn why` and align on one name and version. Depending on both npm scopes at once is itself a duplicate. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS` | An instance-guard axis was requested that this framework version does not check. A TypeScript caller cannot produce this; it exists for the untyped JavaScript consumers the package also serves. | Read `requestedAxis` for the value that was passed. The only axis checked is onchain-runtime-v3. |
| `MIDNIGHT_JS_P_DOWN_CONVERT_FAILED` | Contract state could not be converted to the retained era's representation. `stage` says which step. | Branch on `stage` first — it is what separates bad envelope bytes from a conversion that lost data. For either envelope-extraction stage, read the cause (it distinguishes a tag mismatch from truncated, trailing or empty bytes) and pass the state the target era produced. For `state down-convert` the fault is not in the bytes you supplied: report it with the cause. |
| `MIDNIGHT_JS_P_MERKLE_NOT_REHASHED` | A bounded Merkle tree's root was read before the tree was rehashed. | Call `rehash()` on the tree before executing against it. |
| `MIDNIGHT_JS_P_COMPOSE_FAILED` | Transaction composition refused. `stage` says which step and `circuitId` which entry point. | Branch on `stage`; each carries its own remediation in the message. Most commonly a contract state built in memory rather than read from chain. |
| `MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID` | A composition option cannot be used at all. `option` is a closed union of six: `calls`, `contractState`, `networkId`, `ttl`, `verifierKeys`, `zswapOffer`. | `switch` on `option`; each carries its own remediation in the message. `networkId` and `ttl` want an explicit valid value. `contractState` and `zswapOffer` want bytes that era's own serialization produced — read the cause. `verifierKeys` wants keys for exactly the circuits the contract declares. `calls` means the era composes exactly one call: submit each as its own transaction, or target the era that carries call trees. |
| `MIDNIGHT_JS_P_STATE_DECODE_FAILED` | Serialized contract state failed to decode on the era it was dated to. | Read the cause. If the era and the envelope disagree, this is the fork window — see `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH`. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION` | An era was requested by name that is not a `LedgerVersion`. | `requestedVersion` carries it. Usually a hand-built value; use `LEDGER_VERSIONS`. |
| `MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION` | Bytes handed to the retained-era proving seam do not carry a transaction tag. | The payload came from somewhere other than a sanctioned serialization seam. Do not re-wrap bytes by hand. |

### Era dispatch and the fork window (`MIDNIGHT_JS_C_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_C_STALE_HEAD` | The operation resolved one era, and the network had moved to the other before it landed. `kind` says whether it was a call or a deploy. | No transaction id is available, so confirm non-finalization the way the message prescribes: read the contract state at `contractAddress` and check whether the call to `circuitId` is already reflected in it. **Calls:** do that, *then* re-run unchanged. **Deploys:** check the address the deployment composed before deploying again, and see the runtime-deploy chapter of the migration guide — a re-run lands at a different address. |
| `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH` | The resolved head era and the fetched state's envelope era disagree, and a fresh head read confirms the head reading was the stale half. Raised while resolving state — before proving, balancing or submitting. | Re-read the network head, then re-run the operation against the era it now reports. Nothing was submitted, so `STALE_HEAD`'s confirm-non-finalization step does not apply here. |
| `MIDNIGHT_JS_C_INDEXER_INCONSISTENCY` | Head and state disagree and the disagreement survived a fresh head read, so the two answers cannot both describe one chain. Deliberately not reported as a fork in progress: nothing observed here establishes that one is under way. | Check the health of the configured indexer. A retry may clear it if what was served was transiently inconsistent, but this is not a stale reading the client can correct. Do not apply the fork-window remediation. |
| `MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9` | A retained-toolchain contract was deployed against a post-fork head. **Currently dormant:** `deployContract` refuses every retained-era deploy before any head is read, raising an uncoded `Error`, so this code is not reachable through the public API today. | Recompile the contract with the current toolchain and deploy that artifact. See the runtime-deploy chapter of the migration guide. The uncoded refusal you will actually meet has the same remediation. |
| `MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH` | The contract artifact's era and the era the operation needs do not match. | Use the artifact built for the era the contract was deployed in. |
| `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION` | A provider returned a payload from a ledger era other than the one this flow submits. | Check that the configured provider matches the network this application targets, and that no custom provider implementation re-tags the payload it was handed. |
| `MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED` | A provider call on the retained-era path failed. | The provider's error is on `cause`, redacted of transaction and witness material. Read the provider's own logs for the unredacted detail. |
| `MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED` | A retained-era call tried to spend a previously held shielded coin. | Not composable on the retained path. Run this circuit against a contract produced by the current toolchain. Shielded value the same call receives and pays out is unaffected. |
| `MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT` | The deployed contract declares the entry point in `circuitId` but registers no verifier key against it, so a call to it has nothing to be verified against. | A blank slot means that entry point was never deployed. Deploy the contract's verifier keys, or check that the address this operation targets is the contract you compiled. |
| `MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH` | The verifier key compiled locally for `circuitId` does not byte-match the one the deployed contract registers for that entry point. Raised before proving, so the proving cost is not paid. | The deployed contract is a different build from this local one: point the operation at the address this artifact was compiled for, or rebuild against the deployed contract's source. |
| `MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED` | A scoped transaction was attempted on an era that does not support them. | Scoped transactions are current-era only. Split the work into separate transactions. |
| `MIDNIGHT_JS_C_MIXED_ERA_SCOPE` | A retained-era call was given a contract-scoped transaction. A scope merges its calls into one current-era transaction, so a retained-era call cannot join one at all — even a scope holding nothing else. | Submit this call as its own transaction with `submitCallTx`, outside the scope, and keep the scope for calls against contracts produced by the current toolchain. |
| `MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED` | A submission was rejected and whether the network crossed the fork mid-build could not be resolved. `reason` says why: the head could not be re-read, or it reported an earlier era. | Check whether the transaction finalized first, the same way as for `STALE_HEAD` — this error carries `contractAddress` and `circuitId`. Then retry once the read surface is reachable, or check indexer health, per `reason`. An `AggregateError`: the submission rejection is the first entry of `errors`. |

### Provider seams (`MIDNIGHT_JS_PR_*`, `MIDNIGHT_JS_U_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_PR_UNTAGGED_PAYLOAD` | A payload reached a seam with no recognised `version` discriminant. `received` carries what was seen; the payload's contents never reach the message. | Tag the payload: wrap a live v9 ledger transaction as `{ version: 'v9', tx }`, or v8-era serialized bytes as `{ version: 'v8', txBytes }`. If you implement the seam yourself, the `createWalletProvider` / `createMidnightProvider` adapters do this for you. |
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
