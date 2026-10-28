# Breaking Changes v4.1.1 → v5.0.0

v5.0.0 is a protocol-level major release. The breaking surface concentrates in five areas: the **protocol bindings** (new packages, new scope), the **`SigningKey` representation**, **on-chain state compatibility**, **ZK artifact integrity verification** (now fail-closed by default), and **ESM-only packaging**.

---

## 1. Protocol bindings moved to ledger-v9 / onchain-runtime-v4 (`@midnightntwrk` scope) (#970)

`@midnight-ntwrk/midnight-js-protocol` re-exports new packages under a **new npm scope**:

| Subpath | Before | After |
|---------|--------|-------|
| `@midnight-ntwrk/midnight-js-protocol/ledger` | `@midnight-ntwrk/ledger-v8@8.1.0` | `@midnightntwrk/ledger-v9@1.0.0-rc.3` |
| `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` | `@midnight-ntwrk/onchain-runtime-v3@3.0.0` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.3` |

Coordinated companions: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.18.0-rc.1`, `@midnight-ntwrk/compact-js@2.5.5-rc.7`, `compactc 0.33.0-rc.1`.

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
-   signingKey: keyHex, // 64 hex characters (32 bytes)
+   signingKey: { tag: 'schnorr', value: keyHex },
  };
```

The Configuration layer maps the object to the `KEYS_SIGNING` / `KEYS_SIGNING_KIND` config values. Because the key round-trips through the config layer (object → config → object), the returned key is structurally equal but a new reference — compare by value (`toEqual`), not identity (`toBe`).

> **Note (#999):** the kind key is `KEYS_SIGNING_KIND` (with a word-separating underscore). An earlier build wrote `KEYS_SIGNINGKIND`, which the config reader never matched — `signingKind` silently fell back to `schnorr` and any ECDSA key was downgraded. Fixed in v5.0.0.

### 2b. Signing-key import / export validation

`importSigningKeys` (LevelDB and the testkit in-memory provider) now validates the **structured shape** before any write:

- non-null object,
- `tag` ∈ `{ 'schnorr', 'ecdsa' }`,
- `value` exactly 64 hex characters (32 bytes, the only size the runtime accepts for either kind).

A v4.x export that stored a bare hex string will fail import with `InvalidExportFormatError`. Re-export signing keys from a v5.0.0 client, or transform stored exports to the structured shape before import.

Signing keys already in a level private-state store (bare 64-character hex strings written by v4.x) are read in the new shape automatically; only export files made by v4.x need this step. A stored entry that is neither shape throws `StoredSigningKeyFormatError`, exported from `@midnight-ntwrk/midnight-js-level-private-state-provider`.

`isValidSigningKey` is now a type guard (`value is SigningKey`).

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

- `@midnightntwrk/wallet-sdk` `1.2.0` → `2.0.0-beta.2`
- `@midnightntwrk/wallet-sdk-prover-client` `^1.2.3` → `2.0.0-beta.2`
- `@midnightntwrk/wallet-sdk-address-format` `^3.1.2` → `4.0.0-beta.2`

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
  verify: 'require-if-present',    // 'require' (default) | 'require-if-present' | 'warn' | 'off'
  onWarn: (msg) => logger.warn(msg),
  expectedManifestHash: MANIFEST_SHA256, // pin to resist a coordinated artifact+manifest swap
});
```

`compactc` only began emitting the manifest in 0.33, so artifacts compiled by an earlier toolchain cannot satisfy `require` however intact they are. `require-if-present` is the mode for them: a wholly absent manifest warns, but a manifest that does exist must cover the artifact, so a missing entry throws. That makes it strictly stronger than `warn`, which tolerates a missing entry in a manifest that is present, and it starts verifying in full the moment the artifacts are recompiled on 0.33 or later.

A digest mismatch always throws (except in `'off'` mode). Only `expectedManifestHash` (SHA-256 of the manifest bytes, pinned at build time) defends against an adversary who can rewrite both the artifacts and their co-located manifest.

---

## 7. Published packages are ESM-only (#1173)

Every published package now declares `"type": "module"` and ships a single
JavaScript build per entry. The `main` / `module` fields are gone and each
`exports` subpath resolves to one file:

```jsonc
// Before (v4.1.1): dual format
{
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "exports": {
    ".": {
      "types": { "import": "./dist/index.d.mts", "require": "./dist/index.d.cts" },
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}

// After (v5.0.0): ESM only
{
  "type": "module",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  }
}
```

Subpath **keys** are unchanged, so no import specifier in your code has to move.
`@midnight-ntwrk/midnight-js-protocol/ledger` and friends still resolve.

**Impact — you need both of these:**

| Requirement | Why |
|-------------|-----|
| **Node >= 22.12** | Where `require(esm)` works unflagged, so a CommonJS consumer can still load these packages. `engines.node` is now `>=22.12`. |
| **TypeScript >= 5.8** with a `module` setting that knows about `require(esm)` | Older module settings refuse the import at compile time even though the runtime call succeeds. |

A CommonJS TypeScript consumer keeps working at runtime, but only some `module`
settings **compile**. Verified against tsc 6.0.3 with a CommonJS consumer file
importing `@midnight-ntwrk/midnight-js/utils` and
`@midnight-ntwrk/midnight-js-protocol/ledger`:

| `module` | `moduleResolution` | Result |
|----------|--------------------|--------|
| `node16` | `node16` | `TS1479` |
| `node18` | (default) | `TS1479` |
| `node20` | (default) | compiles |
| `nodenext` | `nodenext` | compiles |
| `preserve` | `bundler` | compiles |
| `commonjs` | `node10` | `TS5107` (`node10` is no longer supported in TypeScript 6) |

`module: node20` was introduced in TypeScript 5.8 precisely to model Node's
`require(esm)`, which is why it is the lowest CommonJS setting that works. The
failure on `node16` / `node18` reads:

```
error TS1479: The current file is a CommonJS module whose imports will produce
'require' calls; however, the referenced file is an ECMAScript module and cannot
be imported with 'require'.
```

Deep imports into build output were never part of the published surface and are
now refused by Node with `ERR_PACKAGE_PATH_NOT_EXPORTED`; import through a
declared subpath instead.

## 8. Version-tagged payloads at the provider methods and on the read surface (#1204)

For the ledger-fork window every version-divergent payload became a closed,
`version`-discriminated union, so a caller cannot reach the wrong era's payload
without defeating the type system. See
[ADR 0006](../../adr/0006-version-tagged-payloads-at-provider-seams.md).

### 8a. The three transaction methods

`ProofProvider.proveTx`, `WalletProvider.balanceTx` and
`MidnightProvider.submitTx` now take a version-tagged payload, and `proveTx`
and `balanceTx` return one. `submitTx` still returns a bare `TransactionId`,
which is era-independent.

```typescript
// before
const proven = await proofProvider.proveTx(unprovenTx);

// after
const provenTx = unwrapLedger9(
  await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }),
  'proveTx'
);
```

`unwrapLedger9` is exported from `@midnight-ntwrk/midnight-js-types`. Narrowing by
hand works too, but do not write `if (p.version !== 'v9') throw new Error(...)`:
that produces an error with no `code`, and misreports a future era as
"expected v9". `unwrapLedger9` throws `Ledger8PayloadUnsupportedError` for a v8 payload
and `UntaggedPayloadError` when `version` is missing, both carrying a stable
`code` you can match with `hasErrorCode`.

**If you implement these interfaces yourself**, this is the breaking half that
type-checking will not let you defer: return types are covariant, so an
implementation still returning `Promise<FinalizedTransaction>` does not satisfy
the new `Promise<VersionedFinalizedTransaction>`. Narrow the incoming payload
with `unwrapLedger9(tx, 'balanceTx')` and tag what you return as
`{ version: 'v9', tx }`. Third-party providers must be on a matching version.

### 8b. `FinalizedTxData` gained a required `version` field

`FinalizedTxData` now carries `readonly version: 'v9'`, and its other 13 fields
moved to a shared `FinalizedTxRecord` base. Any code that *constructs* a
`FinalizedTxData` — including test fixtures and custom `PublicDataProvider`
implementations — must set it.

### 8c. The read surface reports both eras

`PublicDataProvider.watchForTxData` and `watchForDeployTxData` now return
`VersionedFinalizedTxData`, the closed union of `FinalizedTxData`
(`version: 'v9'`) and the new `Ledger8FinalizedTxData`. Narrow on `version` before
reading `tx`:

```typescript
const record = await publicDataProvider.watchForTxData(txId);
switch (record.version) {
  case 'v9':
    return record.tx;              // live v9 ledger object
  case 'v8':
    return toMyShape(record.tx);   // v8 ledger object, already decoded
}
```

`submitTx` in `midnight-js-contracts` resolves `VersionedFinalizedTxData`, tagged
with the era of the network head it ran on (see
[14c](#14c-submittx-routes-on-the-network-head)). A record from another era is
reported as `EraInvariantViolationError`, which carries the `method`, the
`circuitId` where the flow knows it, and the `txId` of the transaction it already
submitted.

`findDeployedContract` accepts a deploy record from either era, because a
contract deployed before the fork keeps a ledger-8 deploy record.
`FoundContract.deployTxData.public` is therefore `FoundDeployTxPublicData`, a
union tagged by `version`. `contractAddress` is on both variants. Narrow on
`version` before reading `tx` or `initialContractState`; the `v8` variant has no
`initialContractState`. Code that does any of the following without narrowing no
longer compiles: reads `found.deployTxData.public.initialContractState`, uses
`found.deployTxData.public.tx` as a v9 `Transaction`, or passes
`found.deployTxData` where a `FinalizedDeployTxDataBase<C>` is expected.
`DeployedContract` is unchanged.

`indexerPublicDataProvider` produces both variants. It decodes each record with the
ledger runtime of the era that record's own `protocolVersion` reports, so a
v8-era record arrives as a **value** on the `'v8'` variant, not as a thrown error.
The pre-fork runtime is acquired lazily on first use, so a session that never
meets a v8-era record never instantiates that WASM. Narrowing on `version` is
therefore not a formality: the two variants carry transaction objects built by
different runtimes, and neither runtime's object can be handed to the other.

### 8d. `version` is derived, not asserted

`indexerPublicDataProvider` resolves `version` from each record's own
`protocolVersion` via the resolver in `@midnight-ntwrk/midnight-js-protocol`,
and that same answer decides which ledger runtime decodes the record — so the
discriminant, the decoder that ran and the `protocolVersion` beside it are one
fact and cannot disagree.

Consequence: a v8-era network is now **served**, on the `'v8'` variant. What throws
at the read boundary is a network this client cannot place on the era timeline
at all — `UnknownRecordEraError`, for a node 0.x or otherwise unmapped
`protocolVersion` — where before it returned a record that failed later inside
the codec, with nothing in the message naming the era.

Bytes that will not decode on the era selected for them are **not** re-reported
as an era disagreement. They surface as the `DeserializationError` the runtime
produced, now carrying the era, the raw `protocolVersion`, the provider method and the
record on `context.details`. The provider deliberately makes no claim about
which side is at fault: a self-contradicting record and a
`@midnightntwrk/ledger`-vN in your dApp of a different vintage than the
network's produce the same diagnosis from here, and that error's own mitigation
("align the version … with the protocol version of the network and indexer")
addresses both. A `raw` field that is not a whole hex byte string is still
refused as `IndexerDataError` before any decoder sees it.

`UnknownRecordEraError` and `DecoderEraUnsupportedError`
are both `IndexerError` subclasses, and each carries the raw `protocolVersion`
plus the transaction id or contract address being read. Two failures a read can
raise are deliberately **not** `IndexerError`s, so "catch any indexer error with
one `instanceof IndexerError` check" needs one qualification: `DeserializationError`
(`midnight-js-utils`), which already escaped it before this release, and
`Ledger8RuntimeMissingError` (`midnight-js-protocol`), raised when the pre-fork
runtime cannot be acquired for a v8-era record. Both report something that is
not an indexer fault — bad bytes and a broken local install respectively — and
wrapping either would send you looking at the wrong thing. Catch broadly and
branch, or match on `code` with `hasErrorCode`.

### 8e. Implementing `WalletProvider` or `MidnightProvider`

Return types are covariant, so an implementation still resolving a bare
`FinalizedTransaction` no longer satisfies `WalletProvider`. TypeScript reports
the *parameter* mismatch first, so the error you see names the ledger methods
`Ledger8TransactionBytes` lacks rather than the missing tag — it is still this change.

Rather than tagging by hand, wrap a v9-only implementation:

```typescript
import { createMidnightProvider, createWalletProvider } from '@midnight-ntwrk/midnight-js-types';

const walletProvider = createWalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceAndProveTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});

const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx));
```

Both narrow the inbound payload and tag the outbound one, so the `version`
discriminant never appears in your code.

### 8f. The three providers gained a required `supportedEras` field (#1004)

`ProofProvider`, `WalletProvider` and `MidnightProvider` each declare which
ledger eras that instance serves:

```typescript
readonly supportedEras: readonly LedgerVersion[];
```

It is REQUIRED, so an implementation that does not have it stops compiling. The
framework reads all three before an operation starts and refuses a set that
cannot carry the transaction end to end — with `ProviderEraUnsupportedError`
(`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`), before any proof is requested, rather
than at `balanceTx` after one has been paid for.

**If you use `createProofProvider`, `createWalletProvider` or
`createMidnightProvider`, you need to change nothing.** Each lifts a v9-only
implementation and now declares `['v9']` for you.

**If you implement one of these providers directly**, add the field and list exactly what you
serve:

```typescript
const midnightProvider: MidnightProvider = {
  supportedEras: ['v9'],
  submitTx: (tx) => wallet.submitTransaction(unwrapLedger9(tx, 'submitTx'))
};
```

**If you serve more than one era**, write one handler per era instead and let
the factory compute the declaration:

```typescript
import { createProofProviderFromHandlers } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = createProofProviderFromHandlers({
  currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
  retainedEras: { v8: (txBytes) => proveLedger8Transaction(txBytes, provingProvider) }
});
```

The factory routes each request to its era's handler, tags the answer as the era
the request carried, and raises `Ledger8PayloadUnsupportedError` for an era you did
not supply a handler for — the same error the un-widened provider raised before.
`retainedEras` cannot name the current era: a current-era transaction is passed to the
provider as a live ledger object, not as bytes, so registering a handler for it is a compile error.

Nothing verifies the declaration. Listing an era you do not serve makes the
failure later, not absent: the provider still narrows its own payload and still
raises `Ledger8PayloadUnsupportedError`.

See [ADR 0014](../../adr/0014-build-provider-seams-from-per-era-handlers.md).

### 8g. New and changed exports

**`@midnight-ntwrk/midnight-js-types`** — added: `FinalizedTxRecord`,
`Ledger8FinalizedTxData`, `VersionedFinalizedTxData`, `Ledger8TransactionBytes`, `Ledger9Transaction`,
`VersionedTransaction`, `VersionedUnprovenTransaction`, `VersionedUnboundTransaction`,
`VersionedFinalizedTransaction`, `TransactionMethod`, `ReadMethod`, `ProviderMethod`,
`unwrapLedger9`, `Ledger8PayloadUnsupportedError`, `UntaggedPayloadError`,
`Ledger9WalletProvider`, `createWalletProvider`, `createMidnightProvider`,
`ProviderEraUnsupportedError`, `assertProvidersSupportEra`, `TransactionProviders`,
`EraDeclaringProvider`, `RetainedEraEntries`, `EraRequest`, `erasServedBy`,
`narrowToEra`, `createProofProviderFromHandlers`, `createWalletProviderFromHandlers`,
`createMidnightProviderFromHandlers`, `ProofProviderHandlers`, `WalletProviderHandlers`,
`MidnightProviderHandlers`, `Ledger9Prover`, `RetainedEraProver`,
`Ledger9Balancer`, `RetainedEraBalancer`, `Ledger9Submitter`,
`RetainedEraSubmitter`. Changed: `FinalizedTxData` gained `version: 'v9'`;
`ProofProvider`, `WalletProvider` and `MidnightProvider` each gained a required
`supportedEras`.

**`@midnight-ntwrk/midnight-js-protocol`** — added: `CURRENT_LEDGER_VERSION`,
`CurrentLedgerVersion`, `RETAINED_LEDGER_VERSIONS`, `RetainedLedgerVersion`, on
the barrel and on the `./version` subpath.

**`@midnight-ntwrk/midnight-js-types`** — added: `PROVIDER_ERROR_CODES` and
`ProviderErrorCode`, on the barrel and on a new `./errors` leaf subpath. That
subpath imports nothing, so reading a code string does not pull `effect` or the
protocol ledger namespace the way the root barrel does.

**`@midnight-ntwrk/midnight-js-utils`** — added: `hasErrorCode`,
`hasForeignErrorCode`, `MIDNIGHT_JS_ERROR_CODES`, `MidnightJsErrorCode`,
`CONTRACTS_ERROR_CODES`, `ContractsErrorCode`, `PROVIDER_ERROR_CODES`,
`ProviderErrorCode`. `PROVIDER_ERROR_CODES` and `ProviderErrorCode` are declared
in `midnight-js-types` and re-exported here, so both import paths work.

`hasErrorCode(error, code)` does **not** accept an arbitrary string as `code`:
it takes `C extends MidnightJsErrorCode`, so a misspelled code is a compile
error instead of a guard that silently never matches. Compare against a code
this framework does not own with `hasForeignErrorCode`, which refuses one of our
own codes at compile time and throws on anything carrying the `MIDNIGHT_JS_`
prefix — a misspelling of one of ours lands there, and answering `false` would
put the silent guard back.

**`@midnight-ntwrk/midnight-js-contracts`** — added:
`EraInvariantViolationError` (code `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION`,
carries `method`, typed `ProviderMethod` from `midnight-js-types`, and optional
`circuitId`).

**`@midnight-ntwrk/midnight-js-indexer-public-data-provider`** — added:
`UnknownRecordEraError` (`MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA`) and
`DecoderEraUnsupportedError` (`MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED`), both `IndexerError`
subclasses. `DecoderEraUnsupportedError` is a guard rather than an era policy: the
per-record decoder table is total over the eras this client ships runtimes for,
so within one build it cannot be raised. It is reachable across builds — an
installed `midnight-js-protocol` newer than this provider package resolves an
era whose decoder this build predates.

Catch any of these by code with `hasErrorCode(error, CODE)` from
`midnight-js-utils` rather than by `instanceof` across a package boundary.

---

## 9. `BlockInfo` gained a required `protocolVersion` field (#1395)

`BlockInfo`, returned by `PublicDataProvider.queryBlock()`, now carries
`readonly protocolVersion: number` — the protocol-version integer the block was
produced under, which dates it to a ledger era. Any code that *constructs* a
`BlockInfo` — test fixtures and custom `PublicDataProvider` implementations —
must set it. Code that only reads a `BlockInfo` is unaffected.

Resolve it with `versionOfRecord(block)` from
`@midnight-ntwrk/midnight-js-protocol`. Implementations must report the era of
*that* block, never the network head's, so a block read from before a hard fork
keeps reporting the era it was produced in.

`queryBlock` itself is new in 5.0.0, so a consumer who never implemented the
interface sees only an added field. The break lands on anyone who wrote an
implementation or a test double against `5.0.0-rc.0` / `5.0.0-rc.1`, where the
type had two fields.

---

## 10. Contract-state and balance streams emit `PositionedRecord<T>` (#1399)

`PublicDataProvider.contractStateObservable`, `rawContractStateObservable` and
`unshieldedBalancesObservable` now emit `PositionedRecord<T>` instead of the bare
value:

```ts
type PositionedRecord<T> = {
  readonly value: T;           // what the stream emitted before
  readonly blockHeight: number; // the block that carried the value
  readonly blockHash: BlockHash;
};
```

- **Consumers:** read `record.value` where you read the emitted value before.
- **Custom `PublicDataProvider` implementations:** the three members return
  `Observable<PositionedRecord<T>>`.

The position lets a consumer resume a stream after a restart: pass
`{ type: 'blockHeight', blockHeight: record.blockHeight }` (or the `blockHash`
form) as the config. With `inclusive` unset or `true` the stream resumes at that
block, so values from it may arrive again but none after it is skipped.
`contractEventsObservable` is unchanged; it already resumes from
`ContractEvent.id`.

---

## 11. `MidnightConfig` on `MidnightProviders` replaces the global network id and the fixed TTL (#982)

`MidnightProviders` has a new **required** member:

```ts
interface MidnightConfig {
  readonly networkId: NetworkId; // e.g. 'preview', 'undeployed'
  readonly ttlSeconds: number;   // positive whole number of seconds
}

interface MidnightProviders {
  // ... existing providers ...
  readonly config: MidnightConfig;
}
```

- **Network id:** every transaction the framework builds (deploy, call, governance,
  both ledger eras) uses `config.networkId`. The framework no longer reads
  `getNetworkId()`, and there is no fallback to it. A leftover `setNetworkId()`
  call has no effect.
- **TTL:** every intent the framework builds expires `config.ttlSeconds` after it
  is built. 4.x used a fixed one hour; `ttlSeconds: 3600` keeps that. The framework
  also passes the TTL to `walletProvider.balanceTx` (its existing `ttl?: Date`
  argument, which it did not pass before), so a wallet that honours it gives the
  balancing intent the same lifetime. A wallet behind the DApp Connector cannot
  receive a TTL, so its balancing intent keeps the wallet's own lifetime.
  `submitTx` reads `providers.config` too.
- **Validation:** a missing (`undefined` or `null`) config, or a `networkId` that is
  not a non-empty string without surrounding whitespace, throws a `TypeError`; a
  `ttlSeconds` that is not a positive whole number (or that overflows a `Date`)
  throws a `RangeError`. Every entry point that builds a transaction checks this
  before chain state is read and before the circuit or constructor runs.
  The same check is public as `assertValidMidnightConfig` in
  `@midnight-ntwrk/midnight-js-utils`.
- **Low-level functions:** `createUnprovenCallTxFromInitialStates` reads
  `options.config` (a new required member of `CallOptionsProviderDataDependencies`);
  `createUnprovenDeployTxFromVerifierKeys` takes `config` as a new last argument.
  `UnprovenCallTxProvidersBase` and `UnprovenDeployTxProviders` now include `config`.
- **`NetworkId`** moved to `@midnight-ntwrk/midnight-js-types`.
- **`@midnight-ntwrk/midnight-js-network-id` is deprecated.** `setNetworkId`,
  `getNetworkId` and `NetworkId` still compile and run, but the framework ignores
  them. The package is removed in 6.0.
- **testkit-js:** `NodeClient` takes the network id as a third constructor
  argument and rejects an empty one. `initializeMidnightProviders` sets
  `config.networkId` from the environment configuration and `config.ttlSeconds`
  to 3600. The test environments no longer call `setNetworkId`.

---

## 12. Names changed during the 5.0.0 pre-releases (#1489)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already use the new
names.

| Package | Before | After |
|---|---|---|
| `types` | `RetainedEraHandlers<T>` | `RetainedEraEntries<T>` |
| `types` | `ProviderSeam` | `TransactionMethod` |
| `types` | `ReadSeam` | `ReadMethod` |
| `types` | `Seam` | `ProviderMethod` |
| `types` | `TransactionSeams` | `TransactionProviders` |
| `types` | `assertSeamsSupportEra` | `assertProvidersSupportEra` |
| `types` | `SeamEraUnsupportedError` | `ProviderEraUnsupportedError` |
| `types` | `PROVIDER_ERROR_CODES.SEAM_ERA_UNSUPPORTED` (`MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED`) | `PROVIDER_ERA_UNSUPPORTED` (`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`) |
| `types` | the `seam` field on `Ledger8PayloadUnsupportedError`, `UntaggedPayloadError`, `ProviderEraUnsupportedError`, `UnusableEraEntryError` | `method` |
| `contracts` | `EraSeam` | `ProviderMethod` from `@midnight-ntwrk/midnight-js-types` (the alias is removed) |
| `contracts` | `Ledger8.SeamFailedError` | `ProviderFailedError`, on the flat surface ([14e](#14e-every-submit-path-reports-a-provider-rejection-as-providerfailederror)) |
| `contracts` | `CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED` (`MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED`) | `PROVIDER_FAILED` (`MIDNIGHT_JS_C_PROVIDER_FAILED`) |
| `contracts` | the `seam` field on `EraInvariantViolationError` and `ProviderFailedError` | `method` |
| `indexer-public-data-provider` | the `seam` field on `DecoderEraUnsupportedError` and `UnknownRecordEraError`, and the `seam` key in a decode failure's `context.details` | `method` |
| `contracts` | `result.era` values `'ledger8'` / `'ledger9'` (also the `path` field of the pipeline-selection breadcrumb) | `'v8'` / `'v9'` |
| `contracts` | `PipelineEra`, `CurrentPipelineEra`, `CURRENT_PIPELINE_ERA` | `LedgerVersion`, `CurrentLedgerVersion`, `CURRENT_LEDGER_VERSION` from `@midnight-ntwrk/midnight-js-protocol` (all three are also on the `@midnight-ntwrk/midnight-js` barrel) |
| `contracts` | `RetainedPipelineEra`, `RETAINED_PIPELINE_ERA` | the literal `'v8'` (see ADR 0011) |
| `types` | `V8PayloadUnsupportedError` | `Ledger8PayloadUnsupportedError` |
| `types` | `PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED` (`MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED`) | `LEDGER8_PAYLOAD_UNSUPPORTED` (`MIDNIGHT_JS_PR_LEDGER8_PAYLOAD_UNSUPPORTED`) |
| `types` | `V8TxBytes`, `V9Tx`, `V9WalletProvider` | `Ledger8TransactionBytes`, `Ledger9Transaction`, `Ledger9WalletProvider` |
| `types` | `unwrapV9` | `unwrapLedger9` |
| `types` | `FinalizedTxDataV8` | `Ledger8FinalizedTxData` |
| `contracts` | `FoundDeployTxPublicDataV8` | `Ledger8FoundDeployTxPublicData` (flat, not in the `Ledger8` namespace: it is part of the current era's `FoundDeployTxData`) |
| `contracts` | `Ledger8.DeployOnV9Error` | `Ledger8.DeployOnLedger9Error` |
| `contracts` | `CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9` (`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9`) | `LEDGER8_DEPLOY_ON_LEDGER9` (`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_LEDGER9`) |
| `protocol` | `ProtocolV8` | `Ledger8Protocol` |
| `protocol` | `proveV8Transaction` (`./prove`) | `proveLedger8Transaction` |
| `protocol` | `loadLedger8` | `loadLedger8Protocol` (it returns `Ledger8Protocol`) |
| `types` | `createProofProviderForEras` | `createProofProviderFromProvingProviders` (it takes `ProvingProvidersByEra`) |
| `types` | `VersionedTx` | `VersionedTransaction` |
| `indexer-public-data-provider` | `EraUnsupportedError` (`MIDNIGHT_JS_PR_ERA_UNSUPPORTED`) | `DecoderEraUnsupportedError` (`MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED`) |
| `indexer-public-data-provider` | `EraUnresolvableError` (`MIDNIGHT_JS_PR_ERA_UNRESOLVABLE`) | `UnknownRecordEraError` (`MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA`) |
| `contracts` | `UnrecognisedResultEraError` (`MIDNIGHT_JS_C_UNRECOGNISED_RESULT_ERA`) | `UnknownResultEraError` (`MIDNIGHT_JS_C_UNKNOWN_RESULT_ERA`) |
| `contracts` | `ScopedTxEraUnsupportedError` (`MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED`) | `ScopedTransactionEraUnsupportedError` (`MIDNIGHT_JS_C_SCOPED_TRANSACTION_ERA_UNSUPPORTED`) |
| `contracts` | `ScopedTransactionIdentityMismatchError`'s code `MIDNIGHT_JS_C_SCOPED_TX_IDENTITY_MISMATCH` (the class is from 4.x; the code is new in 5.0) | `MIDNIGHT_JS_C_SCOPED_TRANSACTION_IDENTITY_MISMATCH` |
| `indexer-public-data-provider` | `IndexerDataError` kind `'unresolvable-era'` | removed, with no replacement: the raw reads tag a record by its envelope ([14a](#14a-changed-signatures)) |

The payload tag values `version: 'v8' | 'v9'` do not change: they mirror the
`ledger-v8` / `ledger-v9` package names.

One consequence to check in your own code: `result.era` and `result.public.version`
now take the same values. Before, comparing the wrong one against a literal of
the other was a compile error; now it compiles. `era` names the pipeline that
built the result's objects, `version` the ledger that recorded the transaction,
and after the fork a retained-era call has `era: 'v8'` with `version: 'v9'`.

---

## 13. `queryDeployContractState` is version-tagged, and the indexer floor is `4.4.0-rc.6` (#1452)

`PublicDataProvider.queryDeployContractState` now resolves to
`VersionedContractState | null` instead of `ContractState | null`. It reads the
deploy's record, or the latest update's record when the contract has been
updated, and tags it with the ledger era that wrote it:

- `{ version: 'v9', state }` — the decoded `ContractState`;
- `{ version: 'v8', stateBytes }` — the stored bytes, never translated to the v9
  encoding.

Narrow on `version` before you read the state:

```ts
const deployState = await publicDataProvider.queryDeployContractState(address);
if (deployState !== null) {
  switch (deployState.version) {
    case 'v9':
      use(deployState.state);
      break;
    case 'v8':
      useBytes(deployState.stateBytes);
      break;
    default:
      assertNever(deployState, 'queryDeployContractState');
  }
}
```

If you implement `PublicDataProvider` yourself, return the tagged shape.

`indexerPublicDataProvider` now requires **indexer `4.4.0-rc.6` or later**. It
selects `stateAt` on every contract-state read, and older indexers do not serve
that field. The framework's test environments pin the build tag
`4.4.0-rc.6-68702121`.

---

## 14. One rule for era-dependent values: every read and `submitTx` are version-tagged (#1508)

`version: 'v8' | 'v9'` now has one meaning on every public type: the ledger era that **wrote**
the value. The era of the block that dated a read stays in `protocolVersion`. A value whose shape
depends on the era is a `Versioned*` union; narrow it with `switch (value.version)` closed by
`assertNever`, or, in code that handles only v9, with `requireLedger9(value, '<call site>')` from
`@midnight-ntwrk/midnight-js-utils`, which throws `Ledger8ValueUnsupportedError` on a v8 value.

### 14a. Changed signatures

| Where | Before | After |
|---|---|---|
| `PublicDataProvider.queryContractState` | `Promise<ContractState \| null>` | `Promise<VersionedContractState \| null>` |
| `PublicDataProvider.watchForContractState` | `Promise<ContractState>` | `Promise<VersionedContractState>` |
| `PublicDataProvider.contractStateObservable` | `Observable<PositionedRecord<ContractState>>` | `Observable<PositionedRecord<VersionedContractState>>` |
| `PublicDataProvider.queryZSwapAndContractState` | `Promise<[ZswapChainState, ContractState, LedgerParameters] \| null>` | `Promise<VersionedPublicStates \| null>` (an object, not a tuple) |
| `RawContractState.version` | the era of `protocolVersion` | the era of the envelope of `raw` |
| `ContractEventBase.version` | payload schema version | renamed to `payloadVersion` |
| `getPublicStates` (contracts) | `Promise<PublicContractStates>` | `Promise<VersionedPublicStates>` |
| `getStates` (contracts) | `ContractStates<PS>` (an interface) | `ContractStates<PS> = VersionedPublicStates & { privateState }` |
| `PublicContractStates` (contracts) | exported | removed; use `VersionedPublicStates` from types |
| `AnyEraContractState.envelopeVersion` | `envelopeVersion` | renamed to `version` |
| `Ledger8FoundContract.deployTxData` (and `Ledger8DeployedContract`) | the flat `VersionedFinalizedTxData` | `{ public: VersionedFinalizedTxData }` |
| `SubmitTxOptions.unprovenTx` | `UnprovenTransaction` | `VersionedUnprovenTransaction` |
| `submitTx` | `Promise<FinalizedTxData>` | `Promise<VersionedFinalizedTxData>` |
| `TransactionContext.getCurrentStates` / `CacheStates` | `ContractStates<PS> \| PublicContractStates` | their v9 variants (`Ledger9Variant<ContractStates<PS>> \| Ledger9PublicStates`) |
| `IndexerDataError` kind `unknown-record-era` | raised by the raw reads | removed; the raw reads tag by the envelope |
| `IndexerDataError.unresolvableEra` | static factory | removed |
| `IndexerDataErrorContext` | — | new kinds `mixed-era-public-states` and `malformed-protocol-version`; an exhaustive `switch` on `kind` must handle them |
| `queryRawContractState`, `rawContractStateObservable` | never compared the envelope with the block | refuse an envelope newer than an enforced dating block (`era-disagreement`) and a malformed `protocolVersion` (`malformed-protocol-version`) |
| `EraArtifactMismatchReason` | — | new members `ledger9-transaction-on-ledger8-head` and `ledger8-transaction-on-ledger9-head` ([14c](#14c-submittx-routes-on-the-network-head)) |

### 14b. What a pre-fork state does now

The four decoding reads — `queryContractState`, `watchForContractState`,
`contractStateObservable` and `queryZSwapAndContractState` — return the v8 variant
(`{ version: 'v8', stateBytes }`) instead of throwing `IndexerDataError` `unsupported-decode-era`.
`findDeployedContract`, `createUnprovenCallTx`, a cross-contract callee read and the maintenance
reads still need a v9 state: for a v8 one they now throw `Ledger8.ContractStateUnsupportedError`,
naming the contract, instead of `unsupported-decode-era`. `contractStateObservable` emits a pre-fork
record as a v8 value and keeps going, so a replay that starts before the fork no longer ends on
its first record.

`queryZSwapAndContractState` returns `{ version: 'v8', zswapChainState, stateBytes,
ledgerParametersBytes }` for a v8 block. A contract state and ledger parameters from different
eras are refused as `IndexerDataError` kind `mixed-era-public-states`. On the supported indexer
(4.4.0-rc.6 or later, see migration step 17) a pinned read never meets this.

### 14c. `submitTx` routes on the network head

`submitTx` / `submitTxAsync` read the head once and accept only a transaction of the head's era. A
transaction of the other era is refused before proving, as `EraArtifactMismatchError`: a v9
transaction on a pre-fork head with reason `ledger9-transaction-on-ledger8-head`, v8 bytes on a
post-fork head with reason `ledger8-transaction-on-ledger9-head`. Both reasons are new members
of `EraArtifactMismatchReason`, so an exhaustive `switch` on `reason` must handle them. An untagged
transaction is refused as `UntaggedPayloadError` before the head is read.

The head is read once, before proving. If the network crosses the fork while the transaction is
being proved, the node refuses it and the refusal arrives as `ProviderFailedError` from `submitTx`
([14e](#14e-every-submit-path-reports-a-provider-rejection-as-providerfailederror)). Read the head
again and rebuild the transaction for the new era.

```ts
// Before
await submitTx(providers, { unprovenTx });
// After
await submitTx(providers, { unprovenTx: { version: 'v9', tx: unprovenTx } });
```

### 14d. New exports

- `requireLedger9`, `Ledger9Variant`, `Ledger8ValueUnsupportedError`
  (`MIDNIGHT_JS_U_LEDGER8_VALUE_UNSUPPORTED`), `UnrecognisedEraTagError`
  (`MIDNIGHT_JS_U_UNRECOGNISED_ERA_TAG`) — utils. `requireLedger9` does not compile for a type
  with no v9 variant, such as `RawContractState`, whose `version` is the whole era set.
- `Ledger8.ContractStateUnsupportedError` (`MIDNIGHT_JS_C_LEDGER8_CONTRACT_STATE_UNSUPPORTED`) —
  contracts. `findDeployedContract`, `createUnprovenCallTx`, a cross-contract callee read and the
  maintenance reads raise it, with the contract address, for a state the v8 ledger wrote.
- `VersionedPublicStates`, `Ledger8PublicStates`, `Ledger9PublicStates` — types.
- `AnyEraFoundContract<C, L8>`, `AnyEraDeployedContract<C, L8>` — contracts.
- `EraInvariantViolationError.txId` — contracts. Set when the record of a transaction already on
  chain arrives from the wrong era, so the caller can reconcile it instead of retrying.

### 14e. Every submit path reports a provider rejection as `ProviderFailedError`

Before, a rejection from `proveTx`, `balanceTx` or `submitTx` reached the caller unchanged on the
v9 paths (`submitTx`, `submitCallTx`, `deployContract`, the maintenance transactions and scoped
transactions), and only the retained-era pipeline wrapped it, as `Ledger8.ProviderFailedError`.
Now every path wraps it the same way, as `ProviderFailedError` (`MIDNIGHT_JS_C_PROVIDER_FAILED`,
category ENVIRONMENT), with `method` and `circuitId`. The provider's own failure is on `cause`,
rebuilt as a plain `Error` whose message is the original class name and the original message
redacted of transaction and witness material. Own properties of the original are dropped.

```ts
// Before
try {
  await submitCallTx(providers, options);
} catch (error) {
  if (error instanceof Error && error.name.includes('Wallet.InsufficientFunds')) { /* ... */ }
}
// After
try {
  await submitCallTx(providers, options);
} catch (error) {
  if (error instanceof ProviderFailedError && error.method === 'balanceTx' &&
      error.cause instanceof Error && error.cause.message.includes('Wallet.InsufficientFunds')) { /* ... */ }
}
```

This framework's own coded errors are not wrapped, so `EraInvariantViolationError`,
`UntaggedPayloadError` and the other coded refusals still arrive as themselves.

---

## 15. Names bound to one ledger are named after it (#1490)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already use the new
names.

"Current" and "retained" change meaning at every hard fork: today "current" is
ledger 9 and "retained" is ledger 8. A name whose code is bound to one ledger
now says which ledger (ADR 0018). Names that follow the era on purpose keep
"current" / "retained": `CurrentLedgerVersion`, `RetainedLedgerVersion`,
`RetainedEraEntries`, the `currentEra` / `retainedEras` keys, `RetainedEraProver`,
`RetainedEraBalancer` and `RetainedEraSubmitter`.
The README glossary defines both terms.

| Package | Before | After |
|---|---|---|
| `protocol` (`./engine`) | `RetainedContract` | `Ledger8EngineContract` |
| `protocol` (`./engine`) | `RunRetainedCircuitOptions`, `RunRetainedConstructorOptions` | `Ledger8CircuitOptions`, `Ledger8ConstructorOptions` |
| `protocol` (`./engine`) | `Ledger8Engine.reexpressOperationsForCurrentEra` | `reexpressOperationsForLedger9` |
| `protocol` | `RetainedEraSubpath` (also on the `midnight-js` barrel) | `Ledger8Subpath` |
| `types` | `CurrentEraProver`, `CurrentEraBalancer`, `CurrentEraSubmitter` | `Ledger9Prover`, `Ledger9Balancer`, `Ledger9Submitter` |
| `contracts` | `RetainedArtifactOnCurrentEraStateError` (flat) | `Ledger8.ArtifactOnLedger9StateError` (in the `Ledger8` namespace, like every other ledger 8 refusal; ADR 0013) |
| `contracts` | `CONTRACTS_ERROR_CODES.RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE` (`MIDNIGHT_JS_C_RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE`) | `LEDGER8_ARTIFACT_ON_LEDGER9_STATE` (`MIDNIGHT_JS_C_LEDGER8_ARTIFACT_ON_LEDGER9_STATE`) |
| `contracts` | `EraArtifactMismatchReason` `'unwrapped-current-era-contract'` | `'unwrapped-ledger9-contract'` |
| `contracts` | `EraArtifactMismatchReason` `'current-era-artifact-on-pre-fork-head'` | `'ledger9-artifact-on-ledger8-head'` |
| `contracts` | `EraArtifactMismatchReason` `'current-era-transaction-on-pre-fork-head'` | `'ledger9-transaction-on-ledger8-head'` |
| `contracts` | `EraArtifactMismatchReason` `'retained-era-transaction-on-post-fork-head'` | `'ledger8-transaction-on-ledger9-head'` |
| `contracts` | breadcrumb `decision: 'retained-signing-key-entry'` | `'ledger8-signing-key-entry'` |

The breadcrumb `decision` value reaches your logs. Update any log filter or
alert that matches the old value.

Error messages now name the ledger ("the ledger 8 (pre-fork) Compact
toolchain", "a ledger 9 state") instead of saying only "retained" or "current".
Match errors on their `code`, not their message (ADR 0017).

---

## 16. Retained-era handles: one `deployTxData` shape and one signing-key type (#1514)

`Ledger8.FoundContract` and `Ledger8.DeployedContract` now carry `deployTxData` as
`{ era, public, private }`, the shape the current era's handles have. The deployer's data moved
off the top level, and the retained era's signing key is now the current era's `SigningKey`,
`{ tag, value }`.

| Where | Before | After |
|---|---|---|
| `Ledger8.FoundContract.deployTxData` | `{ public: VersionedFinalizedTxData }` | `Ledger8.FoundDeployTxData<C>`: `{ era: 'v8', public: VersionedFinalizedTxData & { contractAddress }, private: { signingKey, initialPrivateState } }` |
| `Ledger8.DeployedContract.deployTxData` | `{ public: VersionedFinalizedTxData }` | `Ledger8.DeployTxData<C>`: `public` adds `initialContractState`, `initialContractStateBytes`; `private` adds `initialZswapState` |
| `Ledger8.FoundContract.signingKey` | `Ledger8SigningKey \| undefined` (bare hex) | removed; `deployTxData.private.signingKey: SigningKey \| undefined` |
| `Ledger8.DeployedContract.signingKey` | `Ledger8SigningKey` | removed; `deployTxData.private.signingKey: SigningKey` |
| `Ledger8.DeployedContract.initialContractState`, `initialContractStateBytes` | top level | `deployTxData.public.*` |
| `Ledger8.DeployedContract.initialPrivateState`, `initialZswapState` | top level | `deployTxData.private.*` |
| `Ledger8.DeployContractOptions.signingKey`, `Ledger8.FindDeployedContractOptions.signingKey` | `Ledger8SigningKey` (bare hex) | `SigningKey` |
| `Ledger8.DeployTxFailedError.signingKey`, `Ledger8.DeployUnconfirmedError.signingKey`, `Ledger8.DeployNotStoredError.signingKey` | `Ledger8SigningKey` | `SigningKey` |
| `Ledger8.SigningKeyUnusableError` | raised by `findDeployedContract` only; `contractAddress: string` | also raised by `deployContract` and by the retained-era `submitReplaceAuthorityTx` / `replaceAuthority`, before anything is composed; `contractAddress?: string` (absent on a deploy) |

The retained era signs with `schnorr` only. An `ecdsa` key, or a `schnorr` key whose value is not
exactly 64 hexadecimal characters, is refused with `Ledger8.SigningKeyUnusableError`
(`LEDGER8_SIGNING_KEY_UNUSABLE`).

```diff
  const deployed = await deployContract(providers, {
    compiledContract: retained,
-   signingKey: keyHex
+   signingKey: { tag: 'schnorr', value: keyHex }
  });
- deployed.signingKey;
- deployed.initialPrivateState;
+ deployed.deployTxData.private.signingKey;
+ deployed.deployTxData.private.initialPrivateState;
```

## 17. Contract maintenance in both eras, with results tagged by era (#1514)

The maintenance functions take a retained-era artifact as well, on a pre-fork head, and every
maintenance result is now nested like every other `contracts` result.

| Where | Before | After |
|---|---|---|
| `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx` | `Promise<FinalizedTxData>` | `Promise<FinalizedMaintenanceTxData>`, `{ era: 'v9', public: FinalizedTxData }`; a retained-era artifact resolves `Promise<Ledger8.FinalizedMaintenanceTxData>`, `{ era: 'v8', public: Ledger8FinalizedTxData }` |
| `submitReplaceAuthorityTx(...)` | `(newAuthority) => Promise<FinalizedTxData>` | `(newAuthority) => Promise<FinalizedMaintenanceTxData>`, or the retained-era result for a retained-era artifact |
| `CircuitMaintenanceTxInterface`, `ContractMaintenanceTxInterface` methods | `Promise<FinalizedTxData>` | `Promise<FinalizedMaintenanceTxData>` |
| `createCircuitMaintenanceTxInterface(s)`, `createContractMaintenanceTxInterface` | current-era artifact only | also a retained-era artifact, answering `Ledger8.CircuitMaintenanceTxInterface(s)` / `Ledger8.ContractMaintenanceTxInterface` |
| `Ledger8.FoundContract`, `Ledger8.DeployedContract` | no maintenance members | `circuitMaintenanceTx`, `contractMaintenanceTx` |
| `SubmittedOperationKind` | `'call' \| 'deploy'` | `'call' \| 'deploy' \| 'maintenance'` |
| `ComposeStage` (protocol) | no maintenance stage | gains `'maintenance-update'` |
| `ComposeOption` (protocol) | no replacement-key option | gains `'newSigningKey'` |

```diff
  const result = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
- result.status;
+ result.public.status;
```

`AnyEraMaintenanceTxData` is the union of both results; narrowing on `era` narrows `public`. The
`*TxFailedError` records are unchanged.

`SubmittedOperationKind`, `ComposeStage` and `ComposeOption` are closed unions: an exhaustive
`switch` over one of them in consumer code stops compiling until it handles the new member.

A retained-era maintenance update on a post-fork head is refused with
`Ledger8.MaintenanceOnLedger9Error` (`LEDGER8_MAINTENANCE_ON_LEDGER9`). After the fork, recompile
the contract with the ledger 9 Compact toolchain and call the same function with that artifact.

New refusals on the retained path:

| Class | Code | When |
|---|---|---|
| `Ledger8.MaintenanceOnLedger9Error` | `LEDGER8_MAINTENANCE_ON_LEDGER9` (USAGE) | retained-era artifact on a post-fork head |
| `Ledger8.SigningKeyUnavailableError` | `LEDGER8_SIGNING_KEY_UNAVAILABLE` (USAGE) | no usable key stored, or the store cannot be read (on `cause`) |
| `Ledger8.SigningKeyNotStoredError` | `LEDGER8_SIGNING_KEY_NOT_STORED` (ENVIRONMENT) | a confirmed replacement whose new key the store refused; carries the key |
| `Ledger8.ReplaceAuthorityUnconfirmedError` | `LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED` (UNCERTAIN) | a submitted replacement whose outcome could not be confirmed; carries the new key, which was not stored |
| `MaintenanceAuthorityMismatchError` (protocol) | `MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH` (USAGE) | the stored key cannot sign for the contract's authority (`reason`: `'not-first-member'`, `'empty-committee'`, `'threshold-above-one'`); raised before proving |
| `Ledger8.InsertVerifierKeyTxFailedError`, `Ledger8.RemoveVerifierKeyTxFailedError`, `Ledger8.ReplaceMaintenanceAuthorityTxFailedError` | `TX_FAILED` (inherited from `AnyEraTxFailedError`) | the chain recorded a non-success status; each names the contract, the first two the circuit, and the third carries the new key |

A retained-era replacement key must be a `schnorr` key; any other is refused with
`Ledger8.SigningKeyUnusableError` before anything is composed.

---

## 18. Plain-language names for era errors and version reads (#1491)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already use the new
names.

Names that used maintainer words ("envelope", "head", "axis", "down-convert")
now say what they mean. Each error code changes together with its class.

| Package | Before | After |
|---|---|---|
| `utils` | `contractStateEnvelopeVersion` | `ledgerVersionOfContractState` |
| `utils` | `ledgerParametersEnvelopeVersion` | `ledgerVersionOfLedgerParameters` |
| `indexer-public-data-provider` | `EnvelopeUpperBound` = `'enforced' \| 'withheld'` | `UpperBoundCheck` = `'check' \| 'skip'` |
| `protocol` (also on the `midnight-js` barrel) | `networkHeadVersion` | `latestNetworkLedgerVersion` |
| `contracts` | `StaleHeadError` (`MIDNIGHT_JS_C_STALE_HEAD`) | `ForkCrossedDuringOperationError` (`MIDNIGHT_JS_C_FORK_CROSSED_DURING_OPERATION`) |
| `contracts` | `StaleHeadOperationKind` | `SubmittedOperationKind` |
| `contracts` | `HeadReadFailedError` (`MIDNIGHT_JS_C_HEAD_READ_FAILED`) | `NetworkVersionReadFailedError` (`MIDNIGHT_JS_C_NETWORK_VERSION_READ_FAILED`) |
| `contracts` | `HeadStateEraMismatchError` (`MIDNIGHT_JS_C_HEAD_STATE_ERA_MISMATCH`) | `NetworkVersionStateMismatchError` (`MIDNIGHT_JS_C_NETWORK_VERSION_STATE_MISMATCH`) |
| `protocol` | `DownConvertFailedError` (`MIDNIGHT_JS_P_DOWN_CONVERT_FAILED`) | `StateConversionFailedError` (`MIDNIGHT_JS_P_STATE_CONVERSION_FAILED`) |
| `protocol` | `DownConvertStage` = `'v8 envelope extraction' \| 'v9 envelope extraction' \| 'state down-convert'` | `StateConversionStage` = `'v8 version tag read' \| 'v9 version tag read' \| 'state conversion'` |
| `protocol` | `new Ledger8InstanceMismatchError(axis)` and its `axis` field | `new Ledger8InstanceMismatchError()`, no `axis` field: the message names `onchain-runtime-v3` |

Removed, with no replacement, because nothing in the framework raised them:

| Package | Removed |
|---|---|
| `protocol` | `UnknownLedger8AxisError` (`MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS`) and the `Ledger8InstanceAxis` type |
| `protocol` | `MerkleNotRehashedError` (`MIDNIGHT_JS_P_MERKLE_NOT_REHASHED`) |

Error messages changed wording to match. Match errors on their `code`, not
their message (ADR 0017).

---

## Non-breaking additions worth noting

- **Cross-contract call support** (#967) is additive: `ZKConfigRegistry` (types), the `ContractKeyLocation` grammar re-export, and the new `PublicDataProvider.queryBlock()` "as-of" endpoint. `queryBlock` is a new required member of the `PublicDataProvider` interface — custom implementations must add it (see [api-changes.md](./api-changes.md)). Its `BlockInfo` return type later gained a required `protocolVersion` field — see [section 9](#9-blockinfo-gained-a-required-protocolversion-field-1395).
- `dispose()` is exposed on the concrete `IndexerPublicDataProvider` returned by the factory (#961). It is **not** a member of the shared `PublicDataProvider` interface, so existing interface implementations are unaffected.
- The new `queryContractEvents` / `contractEventsObservable` methods are **required** members of the `PublicDataProvider` interface; the framework's `IndexerPublicDataProvider` provides them. If you implement `PublicDataProvider` yourself, this is a required-method addition that will fail to type-check until you add both — see [api-changes.md](./api-changes.md).
