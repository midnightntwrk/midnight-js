# Migration Guide v4.1.1 → v5.0.0

**Migration complexity:** Significant. This is a protocol-level major release — expect to touch any code that constructs signing keys, persists exported signing keys, or imports ledger / onchain-runtime types directly.

**This is also the release that carries a dApp across the ledger v8 to v9 hard fork.** If you recompile your contracts with the ledger 9 Compact toolchain, the fork costs no further code change beyond the bump and the mechanical changes in [Step 13](#step-13--pass-transactions-as-handles-and-narrow-the-version-tagged-records) — there is no new API to call at the boundary. If you keep pre-fork artifacts callable, those calls answer with the retained era's own result types and fail with a different error class; both are covered in [Step 14](#step-14--operating-across-the-ledger-fork), which also carries the timing and operational consequences that apply either way. Adopt this major *before* the fork.

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

Two copies of a protocol package in one install break in two places: TypeScript sees two different classes (TS2345, `Transaction<...>` mismatches), and at run time each copy's WebAssembly classes reject objects made by the other (`expected instance of StateValue`). A resolver installs a second copy when two packages ask for the same one with different ranges and a newer publication matches only one of them.

The framework asks for `@midnightntwrk/onchain-runtime-v4` and `@midnight-ntwrk/onchain-runtime-v3` with the same ranges `@midnight-ntwrk/compact-runtime` does, so each resolves to one copy on its own. `@midnight-ntwrk/compact-js` asks for `@midnightntwrk/ledger-v9` and `@midnight-ntwrk/platform-js` with a caret, but the framework — and, for `ledger-v9`, `@midnightntwrk/wallet-sdk` — asks for exact versions, so pin those two:

```jsonc
// package.json
{
  "resolutions": {
    "@midnightntwrk/ledger-v9": "1.0.0-rc.5",
    "@midnight-ntwrk/platform-js": "3.0.0"
  }
}
```

There is no `@midnight-ntwrk/compact-runtime` entry: depend on the version your contracts were compiled for, which with the ledger 9 toolchain is `0.20.0`, the framework's own.

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
-   signingKey: keyHex, // 64 hex characters (32 bytes)
+   signingKey: { tag: 'schnorr', value: keyHex },
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

const keyHex = 'ab'.repeat(32); // 64 hex characters (32 bytes)

isValidSigningKey({ tag: 'schnorr', value: keyHex }); // true
isValidSigningKey(keyHex);                            // false (old string shape)
isValidSigningKey({ tag: 'schnorr', value: 'abcdef' }); // false (not 32 bytes)
```

---

## Step 4 — Re-export or transform persisted signing-key exports

**Keys already in a level private-state store need no action.** A 4.x client stored each signing key as a bare 64-character hex string. The 5.x level provider reads such an entry as `{ tag: 'schnorr', value: <stored string> }`, so current-era maintenance calls, `findDeployedContract` and `exportSigningKeys` work on an upgraded store as they are.

A stored entry that is neither shape makes `getSigningKey`, `exportSigningKeys` (for the whole export) and current-era `findDeployedContract` throw `StoredSigningKeyFormatError`, which names the contract address. A retained-era (ledger-8) attach reports no stored key instead and logs an `unreadable-entry` breadcrumb. To fix the entry, do one of:

- store a valid key with `setSigningKey(address, { tag, value })`;
- import a valid key with `importSigningKeys(export, { conflictStrategy: 'overwrite' })`;
- remove it with `removeSigningKey(address)`.

The steps below apply only to export *files* made by a 4.x client.

`importSigningKeys` now validates the structured shape **before** any write. A v4.x export that stored a bare hex string fails with `InvalidExportFormatError`.

- **Preferred:** open the store the 4.x client wrote with a v5.0.0 client and run `exportSigningKeys` again.
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
- **If you cannot recompile yet:** set `verify: 'require-if-present'`. `compactc` only began emitting the manifest in 0.33, so artifacts from an earlier toolchain can never satisfy `require`. This mode tolerates a wholly absent manifest (it warns) but still requires a manifest that *does* exist to cover the artifact, and it begins verifying in full as soon as you recompile — no further code change.
- **Last resort:** `verify: 'warn'` (or `'off'`) while you regenerate artifacts. Unlike `require-if-present`, `warn` also lets through an artifact missing from a manifest that is present. A digest mismatch still throws except in `'off'` mode.

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

## Step 13 — Pass transactions as handles, and narrow the version-tagged records

In 5.0.0 a transaction is no longer a bare ledger object when it crosses a
provider method or a `contracts` function. It is a **transaction handle**: an
object that holds the ledger transaction, the ledger era it belongs to (`'v8'`
or `'v9'`) and its stage. This is the half of 5.0.0 that type-checking will not
let you defer.

| Stage | Handle type | Taken by | Returned by |
|---|---|---|---|
| before proving | `UnprovenTx` | `proveTx`, `submitTx` (contracts) | `createUnproven*Tx`, `.private.unprovenTx` |
| proven, not bound | `UnboundTx` | `balanceTx` | `proveTx` |
| proven and bound | `FinalizedTx` | `submitTx` (provider) | `balanceTx`, `record.tx` |

All three types come from `@midnight-ntwrk/midnight-js-types`. Two functions
move a ledger transaction in and out of a handle:

- `LedgerTransaction.seal(era, stage, tx)` makes a handle. It refuses an object
  of another copy of the ledger package with `ForeignLedgerTransactionError`
  (`MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION`). A v8 object is also refused
  (reason `ledger8-not-loaded`) until `loadLedger8Protocol()` has resolved; call
  it from the same copy of `@midnight-ntwrk/midnight-js-protocol` that
  `@midnight-ntwrk/midnight-js-types` depends on, because a separately installed
  version has its own load flag.
- `LedgerTransaction.unwrap(handle, era)` gives the ledger object back. It
  refuses a handle of the other era with `TransactionEraMismatchError`
  (`MIDNIGHT_JS_PR_TRANSACTION_ERA_MISMATCH`).

A handle also has `era`, `stage` and `serialize()`, so you can route it or send
its bytes without unwrapping it.

### Calling the provider methods

Seal the transaction once, before the first call. Each method's output is
already the handle the next one expects:

```diff
- const proven = await proofProvider.proveTx(unprovenTx);
+ const proven = await proofProvider.proveTx(LedgerTransaction.seal('v9', 'Unproven', unprovenTx));
  const balanced = await walletProvider.balanceTx(proven);
  const txId = await midnightProvider.submitTx(balanced);
```

Passing a handle at the wrong stage (an `UnprovenTx` to
`MidnightProvider.submitTx`, say) is a compile error.

### `submitTx` in `contracts`

Before:

```typescript
await submitTx(providers, { unprovenTx }); // unprovenTx: UnprovenTransaction
```

After:

```ts
import { contracts, types } from '@midnight-ntwrk/midnight-js';

declare const providers: types.MidnightProviders;
declare const ledgerUnprovenTx: types.LedgerTransactionTypes['v9']['Unproven'];

const submitBuiltTransaction = async (): Promise<types.VersionedFinalizedTxData> => {
  const unprovenTx = types.LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
  return contracts.submitTx(providers, { unprovenTx });
};
```

`submitTx` reads the network head and accepts only a transaction of the head's
era; see [Step 18](#step-18--narrow-the-contract-state-reads-getpublicstates-and-submittx).

### `.private.unprovenTx`

The unproven transaction on a built-but-not-submitted result
(`createUnprovenCallTx`, `createUnprovenDeployTx`, the maintenance
`createUnproven*Tx` functions) is an `UnprovenTx` handle now. Pass it on as it
is; unwrap it only where you need the ledger object.

Before:

```typescript
const { unprovenTx } = callTx.private; // UnprovenTransaction
console.log(unprovenTx.identifiers());
```

After:

```ts
import { contracts, type protocol, types } from '@midnight-ntwrk/midnight-js';

type AnyContract = protocol.Contract.Any;
declare const callTx: contracts.UnsubmittedCallTxData<AnyContract, protocol.Contract.ProvableCircuitId<AnyContract>>;
declare const proofProvider: types.ProofProvider;
declare const inspect: (tx: types.LedgerTransactionTypes['v9']['Unproven']) => void;

const proveCall = async (): Promise<types.UnboundTx> => {
  const { unprovenTx } = callTx.private;
  if (unprovenTx.era === 'v9') {
    inspect(types.LedgerTransaction.unwrap(unprovenTx, 'v9'));
  }
  return proofProvider.proveTx(unprovenTx);
};
```

If you built against a 5.0.0 pre-release: the retained-era call result,
`Ledger8.CallResultPrivate`, carries the same `unprovenTx` handle where it used
to carry `txBytes`:

```diff
- const bytes = result.private.txBytes;
+ const handle = result.private.unprovenTx; // read handle.era before unwrapping it
```

### Reading `record.tx`

`watchForTxData` and `watchForDeployTxData` return a `version`-tagged record,
`VersionedFinalizedTxData`. Both variants are records you will receive: a v8
record is one the provider decodes and returns, not an error. In both, `tx` is
a `FinalizedTx` handle of the record's own era (`record.tx.era ===
record.version`).

Before:

```typescript
const record = await publicDataProvider.watchForTxData(txId);
const ids = record.tx.identifiers(); // record.tx: Transaction
```

After:

```ts
import { types } from '@midnight-ntwrk/midnight-js';

declare const publicDataProvider: types.PublicDataProvider;

const readIdentifiers = async (txId: string): Promise<string[]> => {
  const record = await publicDataProvider.watchForTxData(txId);
  const tx = types.LedgerTransaction.unwrap(record.tx, record.version);
  return tx.identifiers();
};
```

To treat the two eras differently, narrow on `version` and unwrap in each
branch:

```ts
import { types, utils } from '@midnight-ntwrk/midnight-js';

declare const describeNative: (tx: types.LedgerTransactionTypes['v9']['Finalized']) => string;
declare const describeRetained: (tx: types.LedgerTransactionTypes['v8']['Finalized']) => string;

const summarize = (record: types.VersionedFinalizedTxData): string => {
  switch (record.version) {
    case 'v9':
      return `native ${record.txId}: ${describeNative(types.LedgerTransaction.unwrap(record.tx, record.version))}`;
    case 'v8':
      return `retained ${record.txId}: ${describeRetained(types.LedgerTransaction.unwrap(record.tx, record.version))}`;
    default:
      return utils.assertNever(record, 'summarize');
  }
};
```

`describeNative` and `describeRetained` stand in for your own code. They are two
separate functions on purpose: inside each branch `unwrap` returns that era's
own ledger class, so each function is typed for exactly one era.

Close the switch with `assertNever`. While your switch covers the union it
compiles; the moment the union carries a variant your switch does not handle,
**that line stops compiling and points at the switch that has to change**.

Be clear about which direction that buys you, because it is not the one you
might assume. When a later major *shrinks* `LedgerVersion` to drop the retained
era, the now-stale `case 'v8':` label is already a compile error on its own —
`assertNever` adds a second diagnostic beside it, it is not what makes the
removal visible. What it uniquely catches is the other direction: a union that
*grows* a further era. For a switch that returns a value, the compiler can
sometimes catch that at the function signature instead; for a `void`,
side-effecting switch it catches nothing at all, and the unhandled variant falls
through in silence. That is the case `assertNever` closes.

The second argument is required. `assertNever` never puts the unhandled value into
its message, so the context string is the only thing that says where the throw came
from. If one is ever reached, it raises `MIDNIGHT_JS_U_UNHANDLED_UNION_MEMBER`, and
the context is on the error as `context`.

Do not narrow this one by throwing on anything that is not `'v9'`. A v8-era
record is a record the provider decodes and returns, not an error condition,
and a dApp that reads its own pre-fork history will meet one.

`findDeployedContract` reports the deploy record the same way. A contract deployed
before the ledger fork keeps a ledger-8 deploy record forever, so
`found.deployTxData.public` is tagged too. `contractAddress` is on both variants; narrow
on `version` before reading `tx` or `initialContractState`. The `v8` variant has no
`initialContractState`, because the current runtime cannot decode a ledger-8
deploy-time state — read the current state with `queryContractState` instead.

```ts
const found = await findDeployedContract(providers, { compiledContract, contractAddress });
const address = found.deployTxData.public.contractAddress; // both eras
if (found.deployTxData.public.version === 'v9') {
  use(found.deployTxData.public.initialContractState);
}
```

### Implementing a provider

If you *implement* `WalletProvider` or `MidnightProvider` for v9 only, wrap the
implementation with `createWalletProvider` / `createMidnightProvider` rather
than sealing by hand — see [breaking-changes.md 8e](./breaking-changes.md). The
adapter unwraps each handle on the way in and seals your answer on the way out.

To serve both eras, write one handler per era with
`createProofProviderFromHandlers`, `createWalletProviderFromHandlers` or
`createMidnightProviderFromHandlers`. There is one key per ledger era; set an
era you do not serve to `undefined`. Each handler receives a live ledger object
of its own era and returns one; the factory unwraps and seals the handles and
computes `supportedEras`:

```ts
import { types } from '@midnight-ntwrk/midnight-js';

declare const proveOnLedger8: (
  tx: types.LedgerTransactionTypes['v8']['Unproven']
) => Promise<types.LedgerTransactionTypes['v8']['Unbound']>;
declare const proveOnLedger9: (
  tx: types.LedgerTransactionTypes['v9']['Unproven']
) => Promise<types.LedgerTransactionTypes['v9']['Unbound']>;

const buildProofProvider = (): types.ProofProvider =>
  types.createProofProviderFromHandlers({
    v8: (tx) => proveOnLedger8(tx),
    v9: (tx) => proveOnLedger9(tx)
  });
```

`proveOnLedger8` and `proveOnLedger9` stand in for your own proving code. A
handler that hands the transaction to another copy of the ledger (a wallet SDK,
a DApp Connector wallet) serializes it on the way out and decodes the answer with
`deserializeTransactionAtStage(era, stage, bytes)` from
`@midnight-ntwrk/midnight-js-protocol/transaction` on the way in. Take the era
from the request, never from the bytes.

If you built against a 5.0.0 pre-release, the handler keys changed:

```diff
  createProofProviderFromHandlers({
-   currentEra: (tx) => proveOnLedger9(tx),
-   retainedEras: { v8: (txBytes) => proveOnLedger8Bytes(txBytes) }
+   v8: (tx) => proveOnLedger8(tx),
+   v9: (tx) => proveOnLedger9(tx)
  });
```

A v8 handler now receives a live ledger 8 object, not bytes. The full list of
pre-release names that changed is in
[breaking-changes.md 18](./breaking-changes.md#18-transactions-are-handles-1533).

### How the indexer provider reads both eras

A v8-era record is served rather than refused: the indexer provider decodes
each record with the runtime of the era that record reports, acquiring the
pre-fork runtime lazily on first use. Because the record's `tx` is a handle
that holds a live ledger object, reading a ledger 8 record loads the ledger 8
runtime, also in a session that otherwise only uses ledger 9 (known
limitation, [#1525](https://github.com/midnightntwrk/midnight-js/issues/1525)). What throws at the read
boundary is a `protocolVersion` this client cannot place on the era timeline at
all (`UnknownRecordEraError`), where before it would have returned a record that
failed later inside the codec. Bytes that will not decode on the era selected
for them — whether the record disagrees with itself or your ledger package is a
different vintage than the network's — surface as `DeserializationError`,
carrying the era, the `protocolVersion`, the provider method and the record on
`context.details`.

---

## Step 14 — Operating across the ledger fork

This release is the one that carries a dApp across the ledger v8 → v9 hard
fork. Steps 1 and 13 are the whole code migration — bump, then narrow where the
compiler tells you to.

**If you recompile your contracts with the ledger 9 Compact toolchain, there is
no further code change**, and most of this step is about timing and operations
rather than code. This includes re-attaching to a contract deployed before the
fork: `findDeployedContract` accepts it, and reports its deploy record tagged `v8`
(see Step 13). Nothing in that path asks you to call a new API, branch on
the network's era, or maintain a second code path.

One case does need more. A contract deployed before the fork that has had **no
state-changing call since the fork** still has its state in the ledger-8 format.
The indexer serves it that way, so `findDeployedContract` itself throws
`IndexerDataError`, and so does any call through recompiled artifacts. The first
state-changing call after the fork must therefore go through the pre-fork
artifacts (see the next paragraph). After that call, recompiled artifacts find
and call the contract as described above.

**If you keep pre-fork artifacts callable instead**, there is more to it, and it
is not optional reading: those calls run the retained pipeline and answer with
the retained era's result types, which differ from the current era's in six
places, and they fail with a different error class. Both are described under
[What a retained-era call answers with](#what-a-retained-era-call-answers-with)
below. Recompiling remains the preferred path — a retained artifact cannot be
deployed at all, only called.

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
`kind` — `'call'` or `'deploy'`, which is what you branch on to pick between the
two remediations below — along with `startEra`, `freshEra`, `circuitId` and
`contractAddress`. Its message carries the matching remediation in full.

Both kinds are reachable. `kind: 'deploy'` comes from a retained-era deploy that
was built on a pre-fork head and overtaken by the fork before it landed.

For a **call**, the remediation is two steps, in order:

1. **Confirm no finalization.** There is no transaction id to look up: the
   submission was rejected, so nothing ever resolved to one, and `StaleHeadError`
   carries none. Do it the way the error's own message prescribes — read the
   contract state at `error.contractAddress` with `queryContractState`, and check
   whether the call to `error.circuitId` is already reflected in it. Note that
   `watchForTxData` is *not* the tool here: it needs an id this error does not
   carry, and it waits indefinitely rather than ever reporting a transaction
   absent. Do not skip this step — see the warning below.
2. **Re-run.** Run the same call again, unchanged. It resolves the new era and
   lands on the retained-era pipeline. Your code does not change.

For a **deploy** the remediation is different, and it is also two steps:

1. **Confirm no finalization**, the same way — but check the *address the deployment
   composed*, `error.contractAddress`, rather than a circuit's effect. A deploy mints a
   fresh nonce, so a second attempt lands at a *different* address and a skipped check
   leaves two copies of the contract on chain.
2. **Recompile with the ledger 9 Compact toolchain and deploy that artifact.** Unlike the
   call case, a plain re-run does not work: after the fork a contract produced by the
   ledger 8 (pre-fork) toolchain has no deployment path. See [the runtime-deploy chapter](#runtime-deploy-chapter-factory-patterns).

> **Why step 1 is not optional.** The guidance above assumes in-flight pre-fork
> transactions are hard-rejected at the boundary. If any grace window exists, a
> bare re-run is precisely what causes double execution — both the original and
> the re-run can finalize, and both funds legs with them. Confirming
> non-finalization first is what makes the re-run safe under either behaviour.

### Runtime-deploy chapter: factory patterns

This section is linked from `Ledger8.DeployOnLedger9Error`
(`MIDNIGHT_JS_C_LEDGER8_DEPLOY_ON_LEDGER9`).

If your dApp deploys contract instances **at runtime** — a factory that stands
up a new contract per user, per market, per game — read this before the fork.

The retained era stays supported for **calls against contracts deployed before
the fork**. New deployments of a ledger 8 (pre-fork) toolchain artifact work **only on a
pre-fork head**. On a post-fork head `deployContract` refuses one with
`Ledger8.DeployOnLedger9Error`, before the constructor runs and before any verifier
key is fetched.

A retained deploy registers a maintenance authority of one key, either
`options.signingKey` or a freshly sampled one. The key is reported at
`deployTxData.private.signingKey` and stored against the new address through
`privateStateProvider`. That store is the only copy besides the handle: lose it
and no verifier key on that contract can ever be inserted, removed or replaced.

In practice:

- **Obtain ledger 9 toolchain artifacts for every contract you deploy at
  runtime**, and ship them before the fork. From the fork on, a retained
  artifact cannot be deployed.
- Contracts you deployed *before* the fork are unaffected — they keep working
  through the same call sites.
- A dApp that only calls already-deployed contracts is not affected by this
  section at all.

The failure this exists to prevent is a factory whose deploy path was never
exercised against a retained artifact, discovering only at the fork that the
artifacts it ships take a release cycle to replace.

### What a retained-era call answers with

Everything the retained era publishes is reached through ONE import, the
`Ledger8` namespace of `midnight-js-contracts`: `Ledger8.FinalizedCallTxData`
is the result type below, `Ledger8.Contract` the constraint for a helper of
your own, `Ledger8.CallTxFailedError` the failure class. The era prefix is
dropped inside, so each member is the retained twin of the flat current-era
name it mirrors, where one exists. The half that serves BOTH eras --
`AnyEraFinalizedCallTxData`, `isLedger8Result`, `AnyEraTxFailedError` -- stays flat, so a handler that only receives
results imports nothing era-specific. When the fork window closes, the whole
namespace goes in one step; the fork-window refusals (`StaleHeadError` and the
rest of that group) are published flat and go in a separate one.

A call against a contract you compiled with the previous toolchain still goes
through `submitCallTx` / `submitCallTxAsync` / `findDeployedContract`
unchanged — you pass the raw contract instance instead of a `CompiledContract`
container, and an additive overload picks the retained-era path. What comes BACK is
the same two-level shape (`public` / `private`), built from the same shared
bases, so `private.result`, `public.txId` and `public.status` read identically
in both eras.

Six differences are worth knowing before you write a handler that has to accept
either era.

- **Every result names its era.** `result.era` is `'v8'` or `'v9'` (a
  `LedgerVersion`, the same values as `public.version`), read off the compiled
  artifact. Narrow with `isLedger8Result(result)`, and
  declare a parameter that accepts both with `AnyEraFinalizedCallTxData` or
  `AnyEraSubmittedCallTx`.
- **`era` is not `public.version`.** `era` names the pipeline that produced the
  objects; `public.version` names the ledger that recorded the transaction.
  After the fork they disagree for every retained-era call: `era: 'v8'`
  with `version: 'v9'` is a keep-state transaction, and that is correct. Branch
  on `era` to decide which module an object came from, on `version` before
  touching `public.tx`.
- **`public.version` is a union on the retained-era path.** A retained-era call is
  recorded by whichever era the head is on, so narrow it. The current era's is
  pinned `'v9'`.
- **`public.nextContractState` is a different KIND of object per era.** The
  current era gives a `StateValue`; the retained era gives
  `{ data: ChargedState }` — one wrapper level up. Both eras also publish
  `public.nextContractStateEncoded`, which is pinned identical across the
  ledger runtimes. That is the member to read, persist, `structuredClone` or
  post to a worker; the handles are valid only inside the process that built
  them.
- **No `logEvents` on the retained-era path.** The previous toolchain has no
  log-event concept at any layer, so there is no value to read rather than an
  empty list to read.
- **`private.unprovenTx` can be in either era.** It is a v8 handle on a
  pre-fork head and a v9 handle after the fork (keep-state). Read
  `unprovenTx.era` before you unwrap it.

Two limits to plan around. Both eras now name the circuit on the result, and
both handles carry `compiledContract` and `contractAddress`, so the contract
HANDLES differ in one place: the retained handle's
`callTx.<circuit>(...)` takes no `TransactionContext`, so it cannot carry
recipient key mappings (see below). Both handles carry the maintenance
interfaces; the retained one works only before the fork, and after it the same
contract is maintained through a handle built from the recompiled artifact. And `getStates` / `getPublicStates`
return the v8 variant, `{ version: 'v8', zswapChainState, stateBytes,
ledgerParametersBytes }`, for a contract whose state the v8 ledger wrote: narrow
on `version` before reading the state.

`deployTxData` has the same shape, `{ era, public, private }`, in both eras, on
a found handle and on a deployed one. The retained-era handle used to keep the
deployer's data at the top level up to rc.4; it is now under `deployTxData`:

| Fact | Before (retained era, up to rc.4) | Now (both eras) |
|---|---|---|
| Deploy record | `deployTxData` (the flat record) | `deployTxData.public` (a ledger 8 record on a deployed handle) |
| Contract address | `contractAddress` | `deployTxData.public.contractAddress` (and `contractAddress`) |
| Signing key | `signingKey` | `deployTxData.private.signingKey` |
| Private state from the constructor | `initialPrivateState` | `deployTxData.private.initialPrivateState` |
| Zswap state from the constructor | `initialZswapState` | `deployTxData.private.initialZswapState` |
| Initial contract state (live handle) | `initialContractState` | `deployTxData.public.initialContractState` |
| Initial contract state (bytes, retained era only) | `initialContractStateBytes` | `deployTxData.public.initialContractStateBytes` |

The retained era's signing key is now the same `SigningKey` the current era
uses, `{ tag, value }`, on `deployTxData.private.signingKey`, on the
`signingKey` option of `deployContract` and `findDeployedContract`, and on the
`signingKey` member of `Ledger8.DeployTxFailedError`,
`Ledger8.DeployUnconfirmedError` and `Ledger8.DeployNotStoredError`. The retained
era signs with `schnorr` only: an `ecdsa` key, or a value that is not exactly 64
hexadecimal characters, is refused with `Ledger8.SigningKeyUnusableError` before
anything is composed or stored.

```diff
- await deployContract(providers, { compiledContract: retained, signingKey: keyHex });
- const key = deployed.signingKey;
+ await deployContract(providers, { compiledContract: retained, signingKey: { tag: 'schnorr', value: keyHex } });
+ const key = deployed.deployTxData.private.signingKey;
```

`initialContractStateBytes` was called `initialState` in the earlier 5.0.0
release candidates. It holds the same bytes under the new name.

If you call `loadLedgerEra` from `midnight-js-protocol` directly, its compose
members that hold bytes were renamed the same way: `contractState` →
`contractStateBytes`, `guaranteedZswapOffer` → `guaranteedZswapOfferBytes`,
the offer factory's `guaranteed` / `fallible` → `guaranteedBytes` /
`fallibleBytes`, `transaction` → `txBytes`, `ledgerParameters` →
`ledgerParametersBytes`, and `initialState` → `initialContractStateBytes`. The
`option` a `ComposeOptionError` reports follows the field it names:
`'contractStateBytes'`, `'ledgerParametersBytes'`, and
`'guaranteedZswapOfferBytes'` for a deploy's offer. A call's offer still reports
`'zswapOffer'`.

**Paying a shielded coin to someone else.** A retained-era circuit that pays a
shielded coin to a recipient other than the calling wallet needs that
recipient's encryption public key. Pass it in
`additionalCoinEncPublicKeyMappings` on the `submitCallTx` or
`submitCallTxAsync` options, as you would for a current-era call. Without it
the call is refused with `Ledger8RecipientUnmappableError` before anything is
proven. The `callTx.<circuit>(...)` handle on a deployed or found retained
contract cannot carry mappings; call `submitCallTx` or `submitCallTxAsync`
directly for these circuits.

### Catching a failure in either era

A call the chain recorded with a non-success status throws by class, and the
class differs per era: `CallTxFailedError` on the current era,
`Ledger8.CallTxFailedError` on the retained one. The retained class is NOT a
`CallTxFailedError` — it cannot be, because that class carries a v9-only
record.

Catch `AnyEraTxFailedError` to get both, and read the record through `.record`,
which is version-tagged. Each class also keeps its own historical member
(`finalizedTxData`, `txData`), so existing code does not change.

```typescript
try {
  await submitCallTx(providers, options);
} catch (error) {
  if (error instanceof AnyEraTxFailedError) {
    // Narrow before reading `tx`: the handle belongs to the era the tag names.
    console.error(error.record.status, error.record.version);
  }
  throw error;
}
```

### Maintaining a contract in either era

`submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx`
and the maintenance interfaces on both handles take either era's artifact. Their
result is now nested like every other result, so read the record under `public`:

```diff
- const { status } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
+ const { public: { status } } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
```

Before the fork, a contract deployed with ledger 8 artifacts is maintained with
those artifacts and the key the deploy stored. After the fork, the retained
artifact is refused with `Ledger8.MaintenanceOnLedger9Error`: recompile the
contract with the ledger 9 Compact toolchain and call the same function with
that artifact. The stored key is unchanged, and the fork keeps the contract's
maintenance authority, so that key still signs for the migrated contract. Keep
the same private-state store when you switch artifacts: the key is in that store
and nowhere else.

A retained-era update reads the stored key before it composes anything, and
refuses a missing, foreign-kind or unreadable entry with
`Ledger8.SigningKeyUnavailableError`, and a key that is not the contract's
authority with `MaintenanceAuthorityMismatchError`, before anything is proven.

An authority replacement whose outcome cannot be confirmed - the submission was
rejected while the head moved, or the record could not be read back - is raised
as `Ledger8.ReplaceAuthorityUnconfirmedError`. It carries the new key, which was
NOT stored: keep it, and store it once a maintenance update with the old key is
refused with `MaintenanceAuthorityMismatchError`.

### The ledger 8 (pre-fork) toolchain stays where it is

You do not install a second Compact toolchain, and you do not add the retained
ledger or runtime packages to your own dependencies. The framework carries what
it needs for the retained era internally and loads it only when a retained-era
operation actually happens.

If the retained runtime is in your dependency tree because you put it there,
remove it. Two copies of it in one process break the framework: a v8
transaction built with your copy is refused by `LedgerTransaction.seal` with
`MIDNIGHT_JS_PR_FOREIGN_LEDGER_TRANSACTION` (reason `foreign-instance`). Trace
the duplicate with your package manager's `why` command. One
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
page load. There are two such chunks, not one — the retained ledger and the
down-convert engine are loaded separately — plus further dynamic imports inside
the engine chunk. Check your build output for each of them and confirm none is
inlined or preloaded. Do not assume the dynamic imports survived your bundler's
defaults.

**Do not let the retained runtime be instantiated twice.** Two copies in one
bundle — usually through a duplicate transitive dependency — means objects
minted by one are rejected by the other, because the WASM binding checks class
identity. Deduplicate rather than working around it.

See also [Vite WASM resolution](../../guides/vite-wasm-resolution.md).

### ZKIR-v2 support is not sunsetting

Contracts compiled with the ledger 8 (pre-fork) toolchain remain transactable on the
network indefinitely; upstream has not announced a sunset. The retained-era
support in *this framework* is a separate question and is scheduled for removal
in the next major after the window closes — announced from day one so it is
something you can plan around rather than a surprise. When that removal lands,
`LedgerVersion` shrinks and every switch over it stops compiling at its stale
`case 'v8':` label, which is exactly the line that needs attention.

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

## Step 15 — Read `record.value` from the contract-state and balance streams

`contractStateObservable`, `rawContractStateObservable` and
`unshieldedBalancesObservable` emit `PositionedRecord<T>` (#1399). Read the value
from `record.value`:

```ts
// Before
publicDataProvider.contractStateObservable(address, { type: 'latest' }).subscribe((state) => render(state));

// After
publicDataProvider.contractStateObservable(address, { type: 'latest' }).subscribe((record) => render(record.value));
```

To resume after a restart, keep the last record's `blockHeight` (or `blockHash`)
and pass it back as `{ type: 'blockHeight', blockHeight }`. Leave `inclusive`
unset: the stream then repeats that block rather than skipping the rest of it.
See [breaking-changes.md](./breaking-changes.md#10-contract-state-and-balance-streams-emit-positionedrecordt-1399).

---

## Step 16 — Pass `MidnightConfig` on your providers

The framework no longer reads the global network id, and the transaction TTL is
no longer fixed at one hour (#982). Both come from a new, required
`config: MidnightConfig` on `MidnightProviders`:

```ts
// Before (4.x)
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preview');
const providers = { privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider };

// After (5.0.0)
const providers = {
  privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider,
  config: { networkId: 'preview', ttlSeconds: 3600 }
};
```

- `ttlSeconds: 3600` keeps the 4.x behaviour. It must be a positive whole number;
  any other value is rejected with a `RangeError` before any chain state is read.
  To check a config yourself, call `assertValidMidnightConfig` from
  `@midnight-ntwrk/midnight-js-utils`.
- The same TTL is passed to `walletProvider.balanceTx` as its `ttl` argument. If you
  implement `WalletProvider` yourself, use that argument for the intent your wallet
  adds while balancing, instead of a TTL of your own.
- `setNetworkId` has **no effect** on the framework any more. Remove the call once
  `config` is in place; `@midnight-ntwrk/midnight-js-network-id` is deprecated and
  is removed in 6.0.
- Import the `NetworkId` type from `@midnight-ntwrk/midnight-js-types`.
- Low-level calls that do not take `providers`:
  - `createUnprovenCallTxFromInitialStates`: add `config` to the options.
  - `createUnprovenDeployTxFromVerifierKeys`: pass `config` as the new last argument.

See [breaking-changes.md](./breaking-changes.md#11-midnightconfig-on-midnightproviders-replaces-the-global-network-id-and-the-fixed-ttl-982).

---

## Step 17 — Run indexer `4.4.0-rc.6` or later, and narrow `queryDeployContractState`

`indexerPublicDataProvider` requires indexer `4.4.0-rc.6` or later (#1452). If
you pin the indexer image, move it to that version or later; the framework's own
test environments use `4.4.0-rc.6-68702121`.

`queryDeployContractState` now resolves to `VersionedContractState | null`.
Narrow on `version`:

```ts
// Before (4.x)
const state = await publicDataProvider.queryDeployContractState(address);

// After (5.0.0)
const deployState = await publicDataProvider.queryDeployContractState(address);
if (deployState?.version === 'v9') {
  use(deployState.state);
} else if (deployState?.version === 'v8') {
  useBytes(deployState.stateBytes);
}
```

A `v8` result carries the stored bytes (`stateBytes`), not a decoded state.
See [breaking-changes.md](./breaking-changes.md#13-querydeploycontractstate-is-version-tagged-and-the-indexer-floor-is-440-rc6-1452).

---

## Step 18 — Narrow the contract-state reads, `getPublicStates` and `submitTx`

The contract-state reads, `getPublicStates` / `getStates` and `submitTx` are version-tagged (#1508).
In code that handles only v9, narrow with `requireLedger9`:

```ts
import { requireLedger9 } from '@midnight-ntwrk/midnight-js-utils';

// Before
const state = await publicDataProvider.queryContractState(address);
const [zswap, contractState, params] = (await publicDataProvider.queryZSwapAndContractState(address))!;
await submitTx(providers, { unprovenTx });

// After
const { state } = requireLedger9(
  (await publicDataProvider.queryContractState(address))!,
  'readCounter'
);
const { zswapChainState, contractState, ledgerParameters } = requireLedger9(
  (await publicDataProvider.queryZSwapAndContractState(address))!,
  'readCounter'
);
await submitTx(providers, { unprovenTx }); // an UnprovenTx handle, see Step 13
```

Rename `ContractEventBase.version` to `payloadVersion`, `AnyEraContractState.envelopeVersion` to
`version`, and read a retained-era deploy record at `deployTxData.public`. A provider rejection on
any submit path now arrives as `ProviderFailedError`, with the provider's own failure on `cause`:
match on `error.method` and `error.cause.message`, not on the provider's error class. The full list is in
[breaking-changes.md](./breaking-changes.md#14-one-rule-for-era-dependent-values-every-read-and-submittx-are-version-tagged-1508).

## Verification checklist

- [ ] Node >= 22.12 and TypeScript >= 5.8 with `module` `node20` / `nodenext`, or `moduleResolution: bundler`.
- [ ] `yarn install` clean with the Step 2 resolutions in place, and one installed version each of `ledger-v9`, `onchain-runtime-v4` and `platform-js`.
- [ ] `yarn build` and `yarn lint` succeed.
- [ ] All signing-key construction sites use the `{ tag, value }` shape.
- [ ] Persisted signing-key exports re-exported or transformed.
- [ ] No direct imports of old-scope ledger / onchain-runtime packages (ESLint `no-restricted-imports` is clean).
- [ ] Old-protocol contract state re-derived or guarded by `isDeserializationError`.
- [ ] ZK artifacts recompiled with `compactc 0.33.0-rc.1`; `compiler/contract-manifest.json` shipped so integrity verification passes (`ZkArtifactIntegrityError` clean).
- [ ] Every `proveTx` / `balanceTx` / `submitTx` call site passes a transaction handle (`LedgerTransaction.seal`), and unwraps a result only where it needs the ledger object.
- [ ] Every read of `record.tx` goes through `LedgerTransaction.unwrap(record.tx, record.version)`, and every read of `.private.unprovenTx` treats it as a handle.
- [ ] Any in-house `ProofProvider` / `WalletProvider` / `MidnightProvider` implementation compiles against the handle interfaces (wrapped with the `create*Provider` adapters, or built from `{ v8, v9 }` handlers).
- [ ] Every `switch` on `record.version` is closed with `assertNever`, so a future era variant cannot fall through unhandled.
- [ ] Released to users before the fork, not merely merged before it.
- [ ] Completion is measured by finalization, not by submit success.
- [ ] `StaleHeadError` handled: confirm non-finalization by reading contract state at `error.contractAddress` for evidence of `error.circuitId`, then follow the second step for `error.kind` — re-run a `'call'`; for a `'deploy'` or a `'maintenance'` update, recompile with the ledger 9 toolchain and use that artifact.
- [ ] Every `submitInsertVerifierKeyTx` / `submitRemoveVerifierKeyTx` / `submitReplaceAuthorityTx` and maintenance-interface result is read under `.public` (`result.public.status`), narrowing on `era` where both eras reach the code.
- [ ] Every retained-era handle reads the deployer's data under `deployTxData.private.*` and `deployTxData.public.*`, not at the top level.
- [ ] Every retained-era signing key is passed as `{ tag: 'schnorr', value }`, and a `Ledger8ReplaceAuthorityUnconfirmedError` or `Ledger8SigningKeyNotStoredError` keeps the `signingKey` it carries.
- [ ] Contracts deployed at runtime have ledger 9 toolchain artifacts shipped.
- [ ] Bundle checked: retained-era chunk separate, not preloaded, retained runtime not duplicated.
- [ ] Checked back for the pending operator, wallet and connector-proving sections.
- [ ] Every `contractStateObservable` / `rawContractStateObservable` / `unshieldedBalancesObservable` subscriber reads `record.value`.
- [ ] Every provider set carries `config: { networkId, ttlSeconds }`, and no code relies on `setNetworkId`.
- [ ] The indexer is `4.4.0-rc.6` or later, and every `queryDeployContractState` call site narrows on `version`.
- [ ] Every contract-state read and `getPublicStates` / `getStates` result is narrowed on `version` (`switch` + `assertNever`, or `requireLedger9`).
