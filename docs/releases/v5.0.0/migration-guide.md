# Migration Guide v4.1.1 → v5.0.0

**Migration complexity:** Significant. This is a protocol-level major release — expect to touch any code that constructs signing keys, persists exported signing keys, or imports ledger / onchain-runtime types directly.

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
`txBytes` — so `unwrapV9` does not accept it. Use a switch:

```typescript
const record = await publicDataProvider.watchForTxData(txId);
if (record.version !== 'v9') {
  throw new Error(`unexpected ledger era: ${record.version}`);
}
// record is FinalizedTxData here
```

If you *implement* `WalletProvider` or `MidnightProvider`, wrap a v9-only
implementation with `createWalletProvider` / `createMidnightProvider` rather
than tagging by hand — see [breaking-changes.md 8e](./breaking-changes.md).

Pointing the indexer provider at a network outside the node 2.x range now
throws at the read boundary (`EraUnsupportedError` / `EraUnresolvableError`)
instead of returning a record that fails later inside the codec.

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
