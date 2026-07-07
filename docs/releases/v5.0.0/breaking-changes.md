# Breaking Changes v4.1.1 → v5.0.0

v5.0.0 is a protocol-level major release. The breaking surface concentrates in four areas: the **protocol bindings** (new packages, new scope), the **`SigningKey` representation**, **on-chain state compatibility**, and **ZK artifact integrity verification** (now fail-closed by default).

---

## 1. Protocol bindings moved to ledger-v9 / onchain-runtime-v4 (`@midnightntwrk` scope) (#970)

`@midnight-ntwrk/midnight-js-protocol` re-exports new packages under a **new npm scope**:

| Subpath | Before | After |
|---------|--------|-------|
| `@midnight-ntwrk/midnight-js-protocol/ledger` | `@midnight-ntwrk/ledger-v8@8.1.0` | `@midnightntwrk/ledger-v9@1.0.0-rc.2` |
| `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` | `@midnight-ntwrk/onchain-runtime-v3@3.0.0` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.2` |

Coordinated companions: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.18.0-rc.0`, `@midnight-ntwrk/compact-js@2.5.5-rc.5`, `compactc 0.33.0-rc.0`.

**Impact:** Any code importing ledger / onchain-runtime types should do so **only** through the protocol package's subpath re-exports — direct imports of the old-scope packages are flagged by ESLint (`no-restricted-imports`) and resolve to incompatible type shapes.

**Note on scope:** the protocol packages now live under `@midnightntwrk/*` (no hyphen), distinct from the framework packages which remain `@midnight-ntwrk/midnight-js-*` (hyphenated). Mixing a transitively-resolved copy of ledger-v9 from a different publication causes duplicate-major type clashes — pin a single version (see the migration guide's resolutions).

---

## 2. `SigningKey` is now a structured object (#970)

`SigningKey` changes from a **plain hex string** to a **structured object**:

```ts
// Before (v4.x)
type SigningKey = string; // hex

// After (v5.0.0)
type SigningKey = { tag: 'schnorr' | 'ecdsa'; value: string /* hex */ };
```

### 2a. `ContractExecutableRuntimeOptions.signingKey`

```diff
  const options: ContractExecutableRuntimeOptions = {
    // ...
-   signingKey: '0102030a1b2c3d4e5f',
+   signingKey: { tag: 'schnorr', value: '0102030a1b2c3d4e5f' },
  };
```

The Configuration layer maps the object to the `KEYS_SIGNING` / `KEYS_SIGNING_KIND` config values. Because the key round-trips through the config layer (object → config → object), the returned key is structurally equal but a new reference — compare by value (`toEqual`), not identity (`toBe`).

> **Note (#999):** the kind key is `KEYS_SIGNING_KIND` (with a word-separating underscore). An earlier build wrote `KEYS_SIGNINGKIND`, which the config reader never matched — `signingKind` silently fell back to `schnorr` and any ECDSA key was downgraded. Fixed in v5.0.0.

### 2b. Signing-key import / export validation

`importSigningKey` (LevelDB and the testkit in-memory provider) now validates the **structured shape** before any write:

- non-null object,
- `tag` ∈ `{ 'schnorr', 'ecdsa' }`,
- `value` an even-length hex string of length ≥ 6.

A v4.x export that stored a bare hex string will fail import with `InvalidExportFormatError`. Re-export signing keys from a v5.0.0 client, or transform stored exports to the structured shape before import.

The shared predicate is exported as `isValidSigningKey` from `@midnight-ntwrk/midnight-js-utils`.

### 2c. DApp-connector wallet adapter (testkit)

`signData()` / `getPublicKey()` now return structured `Signature` / `SignatureVerifyingKey`. The DApp-connector API still expects hex strings on the wire, so the adapter emits the `.value` (schnorr) — matching the previous plain-hex contract. Custom adapters mirroring this surface must adopt the structured shape internally.

---

## 3. `ContractState` structural version bumped `[v6]` → `[v8]` (#970)

ledger-v9 raises the structural `ContractState` tag from `[v6]` to `[v8]`. State serialized under the old protocol now triggers a **version-mismatch** error instead of silently deserializing. There is no in-place migration for persisted old-protocol state — it must be re-derived under the new protocol.

---

## 4. `ZswapChainState.postBlockUpdate` requires `retentionDuration` (#970)

ledger-v9 makes `retentionDuration` (seconds of past Merkle roots to retain) a **required** argument. The old single-argument call now throws `retention_duration is out of range`. If you call `postBlockUpdate` directly, supply the retention duration explicitly.

---

## 5. `@midnightntwrk/wallet-sdk` 2.0.0-beta (testkit-js) (#970, #967)

The testkit wallet stack moved to the 2.0.0 major beta line, aligning siblings to avoid duplicate majors:

- `@midnightntwrk/wallet-sdk` `1.2.0` → `2.0.0-beta.1`
- `@midnightntwrk/wallet-sdk-prover-client` `^1.2.3` → `2.0.0-beta.1`
- `@midnightntwrk/wallet-sdk-address-format` `^3.1.2` → `4.0.0-beta.1`

`createKeystore` now takes `{ kind: SignatureKind; secret: Uint8Array }` instead of a raw `Uint8Array`. This affects consumers building wallets through the testkit fluent builder.

---

## 6. ZK artifacts verified against the `compactc` integrity manifest (#1015)

`FetchZkConfigProvider` and `NodeZkConfigProvider` now verify each ZK artifact against the `compactc`-emitted `contract-manifest.json` (in the artifact base's `compiler/` directory). The default mode is **fail-closed** (`verify: 'require'`):

```diff
- // v4.x: artifacts loaded without integrity checks
+ // v5.0.0: default 'require' — a missing manifest or a digest mismatch throws ZkArtifactIntegrityError
  const zkConfigProvider = new NodeZkConfigProvider(baseDir);
```

**Impact:** a deployment whose local artifacts are stale, partial, or missing the `contract-manifest.json` will now throw `ZkArtifactIntegrityError` at load time instead of proceeding with unverified artifacts.

Opt down or pin explicitly through the constructor option bag (`ZkConfigIntegrityOptions`):

```ts
new NodeZkConfigProvider(baseDir, {
  verify: 'warn',                 // 'require' (default) | 'warn' | 'off'
  onWarn: (msg) => logger.warn(msg),
  expectedManifestHash: MANIFEST_SHA256, // pin to resist a coordinated artifact+manifest swap
});
```

A digest mismatch always throws (except in `'off'` mode). Only `expectedManifestHash` (SHA-256 of the manifest bytes, pinned at build time) defends against an adversary who can rewrite both the artifacts and their co-located manifest.

---

## Non-breaking additions worth noting

- **Cross-contract call support** (#967) is additive: `ZKConfigRegistry` (types), the `ContractKeyLocation` grammar re-export, and the new `PublicDataProvider.queryBlock()` "as-of" endpoint. `queryBlock` is a new required member of the `PublicDataProvider` interface — custom implementations must add it (see [api-changes.md](./api-changes.md)).
- `dispose()` is exposed on the concrete `IndexerPublicDataProvider` returned by the factory (#961). It is **not** a member of the shared `PublicDataProvider` interface, so existing interface implementations are unaffected.
- The new `queryContractEvents` / `contractEventsObservable` methods are **required** members of the `PublicDataProvider` interface; the framework's `IndexerPublicDataProvider` provides them. If you implement `PublicDataProvider` yourself, this is a required-method addition that will fail to type-check until you add both — see [api-changes.md](./api-changes.md).
