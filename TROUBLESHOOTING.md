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

Every error midnight-js raises itself extends `MidnightJsError` and carries a `code` and a `category`; a failure from a dependency can still pass through uncoded, as the `cause` of a coded error or on its own.
Handle errors by category first, then by code:

```typescript
import { errorCategory } from '@midnight-ntwrk/midnight-js-utils';

try {
  await submitCallTx(providers, options);
} catch (e) {
  switch (errorCategory(e)) {
    case 'TRANSIENT': /* safe to retry the operation; rethrow if you do not */ throw e;
    case 'UNCERTAIN': /* a submitted transaction may be on chain: check before anything else (see the code's row) */ throw e;
    case 'REJECTED': /* show the refusal to the user, then rethrow or stop */ throw e;
    case 'USAGE': case 'ENVIRONMENT': /* fix code or setup; do not retry */ throw e;
    case 'INTEGRITY': case 'INTERNAL': /* alert or report */ throw e;
    case undefined: /* not a midnight-js error */ throw e;
  }
}
```

`UNCERTAIN` (`MIDNIGHT_JS_C_STALE_HEAD`, `MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED`, `MIDNIGHT_JS_C_LEDGER8_DEPLOY_UNCONFIRMED`, `MIDNIGHT_JS_C_LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED`) means a submitted transaction may already be on chain. Never retry these blindly: follow the code's row first.

Use `hasErrorCode`, `isMidnightJsError` and `errorCategory` rather than `instanceof`: two installed copies
of a package make `instanceof` answer `false`.

Every error midnight-js raises with a stable `code` is listed here. Discriminate on
one with `hasErrorCode(error, code)` from `@midnight-ntwrk/midnight-js-utils`; the
one-argument form answers "is this one of ours" and returns `false` for a foreign
coded error such as Node's `ECONNREFUSED`.

The set below is asserted against the code registry by
`packages/utils/src/test/troubleshooting-coverage.test.ts` in both directions, so a
new coded error cannot ship without an entry here and an entry cannot outlive its code.

### General (`MIDNIGHT_JS_G_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_G_INVALID_ARGUMENT` | A value passed to a midnight-js function was refused; the message names it. | Fix the value at the call site. Do not retry. |
| `MIDNIGHT_JS_G_CONFIGURATION_MISSING` | Required setup is missing or was done out of order (e.g. no network id, no contract address set). | Do the setup step the message names before the call. |
| `MIDNIGHT_JS_G_ENVIRONMENT_UNSUPPORTED` | The JavaScript runtime lacks an API midnight-js needs. | Run on a supported Node/browser version, or supply the alternative the message names. |
| `MIDNIGHT_JS_G_INVARIANT_VIOLATED` | An internal guarantee of midnight-js did not hold. | Report it as a midnight-js bug with the full error and `cause`. |

### Version resolution (`MIDNIGHT_JS_P_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ` | A record's `protocolVersion` maps to no ledger era this build knows, while *reading* history. | The record predates or postdates what this framework version supports. Check the indexer's network against the framework version; node 0.x is deliberately unmapped. |
| `MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT` | Same, while resolving the era to *build* a transaction against. | The network head is on a version this build cannot target. Upgrade the framework; do not retry, the answer will not change. |
| `MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING` | The retained-era runtime could not be resolved or initialised. `subpath` says which of the two lazy chunks failed. | Read the wrapped cause for the module that failed. Usually a broken or partial install — reinstall dependencies. |
| `MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID` | A runtime object handed to the retained-era envelope decoder is missing a binding it needs. Not raised by the loader — a loader failure surfaces as `LEDGER8_RUNTIME_MISSING`. | Read `missingMember` for the absent binding. Pass the classes of the onchain-runtime-v3 copy your application already loaded, all of them from that one copy, rather than assembling the runtime object by hand. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS` | **Retired — nothing in the framework raises this.** It was raised only by the instance guard removed with the hand-maintained execution layer. Kept on the published surface for consumers that switch on it. | No action: this code can no longer be produced by the framework. |
| `MIDNIGHT_JS_P_DOWN_CONVERT_FAILED` | Contract state could not be decoded into the retained era's representation. `stage` says which step; `'state down-convert'` is the decode and its re-encode round trip in `lib/v8/executable.ts`. | Branch on `stage` first — it is what separates bad envelope bytes from a conversion that lost data. For either envelope-extraction stage, read the cause (it distinguishes a tag mismatch from truncated, trailing or empty bytes) and pass the state the target era produced. For `state down-convert` the fault is not in the bytes you supplied: report it with the cause. |
| `MIDNIGHT_JS_P_MERKLE_NOT_REHASHED` | **Retired — nothing in the framework raises this.** Rehash state does not survive an `EncodedStateValue`: a never-rehashed and a rehashed tree encode byte-identically and decode to the same root, so the condition cannot reach the function that takes an already-encoded value. Kept on the published surface for consumers that switch on it. | No action: this code can no longer be produced by the framework. |
| `MIDNIGHT_JS_P_COMPOSE_FAILED` | Transaction composition refused. `stage` says which step and `circuitId` which entry point. | Branch on `stage`; each carries its own remediation in the message. Most commonly a contract state built in memory rather than read from chain. |
| `MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID` | A composition option cannot be used at all. `option` is a closed union of six: `calls`, `contractState`, `networkId`, `ttl`, `verifierKeys`, `zswapOffer`. | `switch` on `option`; each carries its own remediation in the message. `networkId` and `ttl` want an explicit valid value. `contractState` and `zswapOffer` want bytes that era's own serialization produced — read the cause. `verifierKeys` wants keys for exactly the circuits the contract declares. `calls` means the era composes exactly one call: submit each as its own transaction, or target the era that carries call trees. |
| `MIDNIGHT_JS_P_STATE_DECODE_FAILED` | Serialized contract state failed to decode on the era it was dated to. | Read the cause. If the era and the envelope disagree, this is the fork window — see `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH`. |
| `MIDNIGHT_JS_P_STATE_INCONSISTENT` | Serialized contract state decoded, but the state is internally inconsistent (an unresolvable entry point, an unhashable verifier key, or no usable balance). | Read the cause. Do not retry with the other era — the bytes were this era's. Check the decoder the era was loaded with and the source of the state. |
| `MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION` | An era was requested by name that is not a `LedgerVersion`. | `requestedVersion` carries it. Usually a hand-built value; use `LEDGER_VERSIONS`. |
| `MIDNIGHT_JS_P_PAYLOAD_NOT_A_TRANSACTION` | `deserializeTransactionAtStage` was given bytes it cannot read as a transaction of the requested era and stage, in either era. Either the bytes do not carry a transaction tag, or they carry one but the era's runtime refused to decode them at that stage (the runtime's refusal is on `cause`). A read from the chain or the indexer keeps its own read-error classification and carries this error as `cause`. | Check that the era and the stage you asked for match what wrote the bytes; take the era from the request, never guess it from the bytes. Do not re-wrap bytes by hand: pass the bytes the ledger's own `serialize()` produced. |
| `MIDNIGHT_JS_P_CONTRACT_EXECUTION_FAILED` | A circuit or constructor execution failed. A Compact `assert` refusal is the usual cause, but an uncoded key or config read failure or a runtime fault can also arrive this way. A lone failure that carries a coded midnight-js error (for example a ZK artifact fetch failure) surfaces as that error instead. When several failures arrive at once, this error lists them all and `cause` is the first coded one. | Read `cause`: it is the source of truth. If it is an `assert`, check the inputs and the contract's rules. |
| `MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH` | A ledger 8 maintenance update (insert or remove a verifier key, replace the authority) was refused before signing. `reason` says why: `'not-first-member'` (the signing key is not the first member of the authority committee, the member every update is signed for), `'empty-committee'` (the authority has no committee) or `'threshold-above-one'` (the authority needs more signatures than the one every update carries). Nothing was signed, proven or submitted. | For `'not-first-member'`: the key held for `contractAddress` is not the one the authority was built from — often a key the other ledger era or another deployment stored under the same address, or a previous authority replacement whose new key was never stored. Supply the key the contract was deployed with, or the one the last authority replacement installed. The other two reasons describe an authority this framework cannot sign for. |

### Era dispatch and the fork window (`MIDNIGHT_JS_C_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_C_STALE_HEAD` | The operation resolved one era, and the network had moved to the other before it landed. `kind` says whether it was a call or a deploy. | No transaction id is available, so confirm non-finalization the way the message prescribes: read the contract state at `contractAddress` and check whether the call to `circuitId` is already reflected in it. **Calls:** do that, *then* re-run unchanged. **Deploys:** check the address the deployment composed before deploying again, since a re-run mints a fresh nonce and lands at a different address, *then* recompile with the ledger 9 Compact toolchain and deploy that artifact. See the runtime-deploy chapter of the migration guide. |
| `MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH` | The resolved head era (`head`) and the fetched state's envelope era (`stateEra`) disagree, and a fresh head read confirms the head reading was the stale half. Raised while resolving state — before proving, balancing or submitting. | Re-read the network head, then re-run the operation against the era it now reports. Nothing was submitted, so `STALE_HEAD`'s confirm-non-finalization step does not apply here. |
| `MIDNIGHT_JS_C_INDEXER_INCONSISTENCY` | Head (`head`) and state (`stateEra`) disagree and the disagreement survived a fresh head read, so the two answers cannot both describe one chain. Deliberately not reported as a fork in progress: nothing observed here establishes that one is under way. | Check the health of the configured indexer. A retry may clear it if what was served was transiently inconsistent, but this is not a stale reading the client can correct. Do not apply the fork-window remediation. |
| `MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_LEDGER9` | A contract from the ledger 8 (pre-fork) Compact toolchain was deployed against a post-fork head. `deployContract` reads the head first and refuses the deploy before anything is composed: ledger 8 has no post-fork deployment. | Recompile the contract with the ledger 9 Compact toolchain and deploy that artifact. See the runtime-deploy chapter of the migration guide. |
| `MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH` | A contract object was refused as belonging to the wrong era, or to neither. `reason` is a closed union; some members are era mismatches, others are shape or declaration mistakes. | `switch` on `reason`; each carries its own remediation in the message. `unwrapped-ledger9-contract` is a shape mistake, not an era one — wrap the raw instance with `CompiledContract.make(tag, Contract)` and attach its witnesses. `unrecognised-contract-shape` matches no era at all — pass either a `CompiledContract` container or the instance the ledger 8 (pre-fork) Compact toolchain generates. `ledger9-artifact-on-ledger8-head` is about eras: the network head is still pre-fork, so run the operation against a contract from the ledger 8 (pre-fork) Compact toolchain. `ledger9-transaction-on-ledger8-head` is the same for `submitTx`: submit a v8 handle until the head has crossed the fork. `ledger8-transaction-on-ledger9-head` is the reverse: the head has crossed the fork, so compose the transaction again against the v9 ledger and submit a v9 handle. |
| `MIDNIGHT_JS_C_LEDGER8_ARTIFACT_ON_LEDGER9_STATE` | The contract at `contractAddress` is held on chain in a ledger 9 state, while the artifacts this operation was given came from the ledger 8 (pre-fork) Compact toolchain. Nothing here is stale or inconsistent: a contract deployed before the fork keeps its ledger 8 keys across it, so a ledger 9 envelope with keys that do not match means this contract was deployed, or re-deployed, with ledger 9 Compact toolchain artifacts. | Re-run the operation with the artifacts the ledger 9 Compact toolchain produced for that contract. Retrying with the same artifacts cannot succeed, so the fork-window remediation does not apply. |
| `MIDNIGHT_JS_C_LEDGER8_CONTRACT_STATE_UNSUPPORTED` | The contract at `contractAddress` is held on chain in a state the v8 ledger wrote, and `operation` (`findDeployedContract`, `createUnprovenCallTx`, a cross-contract callee read or a maintenance read) runs only against v9 states. | Before the hard fork, run the operation through the contract the ledger 8 (pre-fork) Compact toolchain produced. After the fork, indexer 4.4.0-rc.6 and later serve every contract's state translated to v9: upgrade an older indexer. |
| `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION` | A provider returned a payload from a ledger era this flow cannot accept. `method` names the provider method, `expected` the era it can accept, `received` the era that actually came back, and `circuitId` the entry point when one applies. For the current era's flows `expected` is the era they submit; the ledger 8 finalizing path compares against the network HEAD, because a ledger 8 call is recorded by whichever ledger the head is on. | Check that the configured provider matches the network this application targets, and that no custom provider implementation re-tags the payload it was handed. |
| `MIDNIGHT_JS_C_UNKNOWN_RESULT_ERA` | A result was handed to `isLedger8Result` carrying an era tag that names neither pipeline. `received` holds the offending tag. The guard refuses rather than answering `false`, which would mean "ledger 9" and send the caller down the wrong branch. | Every result this framework builds is tagged. A tag that is missing or unreadable was dropped in transit — a queue, a JSON boundary, a structured clone. Narrow the result before it crosses that boundary, or carry the era alongside it. A result stored under a 5.0.0 pre-release carries `'ledger8'` / `'ledger9'`: map those to `'v8'` / `'v9'`. |
| `MIDNIGHT_JS_C_TX_FAILED` | A transaction this framework submitted was recorded by the chain with a non-success status, in either era. Carried by every recorded-failure class here, including the deploy and maintenance ones. | Read `record` for the chain's own report, narrowing on `record.version` before touching `record.tx`. Branch on this code rather than `instanceof` when more than one copy of `midnight-js-contracts` may be resolved in the process. |
| `MIDNIGHT_JS_C_PROVIDER_FAILED` | A provider rejected the transaction at `proveTx`, `balanceTx` or `submitTx`, on any era. | The provider's error is on `cause`, redacted of transaction and witness material. Read the provider's own logs for the unredacted detail. |
| `MIDNIGHT_JS_C_LEDGER8_SHIELDED_SPEND_UNSUPPORTED` | A ledger 8 call tried to spend a previously held shielded coin. | Not composable on the ledger 8 path. Run this circuit against a contract produced by the ledger 9 Compact toolchain. Shielded value the same call receives and pays out is unaffected. |
| `MIDNIGHT_JS_C_BLANK_VERIFIER_KEY_SLOT` | The deployed contract declares the entry point in `circuitId` but registers no verifier key against it, so a call to it has nothing to be verified against. | A blank slot means that entry point was never deployed. Deploy the contract's verifier keys, or check that the address this operation targets is the contract you compiled. |
| `MIDNIGHT_JS_C_VERIFIER_KEY_MISMATCH` | The verifier key compiled locally for `circuitId` does not byte-match the one the deployed contract registers for that entry point. Raised before proving, so the proving cost is not paid. | The deployed contract is a different build from this local one: point the operation at the address this artifact was compiled for, or rebuild against the deployed contract's source. |
| `MIDNIGHT_JS_C_SCOPED_TRANSACTION_ERA_UNSUPPORTED` | A scoped transaction was attempted on an era that does not support them. | Scoped transactions are ledger 9 only. Split the work into separate transactions. |
| `MIDNIGHT_JS_C_MIXED_ERA_SCOPE` | A ledger 8 call was given a contract-scoped transaction. A scope merges its calls into one ledger 9 transaction, so a ledger 8 call cannot join one at all — even a scope holding nothing else. | Submit this call as its own transaction with `submitCallTx`, outside the scope, and keep the scope for calls against contracts produced by the ledger 9 Compact toolchain. |
| `MIDNIGHT_JS_C_SUBMIT_REJECTION_UNDIAGNOSED` | A submission was rejected and whether the network crossed the fork mid-build could not be resolved. `reason` says why: the head could not be re-read, or it reported an earlier era. | Check whether the transaction finalized first, the same way as for `STALE_HEAD` — this error carries `contractAddress` and `circuitId`. Then retry once the read surface is reachable, or check indexer health, per `reason`. The submission rejection is the first entry of `errors`. |
| `MIDNIGHT_JS_C_LEDGER_PARAMETERS_UNSERVED` | The read surface served the state of the contract at `contractAddress` without the ledger parameters of the block that dates it, so the call cannot be partitioned against the cost model the chain is running. | Configure a `PublicDataProvider` whose `queryRawContractState` serves `ledgerParameters`; the bundled indexer provider does. Substituting the ledger's initial parameters is not the fix — it draws the guaranteed and fallible segment boundary from a model the chain does not run, and the node then refuses the guaranteed segment for running out of gas after proving has already been paid for. A caller that genuinely has no read surface selects that path by name, with `INITIAL_LEDGER_PARAMETERS` from `midnight-js-protocol`. |
| `MIDNIGHT_JS_C_CONTRACT_TYPE_MISMATCH` | The deployed contract at the address does not match the local contract (missing, keyless or different circuits). | Use the address of a contract of this type, or the artifacts it was deployed with. |
| `MIDNIGHT_JS_C_INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG` | A call needs private state but its private-state options are incomplete. | Pass both `privateStateId` and a `privateStateProvider`. |
| `MIDNIGHT_JS_C_INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG` | A deploy was given a partial private-state configuration. | Pass `privateStateId` together with `initialPrivateState`. |
| `MIDNIGHT_JS_C_INCOMPLETE_FIND_PRIVATE_STATE_CONFIG` | `findDeployedContract` was given a partial private-state configuration. | Pass `privateStateId` together with the private-state value to store. |
| `MIDNIGHT_JS_C_SCOPED_TRANSACTION_IDENTITY_MISMATCH` | A call in a scoped transaction targets a different contract identity than the scope. | Keep every call in one scope on the same contract and providers. |
| `MIDNIGHT_JS_C_LEDGER8_DEPLOY_UNCONFIRMED` | A ledger 8 deploy was submitted but its outcome is unknown. | Save `signingKey` from the error first: it is the only copy of the contract's maintenance key. Then look up `contractAddress` before deploying again; a second deploy lands at a new address. |
| `MIDNIGHT_JS_C_LEDGER8_AMBIGUOUS_ENTRY_POINT` | The on-chain state of a ledger 8 contract declares the same entry-point name more than once, so a call cannot tell which slot it would run on. | Nothing in the call can fix this: report the contract address. |
| `MIDNIGHT_JS_C_LEDGER8_RECIPIENT_UNMAPPABLE` | A ledger 8 call or deploy pays a shielded coin to a recipient whose encryption public key cannot be resolved: it is not the calling wallet's own key, the burn address, or a mapped recipient. | For a call, add the recipient's coin public key and encryption public key to `additionalCoinEncPublicKeyMappings`. A ledger 8 deploy takes no mappings, so its constructor cannot pay a shielded coin to a third party. |
| `MIDNIGHT_JS_C_LEDGER8_DEPLOY_NOT_STORED` | A ledger 8 deploy succeeded on chain but its local record was refused. | Do NOT deploy again. Store the key carried on the error with the private-state provider. |
| `MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_UNUSABLE` | A signing key passed to a ledger 8 deploy, attach, or authority replacement (`submitReplaceAuthorityTx` / `replaceAuthority`) is not a `schnorr` key whose value is exactly 64 hex characters. Nothing was composed or stored. | Pass `{ tag: 'schnorr', value: <64 hex characters> }`, the form `sampleSigningKey` produces. |
| `MIDNIGHT_JS_C_LEDGER8_MAINTENANCE_ON_LEDGER9` | A contract maintenance update (insert or remove a verifier key, replace the maintenance authority) was given a ledger 8 artifact while the network head is past the fork. | Recompile the contract with the ledger 9 Compact toolchain and run the same function with that artifact; it maintains the migrated contract with the same stored signing key. |
| `MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_UNAVAILABLE` | A ledger 8 maintenance update found no usable signing key for `contractAddress`: none is stored, the stored entry is not a ledger 8 key, or the store could not be read (the read failure is on `cause`). Nothing was composed or proven. | Store the key the contract's maintenance authority was built from with `privateStateProvider.setSigningKey(address, key)`, or attach with `findDeployedContract` passing `signingKey`. |
| `MIDNIGHT_JS_C_LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED` | A ledger 8 maintenance authority replacement was submitted, but whether the chain applied it could not be confirmed (the submission was rejected while the head moved, or the record could not be read back or attributed; see `cause`). The new key was NOT stored. | Keep `signingKey` from the error: if the replacement landed it is the only key that authorizes the contract. Try a maintenance update with the stored key; if it is refused with `MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH`, store `error.signingKey` with `privateStateProvider.setSigningKey(address, error.signingKey)`. |
| `MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY_NOT_STORED` | A ledger 8 maintenance authority replacement was CONFIRMED on chain, but the private-state provider refused to store the new key. The old key no longer authorizes anything on that contract. | Keep `signingKey` from the error: it is the only copy of the new authority. Fix what the store refused (see `cause`) and write it back with `privateStateProvider.setSigningKey(address, error.signingKey)`. |
| `MIDNIGHT_JS_C_HEAD_READ_FAILED` | The network head could not be read: a re-read while checking an era disagreement failed, or the public data provider returned no latest block to pin a call to. | Retry once the indexer is reachable; a transport error, when there is one, is on `cause`. |
| `MIDNIGHT_JS_C_ZSWAP_OUTPUT_UNRESOLVED` | A Zswap output or its recipient's encryption key could not be resolved. | Check the recipient is a supported address and the coin type is supported. |
| `MIDNIGHT_JS_C_CONTRACT_NOT_FOUND` | No contract is deployed at the given address on the network the providers point to. | Check the address and that the providers target the network the contract was deployed on. |
| `MIDNIGHT_JS_C_PRIVATE_STATE_NOT_FOUND` | No private state is stored under the given private state id. | Check the id, or store the initial private state first (deploy or find with an initial state). |

### Provider methods (`MIDNIGHT_JS_PR_*`, `MIDNIGHT_JS_U_*`)

| Code | What happened | What to do |
|---|---|---|
| `MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED` | A record was read whose era this provider cannot decode. | `method`, `era` and `protocolVersion` identify it, plus `recordRef` when the record is known. Upgrade the framework if the era is newer than this build. |
| `MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA` | The indexer reported a `protocolVersion` that resolves to no era. | The originating error is on `cause`. Check the indexer's network matches the framework version. |
| `MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED` | The provider wired to `method` does not serve the era of the transaction. Raised before an operation starts, from the provider's `supportedEras`, so no proof was requested; or by a provider built from per-era handlers when a handle arrives in an era it has no handler for, before that method does any work. The second case can happen at `balanceTx` or `submitTx`, after proving, when a provider declared an era it does not serve. | `method`, `era` and `declared` identify the gap. Wire a provider that serves that era for that method — `createProofProviderFromHandlers`, `createWalletProviderFromHandlers` and `createMidnightProviderFromHandlers` build one from a handler per era. |
| `MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY` | A provider factory was given an era entry (`v8` or `v9`) it cannot use. Raised at construction, so `supportedEras` never claims an era no entry can serve. | `method`, `era`, `expected` and `received` identify the entry. For `createProofProviderFromHandlers`, `createWalletProviderFromHandlers` and `createMidnightProviderFromHandlers`, pass a function; for `createProofProviderFromProvingProviders`, pass a `ProvingProvider` with callable `check` and `prove`. Set an era's entry to `undefined` if that era is not served; every era key must be present, and at least one entry must serve an era. |
| `MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION` | `LedgerTransaction.seal` was given a transaction object that is not one of the ledger copy this framework loaded for `era`. `reason` is `foreign-instance` (another WASM instance of the ledger package, or not a transaction at all) or `ledger8-not-loaded` (a v8 object was sealed before the framework loaded its v8 ledger). | For `ledger8-not-loaded`, call and await `loadLedger8Protocol()` from `@midnight-ntwrk/midnight-js-protocol` first and build the transaction with the module it returns. For `foreign-instance`, build the transaction with the ledger module the framework uses and remove duplicate installs of the ledger package. |
| `MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE` | A value reaching a method that takes a transaction handle is not a usable one. `method` names the method, `reason` is `not-a-handle`, `wrong-stage` or `invalid-stage`, and `detail` describes what arrived. | Pass a handle made by `LedgerTransaction.seal`, at the stage the method takes. A value with the handle's shape that is still refused as `not-a-handle` was most likely sealed by a duplicate `@midnight-ntwrk/midnight-js-types` install: make sure only one copy is installed. |
| `MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH` | `LedgerTransaction.unwrap` was asked for one era, but the handle carries the other. `expected` and `actual` name both. | Read the handle's `era` before unwrapping it, and route it to the code that serves that era. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_NOT_SERIALIZABLE` | A private state was handed to `set` holding something storage cannot preserve: a function, a symbol, a class instance, an `ArrayBuffer`/`DataView`, an invalid `Date`, a sparse array, or a property storage would not write back. Nothing was written. | `path` names where it sits inside the state, `reason` says what storage would have done to it, and `privateStateId` names the state. Private state must be plain data: convert the member (`Buffer.from(buffer)`, `{ ...instance }`) or keep it outside the stored state. |
| `MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME` | A provider URL uses a scheme other than the ones it supports. | Use a scheme the message lists: `http` or `https`, or `ws` or `wss` for subscriptions. |
| `MIDNIGHT_JS_PR_ARTIFACT_RUNTIME_VERSION_UNAVAILABLE` | The ZK config provider cannot report the compact-runtime version of its artifacts. | Use a provider shipped with midnight-js, or implement the version accessor in yours. |
| `MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND` | No artifact source holds a bundle whose verifier key matches the deployed one for the named contract and circuit: the local artifacts are missing, or stale against the deployed contract. A source that failed an integrity check or was temporarily unavailable is reported with that error instead. | Use the compiled artifacts of the deployed contract version. Read `cause`: the other source failures are attached there. |
| `MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED` | Fetching or reading a ZK artifact, manifest or contract description failed at the network or with HTTP 408, 429 or 5xx. | Retry; if it persists, check the artifact server. Status is on `status`, the network error on `cause`. |
| `MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED` | The artifact server answered with an HTTP status below 500 other than 408 or 429, or an HTML page instead of the artifact. | Fix the base URL or deploy the artifacts; an HTML answer usually means an SPA fallback for a missing file. |
| `MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE` | The proof server could not be reached or answered HTTP 408, 429 or 5xx. | Retry; check the proof server is running and reachable. |
| `MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED` | The proof server answered another HTTP 4xx. | Check the proof server version matches this midnight-js release. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_EXPORT_FAILED` | Exporting private states was refused; the message names why. | Fix the condition the message names (e.g. nothing to export, limit) and export again. |
| `MIDNIGHT_JS_PR_SIGNING_KEY_EXPORT_FAILED` | Exporting signing keys was refused; the message names why. | Fix the condition the message names and export again. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_IMPORT_FAILED` | Importing private states failed. | Check the export file and the password; see the more specific import codes. |
| `MIDNIGHT_JS_PR_EXPORT_DECRYPTION_FAILED` | An export could not be decrypted. | Use the password the export was created with; the file may be corrupt. |
| `MIDNIGHT_JS_PR_INVALID_EXPORT_FORMAT` | An import file is not a valid midnight-js export. | Use a file produced by the export function of a compatible version. |
| `MIDNIGHT_JS_PR_IMPORT_CONFLICT` | An import would overwrite existing private state. | Choose the conflict strategy explicitly, or remove the existing entries first. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED` | Stored private state could not be decrypted. `reason` is `wrong-key` (wrong password, other salt, or the data was modified; these cannot be told apart) or `malformed` (unknown format or corrupt data). | Use the right password. If it is right, the store is corrupt or was tampered with: restore from an export. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED` | Reading or writing the private-state store failed (open, read, write, migration). | Check disk space and permissions; the underlying error is on `cause`. If closing the database failed too, that failure is on `closeError` and the database stays locked until the process exits. |
| `MIDNIGHT_JS_PR_PRIVATE_STATE_LIMIT_EXCEEDED` | A migration or password rotation processed more entries than `maxEntries` allows. Export and import limits (`maxStates`, `maxKeys`) raise the export and import errors instead. | Raise the `maxEntries` option if the volume is expected. |
| `MIDNIGHT_JS_PR_STORED_SIGNING_KEY_INVALID` | A stored signing key is not in a format this version can read. | Restore the key from a backup or an export; report it if the store was written by a supported version. |
| `MIDNIGHT_JS_PR_INDEXER_GRAPHQL_FAILED` | The indexer answered a query with GraphQL errors; they are listed on `errors`. | Check the indexer version is supported by this midnight-js release. |
| `MIDNIGHT_JS_PR_INDEXER_QUERY_FAILED` | A request to the indexer failed at the transport level. | Retry; check the indexer URL and network. The Apollo error is on `cause`. |
| `MIDNIGHT_JS_PR_INDEXER_DATA_INVALID` | The indexer returned data that breaks the provider's expectations; `context.kind` names how. | Do not retry blindly; report with the indexer version. |
| `MIDNIGHT_JS_PR_INDEXER_SUBSCRIPTION_DATA_INVALID` | A subscription message lacked a field the provider needs (`missingField`). | Check the indexer version; report if it is supported. |
| `MIDNIGHT_JS_PR_INDEXER_CONFIG_INVALID` | The indexer provider was given a configuration it cannot serve. | Change the configuration as the message describes. |
| `MIDNIGHT_JS_PR_INDEXER_INVARIANT_VIOLATED` | An internal guarantee of the indexer provider did not hold. | Report it as a midnight-js bug. |
| `MIDNIGHT_JS_PR_INDEXER_PAYLOAD_TOO_LARGE` | A compressed subscription message inflated beyond the size limit (possible compression bomb). | Check the indexer endpoint is trusted; report if it is. |
| `MIDNIGHT_JS_U_TAG_PARSE_FAILED` | A serialized payload's `namespace:version:` tag prefix could not be parsed. | Verify the payload came from a sanctioned source — a wallet balance response, a proof request, or a raw contract-state query. |
| `MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER` | A `switch` closed with `assertNever` was reached, so a value the compiler ruled out arrived anyway. `context` names the switch. | The union grew and this switch was not updated, or a payload was decoded from outside the build. Add the missing case at the call site `context` names. |
| `MIDNIGHT_JS_U_LEDGER8_VALUE_UNSUPPORTED` | `requireLedger9` received a value written by the v8 ledger. `context` names the call site. | The value predates the hard fork, or the network has not forked yet. Handle both eras with `switch (value.version)` closed by `assertNever`, or read a state written after the fork. |
| `MIDNIGHT_JS_U_UNRECOGNISED_ERA_TAG` | `requireLedger9` received `null`, a value with no `version`, or an era this build does not know. `context` names the call site, `received` what `version` held. | No `version` means the value came from a provider written for midnight-js before 5.0.0: update it to return era-tagged values. An unknown era means the network or the provider is newer than this midnight-js: upgrade midnight-js. |
| `MIDNIGHT_JS_U_ZK_ARTIFACT_INTEGRITY_FAILED` | A ZK artifact's hash does not match its manifest. | Do not use the artifact; re-download or rebuild it from a trusted source. |
| `MIDNIGHT_JS_U_ZK_ARTIFACT_CONTRACT_INFO_INVALID` | A compiled contract's `contract-info` file is missing or malformed. | Recompile the contract with a supported `compactc`. |
| `MIDNIGHT_JS_U_PASSWORD_INVALID` | A private-storage password does not meet the strength rules. | Choose a password that satisfies the rules in the message. |
| `MIDNIGHT_JS_U_DESERIALIZATION_FAILED` | Ledger/runtime bytes could not be decoded; `context` holds classification and mitigation. | Follow `context.mitigation`; a version mismatch usually means a midnight-js upgrade is needed. |

## Getting Help

If issues persist:

1. Check existing [GitHub Issues](https://github.com/midnightntwrk/midnight-js/issues)
2. Open a new issue with:
   - Node version (`node -v`)
   - Yarn version (`yarn -v`)
   - OS and version
   - Full error message
   - Steps to reproduce
