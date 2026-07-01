# Breaking Changes v4.1.1 → v5.0.0

v5.0.0 is a protocol-level major release. The breaking surface concentrates in three areas: the **protocol bindings** (new packages, new scope), the **`SigningKey` representation**, and **on-chain state compatibility**.

---

## 1. Protocol bindings moved to ledger-v9 / onchain-runtime-v4 (`@midnightntwrk` scope) (#970)

`@midnight-ntwrk/midnight-js-protocol` re-exports new packages under a **new npm scope**:

| Subpath | Before | After |
|---------|--------|-------|
| `@midnight-ntwrk/midnight-js-protocol/ledger` | `@midnight-ntwrk/ledger-v8@8.1.0` | `@midnightntwrk/ledger-v9@1.0.0-rc.2` |
| `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` | `@midnight-ntwrk/onchain-runtime-v3@3.0.0` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.2` |

Coordinated companions: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.17.102-dev.82a6b7c83060d9566e57aa496a33ed80289a7257`, `compactc 0.32.102`.

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

The Configuration layer maps the object to the `KEYS_SIGNING` / `KEYS_SIGNINGKIND` config values. Because the key round-trips through the config layer (object → config → object), the returned key is structurally equal but a new reference — compare by value (`toEqual`), not identity (`toBe`).

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

## 5. `@midnightntwrk/wallet-sdk` 2.0.0-canary (testkit-js) (#970)

The testkit wallet stack moved to the 2.0.0 major canary line, aligning siblings to avoid duplicate majors (all on the `20260623092110-2f10bcf` canary):

- `@midnightntwrk/wallet-sdk` `1.2.0` → `2.0.0-canary.20260623092110-2f10bcf`
- `@midnightntwrk/wallet-sdk-prover-client` `^1.2.3` → `2.0.0-canary.20260623092110-2f10bcf`
- `@midnightntwrk/wallet-sdk-address-format` `^3.1.2` → `4.0.0-canary.20260623092110-2f10bcf`

`createKeystore` now takes `{ kind: SignatureKind; secret: Uint8Array }` instead of a raw `Uint8Array`. This affects consumers building wallets through the testkit fluent builder.

---

## Non-breaking additions worth noting

- `dispose()` is exposed on the concrete `IndexerPublicDataProvider` returned by the factory (#961). It is **not** a member of the shared `PublicDataProvider` interface, so existing interface implementations are unaffected.
- The new `queryContractEvents` / `contractEventsObservable` methods are **required** members of the `PublicDataProvider` interface; the framework's `IndexerPublicDataProvider` provides them. If you implement `PublicDataProvider` yourself, this is a required-method addition that will fail to type-check until you add both — see [api-changes.md](./api-changes.md).
