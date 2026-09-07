# Migration Guide v4.1.1 → v5.0.0

**Migration complexity:** Significant. This is a protocol-level major release — expect to touch any code that constructs signing keys, persists exported signing keys, or imports ledger / onchain-runtime types directly.

**This is also the release that carries a dApp across the ledger v8 to v9 hard fork.** The fork costs no further code change beyond the bump and the mechanical narrowing in [Step 13](#step-13--narrow-the-version-tagged-provider-payloads) — there is no new API to call at the boundary — but it does have timing and operational consequences, covered in [Step 14](#step-14--operating-across-the-ledger-fork). Adopt this major *before* the fork.

The required changes fall into five buckets: (0) raise your Node and TypeScript floors, (1) bump the framework, (2) move signing keys to the structured `{ tag, value }` shape, (3) re-derive any state persisted under the old protocol, and (4) ship the `compactc` integrity manifest alongside your ZK artifacts (verification is now fail-closed). Contract-event APIs and cross-contract call support are additive — adopt them only if you need them.

---

## Step 0 — Raise the Node and TypeScript floors

The published packages are now ESM-only (`"type": "module"`, one `dist/<name>.js`
per entry). Import specifiers are unchanged, but your toolchain must support
loading an ESM-only dependency:

```bash
node -v   # must be >= 22.12
```

```jsonc
// tsconfig.json — pick one
{
  "compilerOptions": {
    "module": "nodenext" // ESM project
    // "module": "node20"                              // CommonJS project, TypeScript >= 5.8
    // "module": "preserve", "moduleResolution": "bundler"  // bundler-driven project
  }
}
```

TypeScript itself must be >= 5.8. A CommonJS project keeps working — Node 22.12
resolves `require()` of an ES module — but `module: node16` and `module: node18`
refuse it at **compile** time with `TS1479`. `module: node20` is the lowest
CommonJS setting that compiles. See
[breaking-changes.md](./breaking-changes.md) for the full matrix.

---

## Step 1 — Bump the framework

```bash
yarn upgrade @midnight-ntwrk/midnight-js@5.0.0
yarn install
```

If you depend on individual sub-packages directly:

```bash
yarn upgrade \
  @midnight-ntwrk/midnight-js-contracts@5.0.0 \
  @midnight-ntwrk/midnight-js-level-private-state-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-http-client-proof-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-utils@5.0.0 \
  @midnight-ntwrk/midnight-js-protocol@5.0.0
```

---

## Step 2 — Pin the protocol packages to a single version

The v9 / v4 protocol packages are release candidates and can be pulled in transitively by other dependencies under different publications, causing duplicate-major type clashes (TS2345, `Transaction<...>` mismatches). Pin them with resolutions so the whole tree dedupes:

```jsonc
// package.json
{
  "resolutions": {
    "@midnightntwrk/ledger-v9": "1.0.0-rc.3",
    "@midnightntwrk/onchain-runtime-v4": "4.0.0-rc.3",
    "@midnight-ntwrk/platform-js": "3.0.0",
    "@midnight-ntwrk/compact-runtime": "0.18.0-rc.1"
  }
}
```

Register the new scope if you import the protocol packages anywhere (the framework already does this in `packages/protocol`):

```yaml
# .yarnrc.yml — @midnightntwrk resolves from the default public npm registry
```

> Import ledger / onchain-runtime types **only** through `@midnight-ntwrk/midnight-js-protocol/ledger` and `/onchain-runtime`. Direct imports of the old-scope packages resolve to incompatible shapes.

---

## Step 3 — Move signing keys to the structured shape

`SigningKey` is now `{ tag: 'schnorr' | 'ecdsa', value: <hex> }`.

### Constructing a signing key

```diff
  const options: ContractExecutableRuntimeOptions = {
    // ...
-   signingKey: '0102030a1b2c3d4e5f',
+   signingKey: { tag: 'schnorr', value: '0102030a1b2c3d4e5f' },
  };
```

### Comparing signing keys in tests

The key round-trips through the config layer, so the returned value is structurally equal but a new reference:

```diff
- expect(returnedKey).toBe(expectedKey);
+ expect(returnedKey).toEqual(expectedKey);
```

### Validating a signing key programmatically

```ts
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';

isValidSigningKey({ tag: 'schnorr', value: '0102030a1b2c3d4e5f' }); // true
isValidSigningKey('0102030a1b2c3d4e5f');                            // false (old string shape)
```

---

## Step 4 — Re-export or transform persisted signing-key exports

`importSigningKey` now validates the structured shape **before** any write. A v4.x export that stored a bare hex string fails with `InvalidExportFormatError`.

- **Preferred:** re-export signing keys from a v5.0.0 client.
- **Alternatively:** transform stored exports to `{ tag: 'schnorr', value: <oldHexString> }` (or `ecdsa`, per your key type) before import.

---

## Step 5 — Re-derive old-protocol state

`ContractState`'s structural tag moved `[v6]` → `[v8]`. State serialized under ledger-v8 is rejected by the version canary at deserialize time — there is no in-place migration. Re-derive contract state under the new protocol. The new classified errors make this explicit:

```ts
import { isDeserializationError } from '@midnight-ntwrk/midnight-js-utils';

try {
  // deserialize old state
} catch (error) {
  if (isDeserializationError(error) && error.classification === 'version-mismatch') {
    // re-derive under v5.0.0 protocol — see error.mitigation
  }
  throw error;
}
```

---

## Step 6 — Direct `ZswapChainState.postBlockUpdate` callers

If you call `postBlockUpdate` directly, pass the now-required `retentionDuration` (seconds of past Merkle roots to retain):

```diff
- zswapChainState.postBlockUpdate(context);
+ zswapChainState.postBlockUpdate(context, RETENTION_DURATION_SECONDS);
```

---

## Step 7 — testkit-js consumers: wallet-sdk 2.0.0-beta

If you build wallets through the testkit (all siblings on the `2.0.0-beta.2` / `4.0.0-beta.2` line):

- `createKeystore` now takes `{ kind: SignatureKind; secret: Uint8Array }` instead of a raw `Uint8Array`.
- DApp-connector adapters round-trip structured `Signature` / `SignatureVerifyingKey`; emit the `.value` (schnorr) on the wire to preserve the plain-hex contract. Update any test mocks to the structured shape.

The default `TESTKIT_DOCKER_ENV` is now `devnet`; bump local Docker image versions accordingly (proof-server / indexer / node) if you pin them.

---

## Step 8 — Adopt contract events (optional)

If you need on-chain contract events, the `PublicDataProvider` now exposes them — see [new-features.md](./new-features.md) for `queryContractEvents`, `contractEventsObservable`, and `getAllContractEvents`. If you implement `PublicDataProvider` yourself, these two methods are now **required** interface members.

> Querying/streaming works against an indexer that decodes MIP-0002 events. Contract-side **emission** requires `compactc 0.33.0-rc.1` + `compact-runtime 0.18.x`.

---

## Step 9 — Ship the ZK artifact integrity manifest

`FetchZkConfigProvider` / `NodeZkConfigProvider` now verify artifacts against `compiler/contract-manifest.json` and are **fail-closed by default** (`verify: 'require'`). Loading artifacts that are stale, partial, or missing the manifest now throws `ZkArtifactIntegrityError`.

- **Preferred:** recompile with `compactc 0.33.0-rc.1` so the `contract-manifest.json` is emitted alongside the artifacts, and ship the whole `compiler/` directory with your artifacts.
- **Harden further:** pin `expectedManifestHash` (SHA-256 of the manifest bytes) at build time to resist a coordinated swap of both the artifacts and their co-located manifest.
- **Temporary escape hatch:** set `verify: 'warn'` (or `'off'`) while you regenerate artifacts — but a digest mismatch still throws except in `'off'` mode.

```diff
- new NodeZkConfigProvider(baseDir);
+ new NodeZkConfigProvider(baseDir, { verify: 'require', expectedManifestHash: MANIFEST_SHA256 });
```

---

## Step 10 — Adopt cross-contract calls (optional)

If you make calls that span multiple deployed contracts, resolve proving artifacts through a `ZKConfigRegistry` built from one `ZKConfigProvider` per compiled contract (yours + call targets). No address registration is needed — see [new-features.md](./new-features.md). If you implement `PublicDataProvider` yourself, the new `queryBlock()` method is now a **required** interface member.

---

## Step 11 — Read MIP-0002 log events from `CallResult` (optional)

Local call results now surface their MIP-0002 log events on `CallResultPublic.events` (previously dropped). No change is required — the field is additive. To consume them, decode with the `ContractLog` helper re-exported through the barrel (no direct `compact-js` dependency needed):

```ts
import { contracts } from '@midnight-ntwrk/midnight-js';

const logs = contracts.ContractLog.decodeAll(result.public.events); // lenient — never throws
```

---

## Step 12 — Migrate to `provider(options)` factories (optional)

Positional provider constructors still work but are `@deprecated` for one release cycle. Move to the object-options form at your convenience:

```diff
- httpClientProofProvider(url, zkConfigProvider);
+ httpClientProofProvider({ url, zkConfigProvider });
```

`nodeZkConfigProvider(options)` / `fetchZkConfigProvider(options)` factory functions are also available alongside the existing classes.

---

## Step 13 — Narrow the version-tagged provider payloads

The three transaction seams carry a `version` discriminant in both directions,
and the read surface reports a `version`-discriminated record. This is the half
of 5.0.0 that type-checking will not let you defer.

Only the first call needs wrapping. Each seam's output is already the tagged
input the next one expects, so a straight pipeline changes in one place:

```diff
- const proven = await proofProvider.proveTx(unprovenTx);
+ const proven = await proofProvider.proveTx({ version: 'v9', tx: unprovenTx });
  const balanced = await walletProvider.balanceTx(proven);
  const txId = await midnightProvider.submitTx(balanced);
```

You only narrow where you need the ledger object itself. `unwrapV9` throws a
coded error rather than letting a bare `TypeError` surface from inside a WASM
call:

```typescript
import { unwrapV9 } from '@midnight-ntwrk/midnight-js-types';

const provenTx = unwrapV9(await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }), 'proveTx');
```

The read surface is a *different* union — its v8 arm carries `tx`, not
`txBytes` — so `unwrapV9` does not accept it. Both arms are records you will
receive, so handle both:

```ts
import { types, utils } from '@midnight-ntwrk/midnight-js';

const summarize = (record: types.VersionedFinalizedTxData): string => {
  switch (record.version) {
    case 'v9':
      return `native ${record.txId}`;
    case 'v8':
      return `retained ${record.txId}`;
    default:
      return utils.assertNever(record, 'summarize');
  }
};
```

Close the switch with `assertNever`. While your switch covers the union it
compiles; when a later major shrinks `LedgerVersion` to drop the retained era,
**that same line stops compiling and points at every switch that has to
change**. That is what turns the eventual removal into a compile error instead
of a runtime surprise.

Pass the second argument. `assertNever` deliberately never puts the unhandled
value into its message -- the arms of these unions carry transaction bytes and
decoded contract state, and serializing one would copy payloads into every log
that catches the error -- so the context string is the only thing that says
where the throw came from.

Do not narrow this one by throwing on anything that is not `'v9'`. A v8-era
record is a record the provider decodes and returns, not an error condition,
and a dApp that reads its own pre-fork history will meet one.

If you *implement* `WalletProvider` or `MidnightProvider`, wrap a v9-only
implementation with `createWalletProvider` / `createMidnightProvider` rather
than tagging by hand — see [breaking-changes.md 8e](./breaking-changes.md).

That is why a v8-era network is served rather than refused: the indexer
provider decodes each record with the runtime of the era that record reports,
acquiring the pre-fork runtime lazily on first use. What throws at the read
boundary is a `protocolVersion` this client cannot place on the era timeline at
all (`EraUnresolvableError`), where before it would have returned a record that
failed later inside the codec. Bytes that will not decode on the era selected
for them — whether the record disagrees with itself or your ledger package is a
different vintage than the network's — surface as `DeserializationError`,
carrying the era, the `protocolVersion`, the seam and the record on
`context.details`.

---

## Step 14 — Operating across the ledger fork

This release is the one that carries a dApp across the ledger v8 → v9 hard
fork. Everything in this step is about *timing and operations*; **there is no
further code change**. Steps 1 and 13 are the whole code migration — bump, then
narrow where the compiler tells you to. Nothing below asks you to call a new
API, branch on the network's era, or maintain a second code path.

Adopt this major **before** the fork, with enough lead time to ship it to your
users rather than merely to merge it. A build still on the previous major when
the fork lands cannot read the network afterwards, and cannot call the
contracts it deployed before it.

### Track finalization, not submit success

A transaction built against the pre-fork ledger and still in flight when the
fork applies is **rejected**. Submission succeeding is not evidence that
anything landed.

Around the fork, treat a transaction as done only once you have observed it
**finalized**. Code that treats a successful `submitTx` as completion will
report success for transactions that were dropped at the boundary.

### The stale-head error and its two-step remediation

If an operation resolves the network era, builds against it, and the fork
applies before it lands, the framework raises `StaleHeadError`
(`MIDNIGHT_JS_C_STALE_HEAD`) rather than a decode failure. The error carries
`startEra`, `freshEra`, `circuitId` and `contractAddress`, and its message
carries the remediation.

For a **call**, the remediation is two steps, in order:

1. **Confirm no finalization.** Check that the original transaction did not
   finalize. Do not skip this — see the warning below.
2. **Re-run.** Run the same call again, unchanged. It resolves the new era and
   lands on the retained-era pipeline. Your code does not change.

For a **deploy** the remediation is different and the error says so: a re-run
cannot help, because a contract built by the retained toolchain has no
post-fork deployment path. See [the runtime-deploy chapter](#runtime-deploy-chapter-factory-patterns).

> **Why step 1 is not optional.** The guidance above assumes in-flight pre-fork
> transactions are hard-rejected at the boundary. If any grace window exists, a
> bare re-run is precisely what causes double execution — both the original and
> the re-run can finalize, and both funds legs with them. Confirming
> non-finalization first is what makes the re-run safe under either behaviour.

### Runtime-deploy chapter: factory patterns

This section is linked from `Ledger8DeployOnV9Error`
(`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9`).

If your dApp deploys contract instances **at runtime** — a factory that stands
up a new contract per user, per market, per game — read this before the fork.

The retained era stays supported for **calls against contracts deployed before
the fork**. It is not supported for **new deployments** after it: a new
deployment has no pre-fork history to preserve, so there is nothing for the
retained pipeline to be preserving. Deploying a retained-toolchain artifact to
a post-fork head is refused.

In practice:

- **Obtain current-toolchain artifacts for every contract you deploy at
  runtime, before the fork.** Recompile and ship those artifacts with your
  build.
- Contracts you deployed *before* the fork are unaffected — they keep working
  through the same call sites.
- A dApp that only calls already-deployed contracts is not affected by this
  section at all.

The failure this exists to prevent is a factory that works right up to the fork
and then cannot create anything, with artifacts that take a release cycle to
replace.

### The retained toolchain stays where it is

You do not install a second Compact toolchain, and you do not add the retained
ledger or runtime packages to your own dependencies. The framework carries what
it needs for the retained era internally and loads it only when a retained-era
operation actually happens.

If the retained runtime is in your dependency tree because you put it there,
remove it. Two copies of it in one process is what
`MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH` reports, and its message names the
exact packages to trace with your package manager's `why` command. One
duplicate is easy to create by accident: the package is published under **two
npm scopes** during the scope migration, and depending on both names is itself
a duplicate that no resolver can dedupe.

### Bundlers

Two things to know if you build for the browser.

**The retained era is a lazy chunk.** The framework reaches its retained-era
code through a dynamic `import()`, so a session that never touches a pre-fork
contract never loads it. Bundlers can defeat that — an aggressive configuration
may inline the dynamic import back into the main chunk, or emit a
`modulepreload` for it, and you silently pay for the retained runtime on every
page load. Check your build output for a separate chunk and confirm it is
neither inlined nor preloaded. Do not assume the dynamic import survived your
bundler's defaults.

**Do not let the retained runtime be instantiated twice.** Two copies in one
bundle — usually through a duplicate transitive dependency — means objects
minted by one are rejected by the other, because the WASM binding checks class
identity. Deduplicate rather than working around it.

See also [Vite WASM resolution](../../guides/vite-wasm-resolution.md).

### ZKIR-v2 support is not sunsetting

Contracts compiled with the retained toolchain remain transactable on the
network indefinitely; upstream has not announced a sunset. The retained-era
support in *this framework* is a separate question and is scheduled for removal
in the next major after the window closes — announced from day one so it is
something you can plan around rather than a surprise. When that removal lands,
`LedgerVersion` shrinks and every switch you closed with `assertNever` fails to
compile at exactly the lines that need attention.

### A security note on retrying

If one contract produces repeated, unexplained failures — executions that pass
their pre-checks and then fail, or submissions that are consistently doomed —
**stop retrying it** and investigate.

Retrying in that situation is not free. The framework reads contract state from
the indexer, and the integrity of that read is bounded by the node's own
rejection of a bad transaction rather than by an independent cross-check. A
retry loop against one contract is the shape that turns that into a usable
oracle. Back off and look at why, rather than looping.

### Error codes

Every coded error, with what happened and what to do, is listed in
[TROUBLESHOOTING.md](../../../TROUBLESHOOTING.md#midnightjs-error-codes).
Discriminate on one with `hasErrorCode(error, code)`; for the errors whose
*payload* you need to read — `ComposeFailedError.stage`,
`Ledger8RuntimeMissingError.subpath`, `UnknownLedgerVersionError.requestedVersion`
— catch by class instead, since `hasErrorCode` narrows only to
`Error & { code }`.

### Still pending at the time of writing

Named here rather than omitted, so the gaps are visible.

**Operator requirements.** The proof server is fork-prepared: a dual-capable
server is available before the fork, one configured endpoint serves the whole
window, and the retained-era path reuses your existing proof-provider
configuration unchanged. You do **not** configure a second endpoint. *Pending:*
the exact minimum proof-server version with dual support, and the supported
delivery API for retained pre-fork key material. If you operate your own proof
server, treat this as incomplete and check for an updated guide before the
fork rather than assuming the version you run today suffices.

**Minimum wallet version.** Crossing the fork without a code change holds end to
end only if the wallet your dApp connects to also crosses it. *Pending:* the
minimum wallet version, gated on wallet-side state migration that is not yet
delivered. Until it is stated, do not assume any particular wallet build
carries a dApp across the boundary.

**DApp-connector proving.** dApps that prove through the wallet connector
rather than through a configured proof server do not yet have a stated
fork-crossing story, and no section of this guide covers them. *Pending: a
scope ruling.* If you prove through the connector, treat this as an open
question to raise, not as an omission that implies "it just works".

---

## Verification checklist

- [ ] Node >= 22.12 and TypeScript >= 5.8 with `module` `node20` / `nodenext`, or `moduleResolution: bundler`.
- [ ] `yarn install` clean with the resolutions in place (no duplicate ledger-v9 majors).
- [ ] `yarn build` and `yarn lint` succeed.
- [ ] All signing-key construction sites use the `{ tag, value }` shape.
- [ ] Persisted signing-key exports re-exported or transformed.
- [ ] No direct imports of old-scope ledger / onchain-runtime packages (ESLint `no-restricted-imports` is clean).
- [ ] Old-protocol contract state re-derived or guarded by `isDeserializationError`.
- [ ] ZK artifacts recompiled with `compactc 0.33.0-rc.1`; `compiler/contract-manifest.json` shipped so integrity verification passes (`ZkArtifactIntegrityError` clean).
- [ ] Every `proveTx` / `balanceTx` / `submitTx` call site sends a version-tagged payload and narrows the result.
- [ ] Every `watchForTxData` / `watchForDeployTxData` call site narrows on `record.version`.
- [ ] Any in-house `WalletProvider` / `MidnightProvider` implementation compiles against the tagged interfaces (or is wrapped with the `create*Provider` adapters).
- [ ] Every `switch` on `record.version` is closed with `assertNever`, so the eventual retained-era removal is a compile error.
- [ ] Released to users before the fork, not merely merged before it.
- [ ] Completion is measured by finalization, not by submit success.
- [ ] `StaleHeadError` handled: confirm non-finalization, then re-run.
- [ ] Contracts deployed at runtime have current-toolchain artifacts shipped.
- [ ] Bundle checked: retained-era chunk separate, not preloaded, retained runtime not duplicated.
- [ ] Checked back for the pending operator, wallet and connector-proving sections.
