# Breaking Changes v4.1.1 → v5.0.0

v5.0.0 is a protocol-level major release. The breaking surface concentrates in five areas: the **protocol bindings** (new packages, new scope), the **`SigningKey` representation**, **on-chain state compatibility**, **ZK artifact integrity verification** (now fail-closed by default), and **ESM-only packaging**.

> Sections 12, 14 to 17, 19, 20 and 23 show names that shipped only in 5.0.0 pre-releases. If you upgrade from v4, use section 25 for the final error names. [Section 25](#25-one-error-class-per-fault-1557) maps every one of them to its final class.

---

## 1. Protocol bindings moved to ledger-v9 / onchain-runtime-v4 (`@midnightntwrk` scope) (#970)

`@midnight-ntwrk/midnight-js-protocol` re-exports new packages under a **new npm scope**:

| Subpath | Before | After |
|---------|--------|-------|
| `@midnight-ntwrk/midnight-js-protocol/ledger` | `@midnight-ntwrk/ledger-v8@8.1.0` | `@midnightntwrk/ledger-v9@1.0.0-rc.3` |
| `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` | `@midnight-ntwrk/onchain-runtime-v3@3.0.0` | `@midnightntwrk/onchain-runtime-v4@4.0.0-rc.3` |

Coordinated companions: `@midnight-ntwrk/platform-js@3.0.0`, `@midnight-ntwrk/compact-runtime@0.18.0-rc.1`, `@midnight-ntwrk/compact-js@2.5.5-rc.7`, `compactc 0.33.0-rc.1`.

**Impact:** Any code importing ledger / onchain-runtime types should do so **only** through the protocol package's subpath re-exports (`/v9`, `/v9/onchain-runtime`; the unnamed subpaths in the table above are removed, see [section 21](#21-unnamed-protocol-subpaths-removed-1536)) — direct imports of the old-scope packages are flagged by ESLint (`no-restricted-imports`) and resolve to incompatible type shapes.

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

This change keeps every subpath **key**, so it moves no import specifier in your
code. [Section 21](#21-unnamed-protocol-subpaths-removed-1536) removes the
unnamed protocol subpaths separately.

**Impact — you need both of these:**

| Requirement | Why |
|-------------|-----|
| **Node >= 22.12** | Where `require(esm)` works unflagged, so a CommonJS consumer can still load these packages. `engines.node` is now `>=22.12`. |
| **TypeScript >= 5.8** with a `module` setting that knows about `require(esm)` | Older module settings refuse the import at compile time even though the runtime call succeeds. |

A CommonJS TypeScript consumer keeps working at runtime, but only some `module`
settings **compile**. Verified against tsc 6.0.3 with a CommonJS consumer file
importing `@midnight-ntwrk/midnight-js/utils` and
`@midnight-ntwrk/midnight-js-protocol/ledger` (now `/v9`, see section 21):

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

## 8. Transaction handles at the provider methods, era-tagged records on the read surface (#1204, #1533)

For the ledger-fork window a transaction carries the ledger era it belongs to,
so a caller cannot hand one era's transaction to the other era's runtime
without the framework noticing. A transaction crossing a provider method or a
`contracts` function is an opaque **transaction handle**; a record the read
surface returns is an `era`-discriminated union, `FinalizedTxRead`. See
[ADR 0006](../../adr/0006-version-tagged-payloads-at-provider-seams.md) and
[ADR 0019](../../adr/0019-carry-transactions-as-opaque-era-carrying-handles.md).

### 8a. The three transaction methods

`ProofProvider.proveTx`, `WalletProvider.balanceTx` and
`MidnightProvider.submitTx` now take a transaction handle, and `proveTx` and
`balanceTx` return one, in the same era. `submitTx` still returns a bare
`TransactionId`, which is era-independent.

| Method | Takes | Returns |
|---|---|---|
| `proveTx` | `UnprovenTx` | `Promise<UnboundTx>` |
| `balanceTx` | `UnboundTx` | `Promise<FinalizedTx>` |
| `submitTx` | `FinalizedTx` | `Promise<TransactionId>` |

```typescript
// before
const proven = await proofProvider.proveTx(unprovenTx);

// after
const proven = await proofProvider.proveTx(LedgerTransaction.seal('v9', 'Unproven', unprovenTx));
const provenTx = LedgerTransaction.unwrap(proven, 'v9');
```

`LedgerTransaction`, `UnprovenTx`, `UnboundTx` and `FinalizedTx` are exported
from `@midnight-ntwrk/midnight-js-types`. A handle holds a live ledger object of
one era; its `era` and `stage` are public, the object is not. `seal` refuses an
object of another copy of the ledger package with `ForeignLedgerTransactionError`;
`unwrap` refuses another era with `TransactionEraMismatchError`. A value that is
not a handle reaching a provider method is refused with
`InvalidTransactionHandleError`. All three carry a stable `code` you can match
with `hasErrorCode`.

**If you implement these interfaces yourself**, this is the breaking half that
type-checking will not let you defer: an implementation still taking or
returning a bare ledger transaction does not satisfy the new interfaces. Build
it with the adapters in [8e](#8e-implementing-walletprovider-or-midnightprovider)
or the per-era factories in
[8f](#8f-the-three-providers-gained-a-required-supportederas-field-1004).
Third-party providers must be on a matching version.

### 8b. `FinalizedTxData` gained a required `era` field

`FinalizedTxData` now carries `readonly era: 'v9'`, and its other 13 fields
moved to a shared `FinalizedTxRecord` base. Its `tx` is a `FinalizedTx` handle
instead of a `Transaction`, in the same era as `era`. Any code that
*constructs* a `FinalizedTxData` — including test fixtures and custom
`PublicDataProvider` implementations — must set `era` and seal `tx` with
`LedgerTransaction.seal('v9', 'Finalized', tx)`.

### 8c. The read surface reports both eras

`PublicDataProvider.watchForTxData` and `watchForDeployTxData` now return
`FinalizedTxRead`, the closed union of `FinalizedTxData`
(`era: 'v9'`) and the new `Ledger8FinalizedTxData` (`era: 'v8'`). In both, `tx` is a
`FinalizedTx` handle of the record's era (`record.tx.era === record.era`).
Read the ledger object with `record.era`:

```typescript
const record = await publicDataProvider.watchForTxData(txId);
const tx = LedgerTransaction.unwrap(record.tx, record.era);
```

To treat the eras differently, narrow on `era` first and unwrap inside each
branch.

`submitTx` in `midnight-js-contracts` resolves `FinalizedTxRead`, tagged
with the era the network was on when it ran (see
[14c](#14c-submittx-routes-on-the-networks-ledger-version)). A record from another era is
reported as `EraInvariantViolationError`, which carries the `method`, the
`circuitId` where the flow knows it, and the `txId` of the transaction it already
submitted.

`findDeployedContract` accepts a deploy record from either era, because a
contract deployed before the fork keeps a ledger-8 deploy record.
`FoundContract.deployTxData.public` is therefore `FoundDeployTxPublicData`, a
union tagged by `era`. `contractAddress` is on both variants. Narrow on
`era` before reading `tx` or `initialContractState`; the `v8` variant has no
`initialContractState`. Code that does any of the following without narrowing no
longer compiles: reads `found.deployTxData.public.initialContractState`, uses
`found.deployTxData.public.tx` as a v9 `Transaction`, or passes
`found.deployTxData` where a `FinalizedDeployTxDataBase<C>` is expected.
`DeployedContract` is unchanged.

`indexerPublicDataProvider` produces both variants. It decodes each record with the
ledger runtime of the era that record's own `protocolVersion` reports, so a
v8-era record arrives as a **value** on the `'v8'` variant, not as a thrown error.
The pre-fork runtime is acquired lazily on first use, so a session that never
meets a v8-era record never instantiates that WASM. Narrowing on `era` is
therefore not a formality: the two variants hold transaction objects built by
different runtimes, and neither runtime's object can be handed to the other.
Reading a v8-era record loads the pre-fork runtime, also in a session that
otherwise uses only ledger 9 (known limitation,
[#1525](https://github.com/midnightntwrk/midnight-js/issues/1525)).

### 8d. `era` is derived, not asserted

`indexerPublicDataProvider` resolves `era` from each record's own
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

An implementation still taking or resolving a bare `FinalizedTransaction` no
longer satisfies `WalletProvider`. TypeScript reports the *parameter* mismatch
first, so the error you see names the ledger methods the handle does not have,
rather than the missing `seal` — it is still this change.

Rather than sealing by hand, wrap a v9-only implementation:

```typescript
import { deserializeTransactionAtStage } from '@midnight-ntwrk/midnight-js-protocol/transaction';
import { createMidnightProvider, createWalletProvider } from '@midnight-ntwrk/midnight-js-types';

// The wallet runs its own copy of the ledger, so transactions cross as bytes.

const walletProvider = createWalletProvider({
  balanceTx: async (tx, ttl) =>
    deserializeTransactionAtStage('v9', 'Finalized', await wallet.balanceTransaction(tx.serialize(), ttl)),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});

const midnightProvider = createMidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
```

Both unwrap the inbound handle, and the wallet adapter also seals its answer, so
the handle never appears in your code. The midnight adapter seals nothing: it
returns a `TransactionId`.

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
  supportedEras: ['v9'], // submitTx below serves v9 only, so v8 is not listed
  submitTx: (tx) => wallet.submitTransaction(LedgerTransaction.unwrap(tx, 'v9'))
};
```

**If you serve more than one era**, write one handler per era instead and let
the factory compute the declaration:

```typescript
import { createProofProviderFromHandlers } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = createProofProviderFromHandlers({
  v8: (tx) => proveLedger8Transaction(tx, ledger8ProvingProvider),
  v9: (tx) => tx.prove(provingProvider, CostModel.initialCostModel())
});
```

There is one key per ledger era: a handler for an era you serve, `undefined`
for one you do not. Each handler receives a live ledger object of its own era
and returns one. The factory unwraps each handle for its era's handler, seals
the answer in that same era, and raises `ProviderEraUnsupportedError` for an
era you did not supply a handler for. A handler that hands the transaction to
another ledger copy (a wallet SDK, a DApp Connector wallet) serializes it on the way out
and decodes the answer with `deserializeTransactionAtStage` from
`@midnight-ntwrk/midnight-js-protocol/transaction` on the way in, with the era
of the request.

Nothing verifies the declaration. Listing an era you do not serve makes the
failure later, not absent: the provider built from handlers still refuses a
handle of that era with `ProviderEraUnsupportedError`, possibly after proving.

See [ADR 0014](../../adr/0014-build-provider-seams-from-per-era-handlers.md),
as amended by [ADR 0019](../../adr/0019-carry-transactions-as-opaque-era-carrying-handles.md).

### 8g. New and changed exports

**`@midnight-ntwrk/midnight-js-types`** — added: `LedgerTransaction`,
`UnprovenTx`, `UnboundTx`, `FinalizedTx`, `TransactionStage`,
`LedgerTransactionTypes`, `ForeignLedgerTransactionError`,
`ForeignLedgerTransactionReason`, `InvalidTransactionHandleError`,
`InvalidTransactionHandleReason`, `TransactionHandleMethod`, `TransactionEraMismatchError`,
`FinalizedTxRecord`, `Ledger8FinalizedTxData`, `FinalizedTxRead`,
`TransactionMethod`, `ReadMethod`, `ProviderMethod`, `Ledger9WalletProvider`,
`createWalletProvider`, `createMidnightProvider`, `ProviderEraUnsupportedError`,
`UnusableEraEntryError`, `EraEntryShape`, `assertProvidersSupportEra`,
`TransactionProviders`, `EraDeclaringProvider`, `createProofProviderFromHandlers`,
`createWalletProviderFromHandlers`, `createMidnightProviderFromHandlers`,
`createProofProviderFromProvingProviders`, `ProvingProvidersByEra`,
`ProofProviderHandlers`, `WalletProviderHandlers`, `MidnightProviderHandlers`.
Changed: `FinalizedTxData` gained `era: 'v9'` and its `tx` is a
`LedgerTransaction<'Finalized', 'v9'>` (a `FinalizedTx`); `ProofProvider`, `WalletProvider` and `MidnightProvider` take and
return handles and each gained a required `supportedEras`.

**`@midnight-ntwrk/midnight-js-contracts`** — changed: every function that
takes or returns a transaction uses a handle. `UnsubmittedTxData.unprovenTx`
(read as `.private.unprovenTx` on `createUnprovenCallTx` and
`createUnprovenDeployTx` results) and the `createUnproven*Tx` maintenance
functions give an `UnprovenTx` instead of an `UnprovenTransaction`;
`SubmitTxOptions.unprovenTx` takes one ([14a](#14a-changed-signatures)).

**`@midnight-ntwrk/midnight-js-utils`** — changed: `deserializeLedgerTransaction`
takes the era first, `deserializeLedgerTransaction(era, bytes, ctx)`, and is
async: it resolves a finalized handle of that era instead of returning a
`Transaction`. A v8 read loads the v8 runtime first.

```diff
- const tx = deserializeLedgerTransaction(bytes, { caller });
+ const tx = await deserializeLedgerTransaction('v9', bytes, { caller });
```

**`@midnight-ntwrk/midnight-js-indexer-public-data-provider`** — changed:
`parseHexTransaction` takes the era first, `parseHexTransaction(era, hex,
details?)`, and is async: it resolves a finalized handle of that era instead of
returning a `Transaction`.

**`@midnight-ntwrk/midnight-js-protocol`** — added on the `./transaction`
subpath: `deserializeTransactionAtStage`, `isFrameworkLedgerTransaction`,
`transactionStageOf`, `TransactionStage`, `LedgerTransactionTypes`,
`FrameworkInstanceCheck`. `proveLedger8Transaction` (`./prove`) now refuses,
with `InvalidArgumentError`, an argument that is not an unproven v8 transaction
of the framework's ledger copy.

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
*that* block, never the latest block's, so a block read from before a hard fork
keeps reporting the era it was produced in.

`queryBlock` itself is new in 5.0.0, so a consumer who never implemented the
interface sees only an added field. The break lands on anyone who wrote an
implementation or a test double against `5.0.0-rc.0` / `5.0.0-rc.1`, where the
type had two fields.

---

## 10. Contract-state and balance streams emit `PositionedRecord<T>` (#1399)

`PublicDataProvider.contractStateObservable` and `unshieldedBalancesObservable`
now emit `PositionedRecord<T>` instead of the bare value:

```ts
type PositionedRecord<T> = {
  readonly value: T;           // what the stream emitted before
  readonly blockHeight: number; // the block that carried the value
  readonly blockHash: BlockHash;
};
```

- **Consumers:** read `record.value` where you read the emitted value before.
- **Custom `PublicDataProvider` implementations:** the two members return
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
| `types` | `RetainedEraHandlers<T>` | removed in [18](#18-transactions-are-handles-1533) |
| `types` | `ProviderSeam` | `TransactionMethod` |
| `types` | `ReadSeam` | `ReadMethod` |
| `types` | `Seam` | `ProviderMethod` |
| `types` | `TransactionSeams` | `TransactionProviders` |
| `types` | `assertSeamsSupportEra` | `assertProvidersSupportEra` |
| `types` | `SeamEraUnsupportedError` | `ProviderEraUnsupportedError` |
| `types` | `PROVIDER_ERROR_CODES.SEAM_ERA_UNSUPPORTED` (`MIDNIGHT_JS_PR_SEAM_ERA_UNSUPPORTED`) | `PROVIDER_ERA_UNSUPPORTED` (`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`) |
| `types` | the `seam` field on `ProviderEraUnsupportedError`, `UnusableEraEntryError` (and on two errors removed in [18](#18-transactions-are-handles-1533)) | `method` |
| `contracts` | `EraSeam` | `ProviderMethod` from `@midnight-ntwrk/midnight-js-types` (the alias is removed) |
| `contracts` | `Ledger8.SeamFailedError` | `ProviderFailedError`, on the flat surface ([14e](#14e-every-submit-path-reports-a-provider-rejection-as-providerfailederror)) |
| `contracts` | `CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED` (`MIDNIGHT_JS_C_LEDGER8_SEAM_FAILED`) | `PROVIDER_FAILED` (`MIDNIGHT_JS_C_PROVIDER_FAILED`) |
| `contracts` | the `seam` field on `EraInvariantViolationError` and `ProviderFailedError` | `method` |
| `indexer-public-data-provider` | the `seam` field on `DecoderEraUnsupportedError` and `UnknownRecordEraError`, and the `seam` key in a decode failure's `context.details` | `method` |
| `contracts` | `result.era` values `'ledger8'` / `'ledger9'` (also the `path` field of the pipeline-selection breadcrumb) | `'v8'` / `'v9'` |
| `contracts` | `PipelineEra`, `CurrentPipelineEra`, `CURRENT_PIPELINE_ERA` | `LedgerVersion`, `CurrentLedgerVersion`, `CURRENT_LEDGER_VERSION` from `@midnight-ntwrk/midnight-js-protocol` (all three are also on the `@midnight-ntwrk/midnight-js` barrel) |
| `contracts` | `RetainedPipelineEra`, `RETAINED_PIPELINE_ERA` | the literal `'v8'` (see ADR 0011) |
| `types` | `V8PayloadUnsupportedError` | removed in [18](#18-transactions-are-handles-1533) |
| `types` | `PROVIDER_ERROR_CODES.V8_PAYLOAD_UNSUPPORTED` (`MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED`) | removed in [18](#18-transactions-are-handles-1533) |
| `types` | `V8TxBytes`, `V9Tx` | removed in [18](#18-transactions-are-handles-1533) |
| `types` | `V9WalletProvider` | `Ledger9WalletProvider` |
| `types` | `unwrapV9` | removed in [18](#18-transactions-are-handles-1533) |
| `types` | `FinalizedTxDataV8` | `Ledger8FinalizedTxData` |
| `contracts` | `FoundDeployTxPublicDataV8` | `Ledger8FoundDeployTxPublicData` (flat, not in the `Ledger8` namespace: it is part of the current era's `FoundDeployTxData`) |
| `contracts` | `Ledger8.DeployOnV9Error` | `Ledger8.DeployOnLedger9Error` |
| `contracts` | `Ledger8.createCircuitCallTxInterface` | `createCircuitCallTxInterface`, on the flat surface; it takes a ledger 8 or a ledger 9 contract (#1523) |
| `contracts` | `CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9` (`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_V9`) | `LEDGER8_DEPLOY_ON_LEDGER9` (`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_LEDGER9`) |
| `protocol` | `ProtocolV8` | `Ledger8Protocol` |
| `protocol` | `proveV8Transaction` (`./prove`) | `proveLedger8Transaction` |
| `protocol` | `loadLedger8` | `loadLedger8Protocol` (it returns `Ledger8Protocol`) |
| `types` | `createProofProviderForEras` | `createProofProviderFromProvingProviders` (it takes `ProvingProvidersByEra`) |
| `types` | `VersionedTx` | removed in [18](#18-transactions-are-handles-1533) |
| `indexer-public-data-provider` | `EraUnsupportedError` (`MIDNIGHT_JS_PR_ERA_UNSUPPORTED`) | `DecoderEraUnsupportedError` (`MIDNIGHT_JS_PR_DECODER_ERA_UNSUPPORTED`) |
| `indexer-public-data-provider` | `EraUnresolvableError` (`MIDNIGHT_JS_PR_ERA_UNRESOLVABLE`) | `UnknownRecordEraError` (`MIDNIGHT_JS_PR_UNKNOWN_RECORD_ERA`) |
| `contracts` | `UnrecognisedResultEraError` (`MIDNIGHT_JS_C_UNRECOGNISED_RESULT_ERA`) | `UnknownResultEraError` (`MIDNIGHT_JS_C_UNKNOWN_RESULT_ERA`) |
| `contracts` | `ScopedTxEraUnsupportedError` (`MIDNIGHT_JS_C_SCOPED_TX_ERA_UNSUPPORTED`) | `ScopedTransactionEraUnsupportedError` (`MIDNIGHT_JS_C_SCOPED_TRANSACTION_ERA_UNSUPPORTED`) |
| `contracts` | `ScopedTransactionIdentityMismatchError`'s code `MIDNIGHT_JS_C_SCOPED_TX_IDENTITY_MISMATCH` (the class is from 4.x; the code is new in 5.0) | `MIDNIGHT_JS_C_SCOPED_TRANSACTION_IDENTITY_MISMATCH` |
| `indexer-public-data-provider` | `IndexerDataError` kind `'unresolvable-era'` | removed, with no replacement: the raw reads tag a record by its version tag ([14a](#14a-changed-signatures)) |

The era values `'v8' | 'v9'` do not change: they mirror the `ledger-v8` /
`ledger-v9` package names.

One consequence to check in your own code: `result.era` and `result.public.era`
now take the same values. Before, comparing the wrong one against a literal of
the other was a compile error; now it compiles. `era` names the pipeline that
built the result's objects, `public.era` the ledger that recorded the transaction,
and after the fork a retained-era call has `era: 'v8'` with `public.era: 'v9'`.

---

## 13. `queryDeployContractState` is version-tagged, and the indexer floor is `4.4.0-rc.6` (#1452)

`PublicDataProvider.queryDeployContractState` now resolves to
`ContractStateRead | null` instead of `ContractState | null`
([section 20](#20-on-chain-state-is-bytes-decoded-by-your-own-runtime-1550)). It
reads the deploy's record, or the latest update's record when the contract has
been updated. The state comes back as bytes, with the `era` of the ledger
that wrote them; a v8 record is never translated to the v9 encoding. Decode it
with your own runtime:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const deployState = await publicDataProvider.queryDeployContractState(address);
const state = deployState?.contractState.deserialize({ v9: ContractState });
```

If you implement `PublicDataProvider` yourself, return a `ContractStateRead`.

`indexerPublicDataProvider` now requires **indexer `4.4.0-rc.6` or later**. It
selects `stateAt` on every contract-state read, and older indexers do not serve
that field. The framework's test environments pin the build tag
`4.4.0-rc.6-68702121`.

---

## 14. One rule for era-dependent values: every read and `submitTx` are era-tagged (#1508)

`era: 'v8' | 'v9'` now has one meaning on every public type: the ledger era that **wrote**
the value. The era of the block that dated a read stays in `protocolVersion`. A finalized-transaction
record is the `FinalizedTxRead` union; narrow it with `switch (value.era)` closed by `assertNever`, or,
in code that handles only v9, with `requireLedger9(value, '<call site>')` from
`@midnight-ntwrk/midnight-js-utils`, which throws `Ledger8ValueUnsupportedError` on a v8 value. An
on-chain state is a `SerializedState` (its bytes and the `era` that wrote them), the same shape in both eras
([section 20](#20-on-chain-state-is-bytes-decoded-by-your-own-runtime-1550)).

### 14a. Changed signatures

| Where | Before | After |
|---|---|---|
| `PublicDataProvider.queryContractState` | `Promise<ContractState \| null>` | `Promise<ContractStateAndParametersRead \| null>` |
| `PublicDataProvider.watchForContractState` | `Promise<ContractState>` | `Promise<ContractStateRead>` |
| `PublicDataProvider.contractStateObservable` | `Observable<PositionedRecord<ContractState>>` | `Observable<PositionedRecord<ContractStateRead>>` |
| `PublicDataProvider.queryZSwapAndContractState` | `Promise<[ZswapChainState, ContractState, LedgerParameters] \| null>` | `Promise<PublicStatesRead \| null>` (an object, not a tuple) |
| `ContractEventBase.version` | payload schema version | renamed to `payloadVersion` |
| `getPublicStates` (contracts) | `Promise<PublicContractStates>` | `Promise<PublicStatesRead>` |
| `getStates` (contracts) | `ContractStates<PS>` (an interface) | `ContractStates<PS> = PublicStatesRead & { privateState }` |
| `PublicContractStates` (contracts) | exported | removed; use `PublicStatesRead` from types |
| `Ledger8FoundContract.deployTxData` (and `Ledger8DeployedContract`) | the flat `FinalizedTxRead` | `{ public: FinalizedTxRead }` |
| `SubmitTxOptions.unprovenTx` | `UnprovenTransaction` | `UnprovenTx` (a transaction handle, [8a](#8a-the-three-transaction-methods)) |
| `submitTx` | `Promise<FinalizedTxData>` | `Promise<FinalizedTxRead>` |
| `TransactionContext.getCurrentStates` | `ContractStates<PS> \| PublicContractStates` | `PublicStatesRead \| undefined`, as bytes ([section 20](#20-on-chain-state-is-bytes-decoded-by-your-own-runtime-1550)) |
| `IndexerDataError` kind `unknown-record-era` | raised by the raw reads | removed; the contract-state reads tag by the version tag of the bytes |
| `IndexerDataError.unresolvableEra` | static factory | removed |
| `IndexerDataErrorContext` | — | new kinds `mixed-era-public-states` and `malformed-protocol-version`; an exhaustive `switch` on `kind` must handle them |
| `queryContractState`, `contractStateObservable` | never compared the ledger version of the bytes with the block | refuse bytes of a newer ledger version than a checked dating block (`era-disagreement`) and a malformed `protocolVersion` (`malformed-protocol-version`) |
| `EraArtifactMismatchReason` | — | new members `ledger9-transaction-on-ledger8-network` and `ledger8-transaction-on-ledger9-network` ([14c](#14c-submittx-routes-on-the-networks-ledger-version)) |

### 14b. What a pre-fork state does now

The reads — `queryContractState`, `watchForContractState`, `contractStateObservable`
and `queryZSwapAndContractState` — return a v8 state as bytes with `contractState.era === 'v8'`
instead of throwing `IndexerDataError` `unsupported-decode-era`.
`findDeployedContract`, `createUnprovenCallTx`, a cross-contract callee read and the maintenance
reads still need a v9 state: for a v8 one they now throw `Ledger8.ContractStateUnsupportedError`,
naming the contract, instead of `unsupported-decode-era`. `contractStateObservable` emits a pre-fork
record as a v8 value and keeps going, so a replay that starts before the fork no longer ends on
its first record.

`queryZSwapAndContractState` returns every state of a v8 block as bytes with
`era: 'v8'`. A contract state and ledger parameters from different
eras are refused as `IndexerDataError` kind `mixed-era-public-states`. On the supported indexer
(4.4.0-rc.6 or later, see migration step 17) a pinned read never meets this.

### 14c. `submitTx` routes on the network's ledger version

`submitTx` / `submitTxAsync` read the network's ledger version once and accept only a transaction
of that era. A transaction of the other era is refused before proving, as `EraArtifactMismatchError`:
a v9 transaction before the fork with reason `ledger9-transaction-on-ledger8-network`, a v8
transaction after the fork with reason `ledger8-transaction-on-ledger9-network`. Both reasons are
new members of `EraArtifactMismatchReason`, so an exhaustive `switch` on `reason` must handle them.
A value that is not an `UnprovenTx` handle is refused as `InvalidTransactionHandleError` before the
network's ledger version is read.

The network's ledger version is read once, before proving. If the network crosses the fork while the transaction is
being proved, the node refuses it and the refusal arrives as `ProviderFailedError` from `submitTx`
([14e](#14e-every-submit-path-reports-a-provider-rejection-as-providerfailederror)). Read the network's ledger version
again and rebuild the transaction for the new era.

```ts
// Before
await submitTx(providers, { unprovenTx });
// After
await submitTx(providers, { unprovenTx: LedgerTransaction.seal('v9', 'Unproven', unprovenTx) });
```

### 14d. New exports

- `requireLedger9`, `Ledger9Variant`, `Ledger8ValueUnsupportedError`
  (`MIDNIGHT_JS_U_LEDGER8_VALUE_UNSUPPORTED`), `UnrecognisedEraTagError`
  (`MIDNIGHT_JS_U_UNRECOGNISED_ERA_TAG`) — utils. `requireLedger9` does not compile for a type
  with no v9 variant.
- `Ledger8.ContractStateUnsupportedError` (`MIDNIGHT_JS_C_LEDGER8_CONTRACT_STATE_UNSUPPORTED`) —
  contracts. `findDeployedContract`, `createUnprovenCallTx`, a cross-contract callee read and the
  maintenance reads raise it, with the contract address, for a state the v8 ledger wrote.
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
`InvalidTransactionHandleError` and the other coded refusals still arrive as themselves.

---

## 15. Names bound to one ledger are named after it (#1490)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already use the new
names.

"Current" and "retained" change meaning at every hard fork: today "current" is
ledger 9 and "retained" is ledger 8. A name whose code is bound to one ledger
now says which ledger (ADR 0018). Names that follow the era on purpose keep
"current" / "retained": `CurrentLedgerVersion` and `RetainedLedgerVersion`. The
handler types that used to follow the era are gone: the factories now take one
handler per ledger era ([18](#18-transactions-are-handles-1533)).
The README glossary defines both terms.

| Package | Before | After |
|---|---|---|
| `protocol` (`./v8/engine`) | `RetainedContract` | `Ledger8EngineContract` |
| `protocol` (`./v8/engine`) | `RunRetainedCircuitOptions`, `RunRetainedConstructorOptions` | `Ledger8CircuitOptions`, `Ledger8ConstructorOptions` |
| `protocol` (`./v8/engine`) | `Ledger8Engine.reexpressOperationsForCurrentEra` | `reexpressOperationsForLedger9` |
| `protocol` | `RetainedEraSubpath` (also on the `midnight-js` barrel) | `Ledger8Subpath` |
| `types` | `CurrentEraProver`, `CurrentEraBalancer`, `CurrentEraSubmitter` | removed in [18](#18-transactions-are-handles-1533) |
| `contracts` | `RetainedArtifactOnCurrentEraStateError` (flat) | `Ledger8.ArtifactOnLedger9StateError` (in the `Ledger8` namespace, like every other ledger 8 refusal; ADR 0013) |
| `contracts` | `CONTRACTS_ERROR_CODES.RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE` (`MIDNIGHT_JS_C_RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE`) | `LEDGER8_ARTIFACT_ON_LEDGER9_STATE` (`MIDNIGHT_JS_C_LEDGER8_ARTIFACT_ON_LEDGER9_STATE`) |
| `contracts` | `EraArtifactMismatchReason` `'unwrapped-current-era-contract'` | `'unwrapped-ledger9-contract'` |
| `contracts` | `EraArtifactMismatchReason` `'current-era-artifact-on-pre-fork-head'` | `'ledger9-artifact-on-ledger8-network'` |
| `contracts` | `EraArtifactMismatchReason` `'current-era-transaction-on-pre-fork-head'` | `'ledger9-transaction-on-ledger8-network'` |
| `contracts` | `EraArtifactMismatchReason` `'retained-era-transaction-on-post-fork-head'` | `'ledger8-transaction-on-ledger9-network'` |
| `contracts` | breadcrumb `decision: 'retained-signing-key-entry'` | `'ledger8-signing-key-entry'` |

The breadcrumb `decision` value reaches your logs. Update any log filter or
alert that matches the old value.

Error messages now name the ledger ("the ledger 8 (pre-fork) Compact
toolchain", "a ledger 9 state") instead of saying only "retained" or "current".
Match errors on their `code`, not their message (ADR 0017).

---

## 16. Retained-era handles: one `deployTxData` shape and one signing-key type (#1514)

`Ledger8FoundContract` and `Ledger8DeployedContract` now carry `deployTxData` as
`{ era, public, private }`, the shape the current era's handles have. The deployer's data moved
off the top level, and the retained era's signing key is now the current era's `SigningKey`,
`{ tag, value }`.

| Where | Before | After |
|---|---|---|
| `Ledger8FoundContract.deployTxData` | `{ public: FinalizedTxRead }` | `Ledger8FoundDeployTxData<C>`: `{ era: 'v8', public: FinalizedTxRead & { contractAddress }, private: { signingKey, initialPrivateState } }` |
| `Ledger8DeployedContract.deployTxData` | `{ public: FinalizedTxRead }` | `Ledger8DeployTxData<C>`: `public` adds `initialContractState`, `initialContractStateBytes`; `private` adds `initialZswapState` |
| `Ledger8FoundContract.signingKey` | `Ledger8SigningKey \| undefined` (bare hex) | removed; `deployTxData.private.signingKey: SigningKey \| undefined` |
| `Ledger8DeployedContract.signingKey` | `Ledger8SigningKey` | removed; `deployTxData.private.signingKey: SigningKey` |
| `Ledger8DeployedContract.initialContractState`, `initialContractStateBytes` | top level | `deployTxData.public.*` |
| `Ledger8DeployedContract.initialPrivateState`, `initialZswapState` | top level | `deployTxData.private.*` |
| `Ledger8DeployContractOptions.signingKey`, `Ledger8FindDeployedContractOptions.signingKey` | `Ledger8SigningKey` (bare hex) | `SigningKey` |
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

The maintenance functions take a retained-era artifact as well, before the fork, and every
maintenance result is now nested like every other `contracts` result.

| Where | Before | After |
|---|---|---|
| `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx` | `Promise<FinalizedTxData>` | `Promise<FinalizedMaintenanceTxData>`, `{ era: 'v9', public: FinalizedTxData }`; a retained-era artifact resolves `Promise<Ledger8FinalizedMaintenanceTxData>`, `{ era: 'v8', public: Ledger8FinalizedTxData }` |
| `submitReplaceAuthorityTx(...)` | `(newAuthority) => Promise<FinalizedTxData>` | `(newAuthority) => Promise<FinalizedMaintenanceTxData>`, or the retained-era result for a retained-era artifact |
| `CircuitMaintenanceTxInterface`, `ContractMaintenanceTxInterface` methods | `Promise<FinalizedTxData>` | `Promise<FinalizedMaintenanceTxData>` |
| `createCircuitMaintenanceTxInterface(s)`, `createContractMaintenanceTxInterface` | current-era artifact only | also a retained-era artifact, answering `Ledger8CircuitMaintenanceTxInterface(s)` / `Ledger8ContractMaintenanceTxInterface` |
| `Ledger8FoundContract`, `Ledger8DeployedContract` | no maintenance members | `circuitMaintenanceTx`, `contractMaintenanceTx` |
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

A retained-era maintenance update after the fork is refused with
`Ledger8.MaintenanceOnLedger9Error` (`LEDGER8_MAINTENANCE_ON_LEDGER9`). After the fork, recompile
the contract with the ledger 9 Compact toolchain and call the same function with that artifact.

New refusals on the retained path:

| Class | Code | When |
|---|---|---|
| `Ledger8.MaintenanceOnLedger9Error` | `LEDGER8_MAINTENANCE_ON_LEDGER9` (USAGE) | retained-era artifact after the fork |
| `Ledger8.SigningKeyUnavailableError` | `LEDGER8_SIGNING_KEY_UNAVAILABLE` (USAGE) | no usable key stored, or the store cannot be read (on `cause`) |
| `Ledger8.SigningKeyNotStoredError` | `LEDGER8_SIGNING_KEY_NOT_STORED` (ENVIRONMENT) | a confirmed replacement whose new key the store refused; carries the key |
| `Ledger8.ReplaceAuthorityUnconfirmedError` | `LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED` (UNCERTAIN) | a submitted replacement whose outcome could not be confirmed; carries the new key, which was not stored |
| `MaintenanceAuthorityMismatchError` (protocol) | `MIDNIGHT_JS_P_MAINTENANCE_AUTHORITY_MISMATCH` (USAGE) | the stored key cannot sign for the contract's authority (`reason`: `'not-first-member'`, `'empty-committee'`, `'threshold-above-one'`); raised before proving |
| `Ledger8.InsertVerifierKeyTxFailedError`, `Ledger8.RemoveVerifierKeyTxFailedError`, `Ledger8.ReplaceMaintenanceAuthorityTxFailedError` | `TX_FAILED` (inherited from `AnyEraTxFailedError`) | the chain recorded a non-success status; each names the contract, the first two the circuit, and the third carries the new key |

A retained-era replacement key must be a `schnorr` key; any other is refused with
`Ledger8.SigningKeyUnusableError` before anything is composed.

---

## 18. Transactions are handles (#1533)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already describe
the final shape.

The pre-releases carried a transaction across the provider methods as a
`version`-tagged record: `{ version: 'v9', tx }` for the current era, and
`{ version: 'v8', txBytes }` for the retained one. That record changed shape at
every fork, and its bytes carried no stage. It is replaced by one opaque handle
per stage, `UnprovenTx`, `UnboundTx` and `FinalizedTx`
([8a](#8a-the-three-transaction-methods), ADR 0019). A handle holds a live
ledger object in both eras.

```diff
- const proven = unwrapLedger9(await proofProvider.proveTx({ version: 'v9', tx: unprovenTx }), 'proveTx');
+ const proven = LedgerTransaction.unwrap(
+   await proofProvider.proveTx(LedgerTransaction.seal('v9', 'Unproven', unprovenTx)),
+   'v9'
+ );
```

The per-era factories take one key per ledger era instead of `currentEra` and
`retainedEras`, and a v8 handler receives a live ledger 8 object instead of
bytes:

```diff
  createProofProviderFromHandlers({
-   currentEra: (tx) => tx.prove(provingProvider, CostModel.initialCostModel()),
-   retainedEras: { v8: (txBytes) => proveLedger8Transaction(txBytes, ledger8ProvingProvider) }
+   v8: (tx) => proveLedger8Transaction(tx, ledger8ProvingProvider),
+   v9: (tx) => tx.prove(provingProvider, CostModel.initialCostModel())
  });
```

`createProofProviderFromProvingProviders` takes `{ v8, v9, costModel? }` the same
way.

| Package | Before | After |
|---|---|---|
| `types` | `VersionedTransaction<T>`, `VersionedUnprovenTransaction`, `VersionedUnboundTransaction`, `VersionedFinalizedTransaction` | `UnprovenTx`, `UnboundTx`, `FinalizedTx` (`LedgerTransaction<Stage>`) |
| `types` | `Ledger8TransactionBytes`, `Ledger9Transaction` | removed; a handle carries either era |
| `types` | `unwrapLedger9(payload, method)` | `LedgerTransaction.unwrap(handle, era)` |
| `types` | `narrowToEra`, `EraRequest`, `erasServedBy`, `RetainedEraEntries` | removed; the factories route by `handle.era` and compute `supportedEras` themselves |
| `types` | `currentEra` / `retainedEras` keys of `ProofProviderHandlers`, `WalletProviderHandlers`, `MidnightProviderHandlers`, `ProvingProvidersByEra` | one key per ledger era, `v8` and `v9`; `undefined` for an era not served |
| `types` | `Ledger9Prover`, `RetainedEraProver`, `Ledger9Balancer`, `RetainedEraBalancer`, `Ledger9Submitter`, `RetainedEraSubmitter` | removed; the handler types are written per era inside the `…Handlers` types |
| `types` | `Ledger8PayloadUnsupportedError` (`MIDNIGHT_JS_PR_LEDGER8_PAYLOAD_UNSUPPORTED`) | `ProviderEraUnsupportedError` (`MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED`), raised by the provider method for an era it has no handler for |
| `types` | `UntaggedPayloadError` | `InvalidTransactionHandleError` (`MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE`), reason `not-a-handle` |
| `protocol` | `Ledger8InstanceMismatchError` (`MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH`) | `ForeignLedgerTransactionError` (`MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION`) in `types`, raised by `LedgerTransaction.seal` |
| `types` | `Ledger8FinalizedTxData.tx` (a v8 ledger object) | `FinalizedTx`; read it with `LedgerTransaction.unwrap(record.tx, record.era)` |
| `contracts` | `Ledger8CallResultPrivate.txBytes` | `unprovenTx: UnprovenTx`, a v8 handle before the fork and a v9 handle after it |
| `contracts` | `SubmitTxOptions.unprovenTx: VersionedUnprovenTransaction` | `UnprovenTx` |

New codes, all in `PROVIDER_ERROR_CODES`:

| Class | Code | Category | When |
|---|---|---|---|
| `ForeignLedgerTransactionError` | `MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION` | ENVIRONMENT | `seal` got an object of another ledger copy (`foreign-instance`), or a v8 object before `loadLedger8Protocol()` resolved (`ledger8-not-loaded`) |
| `InvalidTransactionHandleError` | `MIDNIGHT_JS_PR_INVALID_TRANSACTION_HANDLE` | USAGE | a value that is not a handle of this package (`not-a-handle`), a handle at the wrong stage (`wrong-stage`), or `seal` with an unknown stage (`invalid-stage`) |
| `TransactionEraMismatchError` | `MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH` | USAGE | `unwrap` asked for one era, the handle carries the other |

A provider built from handlers with no era served at all is refused when it is
built, with `InvalidArgumentError`.

## 19. Plain-language names for era errors and version reads (#1491)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already use the new
names.

Names, field names and string values that used maintainer words ("envelope", "head", "axis", "down-convert")
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
| `protocol` | `DownConvertStage` = `'v8 envelope extraction' \| 'v9 envelope extraction' \| 'state down-convert'` | `StateConversionStage` = `'v8 state read' \| 'v9 state read' \| 'state conversion'` |
| `contracts` | `EraArtifactMismatchReason` values `'ledger9-artifact-on-ledger8-head'`, `'ledger9-transaction-on-ledger8-head'`, `'ledger8-transaction-on-ledger9-head'` | `'ledger9-artifact-on-ledger8-network'`, `'ledger9-transaction-on-ledger8-network'`, `'ledger8-transaction-on-ledger9-network'` |
| `contracts` | `SubmitRejectionUndiagnosedCause` reason `'head-read-failed'` and its `headReadFailure` field | `'network-version-read-failed'` and `networkVersionReadFailure` |
| `contracts` | `SubmitRejectionUndiagnosedCause` reason `'head-moved-backwards'` | `'network-version-went-backwards'` |
| `contracts` | `head` field on `SubmittedOperation`, `NetworkVersionStateMismatchError`, `IndexerInconsistencyError` and `ScopedTransactionEraUnsupportedError` | `networkVersion` |
| `indexer-public-data-provider` | `IndexerDataError.missingHeadBlock()` and context kind `'missing-head-block'` | `IndexerDataError.missingLatestBlock()` and `'missing-latest-block'` |
| `indexer-public-data-provider` | `envelopeVersion` field on the `'era-disagreement'` context | `stateVersion` (as on `'mixed-era-public-states'`) |
| `contracts` (log breadcrumbs) | `decision: 'head-resolution'`, `source: 'contract-state-envelope-tag'` | `decision: 'network-version-read'`, `source: 'contract-state-version-tag'` |

Removed, with no replacement, because nothing in the framework raised them:

| Package | Removed |
|---|---|
| `protocol` | `UnknownLedger8AxisError` (`MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS`) and the `Ledger8InstanceAxis` type |
| `protocol` | `MerkleNotRehashedError` (`MIDNIGHT_JS_P_MERKLE_NOT_REHASHED`) |

Error messages changed wording to match. Match errors on their `code`, not
their message (ADR 0017).

## 20. On-chain state is bytes, decoded by your own runtime (#1550)

This section affects you only if you built against a `5.0.0` pre-release. The
names below were never in a 4.x release. The sections above already describe
the final shape.

The pre-releases returned a contract state in three shapes: decoded for v9 and
bytes for v8 (`VersionedContractState`), bytes for both (`RawContractState`),
and plain data (`AnyEraContractState`). A state decoded by the framework was
refused by a dApp's own `ledger()` with `expected instance of ChargedState`
whenever the package manager installed two copies of the runtime, and the v9
shape would have changed again at the next fork.

Now every value read from the network — a contract state, ledger parameters, a
zswap chain state — is a `SerializedState` from `@midnight-ntwrk/midnight-js-types`:
the bytes, a `kind` and the `era` of the ledger that wrote them. You decode it
with the runtime your contract was compiled against (ADR 0020):

```diff
- const state = await publicDataProvider.queryContractState(address);
- const counter = ledger(requireLedger9(state, 'readCounter').state.data);
+ import { ContractState } from '@midnight-ntwrk/compact-runtime';
+
+ const read = await publicDataProvider.queryContractState(address);
+ if (read !== null) {
+   const counter = ledger(read.contractState.deserialize({ v9: ContractState }).data);
+ }
```

`deserialize` calls only the decoder for the state's own `era`. Pass one per
era you can read. A state written by an era you passed no decoder for is
refused with `SerializedStateDecoderMissingError`, whose message names the class to
import. A decoder that throws, for example one for another kind, is reported as
`SerializedStateDecodeFailedError`, with the decoder's error as `cause`. A decoder
error that is already a `MidnightJsError` is rethrown unchanged. Passing no
decoder for any era the state can be does not compile.

A `SerializedState` keeps its bytes in a private field, so `structuredClone`,
`postMessage` and JSON drop them. To send one to a worker or store it, send
`serialize()` and `era` and rebuild it with `SerializedState.fromBytes`.

| Package | Before | After |
|---|---|---|
| `types` | `queryContractState`: `VersionedContractState` | `ContractStateAndParametersRead`: `{ protocolVersion, contractState, ledgerParameters }` |
| `types` | `watchForContractState`, `queryDeployContractState`: `VersionedContractState` | `ContractStateRead`: `{ protocolVersion, contractState }` |
| `types` | `contractStateObservable`: `PositionedRecord<VersionedContractState>` | `PositionedRecord<ContractStateRead>`; a stream carries no ledger parameters |
| `types` | `queryZSwapAndContractState`: `VersionedPublicStates` | `PublicStatesRead`: `{ protocolVersion, contractState, zswapChainState, ledgerParameters }`, all of one era |
| `types` | `queryRawContractState` | removed; `queryContractState` serves the same bytes and the block's ledger parameters |
| `types` | `rawContractStateObservable` | removed; use `contractStateObservable` |
| `types` | `RawContractState`, `VersionedContractState`, `VersionedPublicStates`, `Ledger8ContractStateBytes`, `Ledger9ContractState`, `Ledger8PublicStates`, `Ledger9PublicStates` | removed; use `ContractStateRead`, `ContractStateAndParametersRead`, `PublicStatesRead` and `SerializedState` |
| `contracts` | `getPublicStates`: `VersionedPublicStates`; `getStates`, `ContractStates<PS>`: `VersionedPublicStates & { privateState }` | `PublicStatesRead`; `PublicStatesRead & { privateState }` |
| `contracts` | `TransactionContext.getCurrentStates()`: `ContractStates<PS> \| PublicContractStates` | `PublicStatesRead \| undefined`: the running contract state and the scope's parameters and zswap chain state, as bytes. The running private state is `getLastUnsubmittedCallTxDataToTransact()?.[0].private.nextPrivateState` |
| `contracts` | `getAnyEraContractState`, `AnyEraContractState`, `AnyEraContractStateReadSurface` | removed; read with `queryContractState` and decode with your own runtime |
| `indexer-public-data-provider` | `parseHexContractState`, `parseHexLedgerParameters`, `parseHexZswapState` | removed; the provider decodes nothing |
| `indexer-public-data-provider` | `IndexerDataError` kinds `unsupported-decode-era`, `unsupported-parameters-era` | removed; a v8 state is served as bytes |
| `indexer-public-data-provider` | — | new `IndexerDataError` kinds `malformed-zswap-encoding`, `malformed-zswap-state` and `parameters-era-disagreement`; an exhaustive `switch` on `kind` must handle them |
| `indexer-public-data-provider` | `queryContractState` on a block without ledger parameters | refused with `IndexerDataError` `malformed-parameters-encoding` |
| `types` | `VersionedFinalizedTxData`, discriminated by `version` | `FinalizedTxRead`, discriminated by `era`, like a handle and a state: narrow with `switch (record.era)` and read `LedgerTransaction.unwrap(record.tx, record.era)` |
| `utils` | `requireLedger9`, `Ledger9Variant`, `UnrecognisedEraTagError` read `version` | they read `era`; `UnrecognisedEraTagError.received` is what `era` held |

New in `types`: `SerializedState`, `StateKind`, `StateDecoder`,
`StateDecoders`, `DecodedState`, `DecodersFor`, `ContractStateRead`,
`ContractStateAndParametersRead`, `PublicStatesRead`, `InvalidSerializedStateReason`.
New in `protocol` (`./version`): `LEDGER_STATE_TAGS`, `LEDGER_STATE_KINDS`,
`StateKind`.

New codes:

| Class | Code | Category | When |
|---|---|---|---|
| `InvalidSerializedStateError` | `MIDNIGHT_JS_PR_INVALID_LEDGER_STATE` | USAGE | `SerializedState.fromBytes` got bytes that do not start with the tag the ledger of `era` writes for `kind` (`tag-mismatch`), a value that is not a `Uint8Array` (`not-bytes`), or an unknown `kind` (`unknown-kind`); or the constructor was called without `fromBytes` (`not-from-bytes`) |
| `SerializedStateDecoderMissingError` | `MIDNIGHT_JS_PR_LEDGER_STATE_DECODER_MISSING` | USAGE | `deserialize` got no decoder for the state's `era` |
| `SerializedStateDecodeFailedError` | `MIDNIGHT_JS_PR_LEDGER_STATE_DECODE_FAILED` | INTEGRITY | the decoder for the state's `era` threw an error that is not a `MidnightJsError`: the bytes are corrupt or the decoder is for another kind; its error is the `cause` |
| `PublicStatesEraMismatchError` (`contracts`) | `MIDNIGHT_JS_C_PUBLIC_STATES_ERA_MISMATCH` | INTEGRITY | the ledger parameters or the zswap chain state served to build a call are missing or of another era than the call (`expected`); raised on the v9 path and in the v8 pipeline |

Reading a v8 state no longer loads the ledger 8 runtime.

Not changed by this section: `DeployTxData.initialContractState` and the
initial states you pass to build a call are still decoded `ContractState`
objects.

If you implement `PublicDataProvider` yourself, build each state with
`SerializedState.fromBytes(era, kind, bytes)`, taking `era` from the bytes'
own version tag (`ledgerVersionOfContractState` and
`ledgerVersionOfLedgerParameters` from `@midnight-ntwrk/midnight-js-utils`).
`SerializedState.isSerializedState(value)` tells a `SerializedState` of this copy of the
package from a look-alike object.

`contracts` also accepts a `SerializedState` made by a second installed copy of
`@midnight-ntwrk/midnight-js-types`: it rebuilds each state from its `era`,
`kind` and `serialize()` with `SerializedState.fromBytes`, which checks the tag
again. Bytes that do not carry the tag of the era they claim are refused with
`InvalidSerializedStateError` (`tag-mismatch`).

The v8 pipeline (keep-state and ledger 8 maintenance) refuses ledger parameters
served in a shape that is not a `SerializedState` with `UnrecognisedEraTagError`,
instead of taking them as absent. Parameters not served at all still give
`LedgerParametersUnservedError`.

## 21. Unnamed protocol subpaths removed (#1536)

`@midnight-ntwrk/midnight-js-protocol` names the ledger in each subpath that
depends on one. These 4.x subpaths and root namespaces are removed:

| Removed | Use instead |
|---|---|
| `/ledger` | `/v9` |
| `/compact-runtime` | `/v9/compact-runtime` |
| `/compact-js` | `/v9/compact-js` |
| `/compact-js/effect` | `/v9/compact-js/effect` |
| `/compact-js/effect/Contract` | `/v9/compact-js/effect/Contract` |
| `/onchain-runtime` | `/v9/onchain-runtime` |
| root `ledger` namespace | `import * as ledger from '…/v9'` |
| root `compactRuntime` namespace | `import * as compactRuntime from '…/v9/compact-runtime'` |
| root `compactJs` namespace | `import * as compactJs from '…/v9/compact-js'` |
| root `onchainRuntime` namespace | `import * as onchainRuntime from '…/v9/onchain-runtime'` |

The ledger 8 engine moved from `/engine` to `/v8/engine`, and `Ledger8RuntimeMissingError.subpath`
names it `'/v8/engine'`. Code outside `protocol` imports only its types; `loadLedger8Engine()` loads it.

**Why:** the unnamed subpaths served ledger 8 in 4.x and ledger 9 in 5.0.0, and
would serve ledger 10 after the next fork. A `./vN` subpath always serves the
same ledger; the next ledger adds `./v10` and `./v10/*` next to it.

**Impact:** each old import fails to resolve at build time. Replace it as the
table shows — see Step 20 of the [migration guide](./migration-guide.md).
`platform`, the `./platform-js` subpaths and `./compact-js/v8/effect` are
unchanged.

---

## 22. Ledger 9 types carry the `Ledger9` prefix; flat names pick the era (#1536)

Every ledger 9 result, option and interface type that has a `Ledger8`
counterpart is now `Ledger9*`, and the flat name picks the variant from the
contract type. A flat name no longer silently
moves to the next ledger at a fork.

**Types with a contract parameter.** The flat name stays and becomes an alias:

```ts
type FoundContract<C> = C extends Ledger8Contract ? Ledger8FoundContract<C>
  : C extends Ledger9Contract ? Ledger9FoundContract<C>
  : never;
```

This applies to `FoundContract`, `DeployedContract`, `FinalizedCallTxData`,
`SubmittedCallTx`, `UnsubmittedCallTxData`, `FoundDeployTxData`,
`FinalizedDeployTxData`, `CallResultPrivate`, `CallTxOptions`,
`CallTxOptionsBase`, `CallTxOptionsWithPrivateStateId`, `DeployContractOptions`,
`DeployContractOptionsBase`, `DeployContractOptionsWithPrivateState`,
`FindDeployedContractOptions`, `CircuitCallTxInterface`,
`CircuitMaintenanceTxInterfaces` and `ContractProviders`.

Code with a concrete contract (`FoundContract<typeof MyContract>`) does not
change. Generic code must name the era: a circuit id of a generic contract
(`PCK extends Contract.ProvableCircuitId<C>`) does not satisfy the alias, so
write `Ledger9FinalizedCallTxData<C, PCK>`, `Ledger9CallTxOptions<C, PCK>` and so
on. The entry points return the `Ledger9*` type, which is also what an editor
shows.

`ContractProviders` lost its third parameter (`PS`): the private state type comes
from the contract. Use `Ledger9ContractProviders<C, PCK, PS>` to pass it.

**Types without a contract parameter.** Renamed, with no flat alias, because
nothing tells the eras apart (section 24 adds `FinalizedMaintenanceTxData` back as the
union of both eras):

| Before | After |
|---|---|
| `FinalizedTxData` (types) | `Ledger9FinalizedTxData` |
| `UnboundTransaction` (types) | `Ledger9UnboundTransaction` |
| `FinalizedMaintenanceTxData` | `Ledger9FinalizedMaintenanceTxData` |
| `FinalizedCallTxPublicData` | `Ledger9FinalizedCallTxPublicData` |
| `FinalizedDeployTxPublicData` | `Ledger9FinalizedDeployTxPublicData` |
| `CallResultPublic` | `Ledger9CallResultPublic` |
| `CircuitMaintenanceTxInterface` | `Ledger9CircuitMaintenanceTxInterface` |
| `ContractMaintenanceTxInterface` | `Ledger9ContractMaintenanceTxInterface` |

For a value of either era, use the unions: `FinalizedTxRead`,
`AnyEraMaintenanceTxData`.

`types` no longer re-exports the ledger 9 `Transaction` class; import it from
`@midnight-ntwrk/midnight-js-protocol/v9`. Earlier sections of this document use the names
before this rename.

New: `Ledger9Contract` (the ledger 9 `Contract.Any`), `AnyEraContract` and
`CircuitIdOf<C>`. See ADR 0013 and ADR 0018.

---

## 23. Ledger 8 types are flat `Ledger8*` names (#1561)

The `Ledger8` namespace no longer has type members. Each ledger 8 type is a flat
export with the `Ledger8` prefix, like the `Ledger9*` types:

| Before | After |
|---|---|
| `Ledger8.FoundContract<C>` | `Ledger8FoundContract<C>` |
| `Ledger8.DeployedContract<C>` | `Ledger8DeployedContract<C>` |
| `Ledger8.FinalizedCallTxData<C, PCK>` | `Ledger8FinalizedCallTxData<C, PCK>` |
| `Ledger8.Contract` | `Ledger8Contract` |
| `Ledger8.X` (any of the 37 types) | `Ledger8X` |

Why: the entry points return these types by their `Ledger8*` names. A dApp built
with `declaration: true` that exports a value inferred from a ledger 8 call failed
with TS4023 ("has or is using name 'Ledger8DeployedContract' ... but cannot be
named"), because the package exported the type only through the namespace.

The error classes were first left in the namespace. That did not last: the namespace is
removed and the errors are merged, see [section 25](#25-one-error-class-per-fault-1557). See ADR 0013.

---

## 24. Types for both eras carry no prefix (#1566)

One rule for names: a `Ledger8` / `Ledger9` prefix means bound to one ledger. No prefix
means valid for every era: with a contract parameter the name picks the era from the
contract; without one it is the union of all eras. An `Any` prefix keeps its meaning of
any contract and any circuit. Earlier sections of this document use
the names before this rename.

**Types.**

| Before | After |
|---|---|
| `AnyEraContract` | `AnyContract` |
| `AnyEraFinalizedCallTxData` | `AnyFinalizedCallTxData` |
| `AnyEraSubmittedCallTx` | `AnySubmittedCallTx` |
| `AnyEraFoundContract<C, L8>` | `FoundContract<C \| L8>` |
| `AnyEraDeployedContract<C, L8>` | `DeployedContract<C \| L8>` |
| `AnyEraMaintenanceTxData` | `FinalizedMaintenanceTxData` |
| `ContractProviders` without type arguments (4.x: any contract; pre-releases: the ledger 9 set) | `ContractProviders<C>` requires the contract; `Ledger9ContractProviders` for the ledger 9 set |

`FinalizedMaintenanceTxData` was the ledger 9 type in `5.0.0-rc.5`; it is now the union of
both eras. Code that reads `public.tx` or relies on `era: 'v9'` stops compiling until it
narrows on `era` or names `Ledger9FinalizedMaintenanceTxData`. 4.x had no such type.

**Error classes.** See section 25: every failed transaction is one `TxFailedError`.

`FoundDeployTxPublicData` and `FinalizedTxRead` keep their names: they already follow the
rule. See ADR 0018.

---

## 25. One error class per fault (#1557)

There is no `Ledger8` namespace any more. The 12 error classes below replace about 40. Each fault is one
class, and a field says which case it was. Sections 12, 14 to 17, 19, 20, 23 and 24 above show names as they were during the
pre-releases. Use this section for the final names.

### 25a. Failed transactions: one `TxFailedError`

`TxFailedError(operation, record, details)` replaces every per-operation and per-era class. A v4-style
`error instanceof TxFailedError` around a ledger 8 call now catches it. The code stays
`MIDNIGHT_JS_C_TX_FAILED`.

| Before | After |
|---|---|
| `AnyEraTxFailedError`, `TxFailedError` | `TxFailedError` |
| `CallTxFailedError`, `Ledger8.CallTxFailedError` | `TxFailedError`, `operation: 'call'` |
| `DeployTxFailedError`, `Ledger8.DeployTxFailedError` | `TxFailedError`, `operation: 'deploy'` |
| `InsertVerifierKeyTxFailedError`, `Ledger8.InsertVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'insert-verifier-key'` |
| `RemoveVerifierKeyTxFailedError`, `Ledger8.RemoveVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'remove-verifier-key'` |
| `ReplaceMaintenanceAuthorityTxFailedError`, `Ledger8.ReplaceMaintenanceAuthorityTxFailedError` | `TxFailedError`, `operation: 'replace-authority'` |
| `error.finalizedTxData` (ledger 9), `error.txData` (ledger 8) | `error.record`, a `FinalizedTxRead`; narrow on `record.era` |
| the ledger 9 message, a JSON dump of the record | a sentence naming the status, the transaction id and hash, the block height and the failed segments; read the other record fields from `error.record` |
| `contractAddress`, `circuitId`, `signingKey` always present on the class that had them | optional fields, set per operation. The constructor requires the ones each operation always has: `contractAddress` and `signingKey` for `'deploy'` and `'replace-authority'`, `contractAddress` and `circuitId` for a verifier key update, `circuitId` for `'call'`. A ledger 9 call never sets `contractAddress`, because a scope can call several contracts |

`signingKey` is not enumerable, so `Object.keys`, object spread, `JSON.stringify` and a logger that
serializes the properties of an error leave it out. Read it as `error.signingKey`. The key is never in the
message. The same holds for `Ledger8UnconfirmedError` and `Ledger8NotStoredError`.

### 25b. Wrong era: one `EraMismatchError`

`EraArtifactMismatchError` is `EraMismatchError`, and its code `MIDNIGHT_JS_C_ERA_ARTIFACT_MISMATCH` is
`MIDNIGHT_JS_C_ERA_MISMATCH`. `EraArtifactMismatchReason` and `EraArtifactMismatchOptions` are
`EraMismatchReason` and `EraMismatchOptions`. Seven classes became reasons of it:

| Before | After: `reason` | Field that moved into the message (`detail`) |
|---|---|---|
| `Ledger8.DeployOnLedger9Error` (`LEDGER8_DEPLOY_ON_LEDGER9`) | `'ledger8-deploy-on-ledger9-network'` | none |
| `Ledger8.MaintenanceOnLedger9Error` (`LEDGER8_MAINTENANCE_ON_LEDGER9`) | `'ledger8-maintenance-on-ledger9-network'` | none |
| `Ledger8.ArtifactOnLedger9StateError` (`LEDGER8_ARTIFACT_ON_LEDGER9_STATE`) | `'ledger8-artifact-on-ledger9-contract'` | `contractAddress` |
| `Ledger8.ContractStateUnsupportedError` (`LEDGER8_CONTRACT_STATE_UNSUPPORTED`) | `'ledger8-contract-state-unsupported'` | `contractAddress`, `operation` |
| `ScopedTransactionEraUnsupportedError` (`SCOPED_TRANSACTION_ERA_UNSUPPORTED`) | `'scope-on-ledger8-network'` | `networkVersion` |
| `MixedEraScopeError` (`MIXED_ERA_SCOPE`) | `'ledger8-call-in-scope'` | `circuitId` |
| `UnknownResultEraError` (`UNKNOWN_RESULT_ERA`) | `'unrecognised-result-era'` | `received` |

`contractAddress` and `circuitId` stay typed members, set for the reasons that have them. `detail`, the
sentence added to the message, is a member too. `networkVersion`, `operation` and `received` are only in
the message. An exhaustive `switch` on `reason` must handle the seven new members.

`EraInvariantViolationError` is unchanged, except that `requireLedger9Record` now names `received`.
`PublicStatesEraMismatchError`, `IndexerInconsistencyError` and `TransactionEraMismatchError` are
unchanged.

### 25c. No era: `UnknownLedgerVersionError`

| Before | After |
|---|---|
| `UnrecognisedEraTagError` (`MIDNIGHT_JS_U_UNRECOGNISED_ERA_TAG`, USAGE; `received`, `context`) | `UnknownLedgerVersionError` (`MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION`, ENVIRONMENT). `requestedVersion` is `undefined` when the value carried no era |
| `Ledger8ValueUnsupportedError` (`MIDNIGHT_JS_U_LEDGER8_VALUE_UNSUPPORTED`), `requireLedger9` | removed. Narrow with `switch (value.era)`, closed by `assertNever` |

`UnknownLedgerVersionError.requestedVersion` is now `string | undefined`, and the constructor takes the
raw value. A value that is an object or a function is reported by its kind, `'object'` or `'function'`.

The category changes from USAGE to ENVIRONMENT. A value with no era means a provider written for a
release before 5.0.0, or an outdated midnight-js. The fix is in the installation. A state with a
known era but no `serialize()` still raises `InvalidSerializedStateError`.

### 25d. Ledger 8: nine classes became five, all flat

| Before | After |
|---|---|
| `Ledger8.SigningKeyUnusableError` (`LEDGER8_SIGNING_KEY_UNUSABLE`) | `Ledger8SigningKeyError`, `reason: 'unusable'` |
| `Ledger8.SigningKeyUnavailableError` (`LEDGER8_SIGNING_KEY_UNAVAILABLE`) | `Ledger8SigningKeyError`, `reason: 'unavailable'` |
| `Ledger8.DeployUnconfirmedError` (`LEDGER8_DEPLOY_UNCONFIRMED`) | `Ledger8UnconfirmedError`, `operation: 'deploy'` |
| `Ledger8.ReplaceAuthorityUnconfirmedError` (`LEDGER8_REPLACE_AUTHORITY_UNCONFIRMED`) | `Ledger8UnconfirmedError`, `operation: 'replace-authority'` |
| `Ledger8.DeployNotStoredError` (`LEDGER8_DEPLOY_NOT_STORED`) | `Ledger8NotStoredError`, `operation: 'deploy'` |
| `Ledger8.SigningKeyNotStoredError` (`LEDGER8_SIGNING_KEY_NOT_STORED`) | `Ledger8NotStoredError`, `operation: 'replace-authority'`, `stage: 'signing-key'` |
| `Ledger8.ShieldedSpendUnsupportedError` (`LEDGER8_SHIELDED_SPEND_UNSUPPORTED`) | `Ledger8CallUnsupportedError`, `reason: 'shielded-spend'` |
| `Ledger8.RecipientUnmappableError` (`LEDGER8_RECIPIENT_UNMAPPABLE`) | `Ledger8CallUnsupportedError`, `reason: 'unmappable-recipient'` |
| `Ledger8.AmbiguousEntryPointError` | `Ledger8AmbiguousEntryPointError`, which now also carries `contractAddress` (the first constructor argument) |

The new codes are `MIDNIGHT_JS_C_LEDGER8_SIGNING_KEY` (USAGE), `MIDNIGHT_JS_C_LEDGER8_UNCONFIRMED`
(UNCERTAIN), `MIDNIGHT_JS_C_LEDGER8_NOT_STORED` (ENVIRONMENT) and `MIDNIGHT_JS_C_LEDGER8_CALL_UNSUPPORTED`
(USAGE). A `Ledger8NotStoredError` with `operation: 'deploy'` means the contract exists: do not deploy
again. With `operation: 'replace-authority'` the old key no longer authorizes anything: keep
`error.signingKey`.

`Ledger8SigningKeyError` with `reason: 'unavailable'` requires the contract address.

Four types are exported flat for the fields: `Ledger8SigningKeyReason`, `Ledger8KeyedOperation`,
`Ledger8NotStoredStage` and `Ledger8CallUnsupportedReason`.

Replace `error instanceof Ledger8.X` with the class in the table, then branch on `reason`, `operation`
or `stage` where you told the old classes apart. If you branched on a code, use the new code.

See ADR 0013 and ADR 0017.

---

## Non-breaking additions worth noting

- **Cross-contract call support** (#967) is additive: `ZKConfigRegistry` (types), the `ContractKeyLocation` grammar re-export, and the new `PublicDataProvider.queryBlock()` "as-of" endpoint. `queryBlock` is a new required member of the `PublicDataProvider` interface — custom implementations must add it (see [api-changes.md](./api-changes.md)). Its `BlockInfo` return type later gained a required `protocolVersion` field — see [section 9](#9-blockinfo-gained-a-required-protocolversion-field-1395).
- `dispose()` is exposed on the concrete `IndexerPublicDataProvider` returned by the factory (#961). It is **not** a member of the shared `PublicDataProvider` interface, so existing interface implementations are unaffected.
- The new `queryContractEvents` / `contractEventsObservable` methods are **required** members of the `PublicDataProvider` interface; the framework's `IndexerPublicDataProvider` provides them. If you implement `PublicDataProvider` yourself, this is a required-method addition that will fail to type-check until you add both — see [api-changes.md](./api-changes.md).
