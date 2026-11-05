# Migration Guide v4.1.1 → v5.0.0

This guide takes a dApp from midnight-js **v4.1.1** to **v5.0.0**, one step at a time.
Follow the steps in order. Each step says why it is needed, shows the code before and
after, and lists the traps.

**Who this is for:** anyone who builds a dApp on midnight-js 4.1.1, and anyone who wrote
their own provider (wallet, proof, public data, private state or ZK config provider).

**How long it takes:** plan for a few days. Most changes are mechanical, and the TypeScript
compiler points at almost all of them. The work that needs thought is in
[Step 6](#step-6--update-the-proof-wallet-and-midnight-providers),
[Step 9](#step-9--decode-on-chain-state-yourself) and
[Operating across the ledger fork](#operating-across-the-ledger-fork).

**Why so much changes:** 5.0.0 is the release that carries a dApp across the network's
hard fork from ledger 8 to ledger 9. A *hard fork* is a point in the chain after which the
network runs a new ledger version; transactions and state written before it keep the old
format. Ledger 9 is now the main ledger. Contracts compiled for ledger 8 still work, with
limits, and a contract deployed before the fork keeps using them after it. **Ship this upgrade to
your users before the fork happens.**

For the full list of changes, see [breaking-changes.md](./breaking-changes.md). For the new
features, see [new-features.md](./new-features.md).

**Words used in this guide:**

- **Era** — the ledger version a value belongs to: `'v8'` (ledger 8, before the fork) or
  `'v9'` (ledger 9). The type is `LedgerEra`.
- **Ledger 9 contract** — a contract compiled with compactc 0.36.0 (runtime 0.21.0).
- **Ledger 8 contract** — a contract compiled with the 4.1.1 toolchain, compactc 0.31
  (runtime 0.16.0).
- **Handle** — a `LedgerTransaction` object: the bytes of a transaction plus its era and
  stage. See [Step 7](#step-7--pass-transactions-as-handles).

---

## Contents

0. [Check the prerequisites](#step-0--check-the-prerequisites)
1. [Bump the packages and pin the protocol packages](#step-1--bump-the-packages-and-pin-the-protocol-packages)
2. [Choose the artifacts for each contract](#step-2--choose-the-artifacts-for-each-contract)
3. [Import ledger 9 from the era-named subpaths](#step-3--import-ledger-9-from-the-era-named-subpaths)
4. [Serve the `compiler/` directory with your ZK artifacts](#step-4--serve-the-compiler-directory-with-your-zk-artifacts)
5. [Add `config` to your providers](#step-5--add-config-to-your-providers)
6. [Update the proof, wallet and midnight providers](#step-6--update-the-proof-wallet-and-midnight-providers)
7. [Pass transactions as handles](#step-7--pass-transactions-as-handles)
8. [Reach private state through `forContract`](#step-8--reach-private-state-through-forcontract)
9. [Decode on-chain state yourself](#step-9--decode-on-chain-state-yourself)
10. [Read `record.value` from the state and balance streams](#step-10--read-recordvalue-from-the-state-and-balance-streams)
11. [Narrow finalized records on `era`](#step-11--narrow-finalized-records-on-era)
12. [Rename the ledger 9 types and fix generic code](#step-12--rename-the-ledger-9-types-and-fix-generic-code)
13. [Fix deploy options and scoped transactions](#step-13--fix-deploy-options-and-scoped-transactions)
14. [Update error handling](#step-14--update-error-handling)
15. [Move signing keys to `{ tag, value }`](#step-15--move-signing-keys-to-the--tag-value--shape)
16. [Code that uses the ledger directly](#step-16--code-that-uses-the-ledger-directly)
17. [Custom `PublicDataProvider` implementations](#step-17--custom-publicdataprovider-implementations)
18. [testkit-js users](#step-18--testkit-js-users)
19. [Optional: adopt the new features](#step-19--optional-adopt-the-new-features)
- [Operating across the ledger fork](#operating-across-the-ledger-fork)
- [Verification checklist](#verification-checklist)

---

## Step 0 — Check the prerequisites

**Why:** every package is now ESM-only (`"type": "module"`, one `dist/<entry>.js` per
entry, no `.cjs` file). Older Node and TypeScript settings cannot load it.

**Node.js >= 22.12.** From 22.12 on, Node lets CommonJS code `require()` an ES module
without a flag.

```bash
node -v   # must print v22.12.0 or later
```

**TypeScript >= 5.8** for an ESM project, with `module: nodenext`, or `module: preserve` +
`moduleResolution: bundler`. **TypeScript >= 5.9** for a CommonJS project, with `module: node20`.

```jsonc
// tsconfig.json — pick the line that matches your project
{
  "compilerOptions": {
    "module": "nodenext"                                  // ESM project
    // "module": "node20"                                 // CommonJS project (TypeScript >= 5.9)
    // "module": "preserve", "moduleResolution": "bundler" // project built by a bundler
  }
}
```

Gotchas:

- `module: node16` and `module: node18` fail at compile time with `TS1479`. `node20` is the
  lowest CommonJS setting that works, and it needs TypeScript 5.9 or newer.
- Import paths do not change, except the ones in [Step 3](#step-3--import-ledger-9-from-the-era-named-subpaths).
  A deep import into `dist/` now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

**Network stack.** The indexer provider reads data that only new indexers serve.

| Service | v4.1.1 used | v5.0.0 needs |
|---|---|---|
| Indexer | 4.3.x | **4.4.0-rc.6 or later** |
| Node | 1.0.0 | a node that accepts `@midnightntwrk/ledger-v9` 1.0.0 transactions |
| Proof server | 8.1.0 | **9.0.0** |

- **Proof server 9.0.0.** compactc 0.36 emits circuits in ZKIR v3 only (ZKIR is the circuit format
  proofs are made from). Proof server 9.0.0-rc.7 refuses them with `400 Bad Request`.
- **Node.** The node must accept ledger-v9 1.0.0 transactions. Node 2.1.0-rc.4 refused every
  contract call built with ledger-v9 1.0.0-rc.7 (error 1010, custom error 104).
- At release, the framework's tests used proof server 9.0.0 and pre-release builds of the node
  (2.1.100) and the indexer (4.4.100).

The indexer API path stays `/api/v4/graphql`. **Upgrade the indexer before you upgrade
the framework.** An older indexer does not serve the fields 5.0.0 reads on every
contract-state query.

---

## Step 1 — Bump the packages and pin the protocol packages

**Why:** 5.0.0 moves to ledger 9 and to new versions of the protocol packages under it.

```bash
yarn up @midnight-ntwrk/midnight-js@5.0.0
```

If you depend on the separate packages, bump each one you use to `5.0.0`, for example:

```bash
yarn up \
  @midnight-ntwrk/midnight-js-contracts@5.0.0 \
  @midnight-ntwrk/midnight-js-types@5.0.0 \
  @midnight-ntwrk/midnight-js-utils@5.0.0 \
  @midnight-ntwrk/midnight-js-protocol@5.0.0 \
  @midnight-ntwrk/midnight-js-level-private-state-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-http-client-proof-provider@5.0.0 \
  @midnight-ntwrk/midnight-js-node-zk-config-provider@5.0.0
```

**Remove `@midnight-ntwrk/midnight-js-network-id`.** The package is gone. [Step 5](#step-5--add-config-to-your-providers)
shows what replaces it.

```bash
yarn remove @midnight-ntwrk/midnight-js-network-id
```

**Dependency versions in 5.0.0:**

| Dependency | v4.1.1 | v5.0.0 |
|---|---|---|
| `compactc` (compiler for ledger 9 contracts) | 0.31.0 | **0.36.0** |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | **0.21.0** |
| `@midnight-ntwrk/compact-js` | 2.5.1 | 3.0.0 |
| ledger | `@midnight-ntwrk/ledger-v8` 8.1.0 | **`@midnightntwrk/ledger-v9` 1.0.0** |
| onchain runtime | `@midnight-ntwrk/onchain-runtime-v3` 3.0.0 | `@midnightntwrk/onchain-runtime-v4` 4.0.0 |
| ledger 8 (loaded on demand) | see the ledger row | `@midnightntwrk/ledger-v8` 8.1.3 |
| ledger 8 onchain runtime | see the onchain runtime row | `@midnight-ntwrk/onchain-runtime-v3` 3.1.2 (the version the framework is tested with; the protocol package asks for `^3.0.0`) |
| `@midnight-ntwrk/platform-js` | 2.2.4 | 3.0.0 |
| `effect` | 3.20.0 | 3.22.1 |

Note the scope: the new protocol packages (`ledger-v9`, `onchain-runtime-v4`, wallet SDK,
DApp Connector API, address format) live on **`@midnightntwrk/*`** (no hyphen) on the public
npm registry. `compact-runtime`, `compact-js`, `platform-js` and the framework's own
`@midnight-ntwrk/midnight-js-*` packages keep the old scope.

**Depend on `@midnight-ntwrk/compact-runtime@0.21.0`** yourself. Your compiled ledger 9
contracts import it.

**Pin one copy of each protocol package.** Two installed copies of a WASM-based package
break in two ways: TypeScript sees two different classes (`TS2345`), and at run time each
copy refuses objects made by the other (`expected instance of StateValue`). The framework
pins `ledger-v9` and `onchain-runtime-v4` to exact versions, but `compact-js` asks for
`ledger-v9` and `platform-js` with caret ranges (`^1.0.0`, `^3.0.0`), and your own
dependencies may ask for ranges too. A newer release can then install a second copy. Pin all
three in your root `package.json` (`resolutions` for yarn, `overrides` for npm and pnpm):

```jsonc
{
  "resolutions": {
    "@midnightntwrk/ledger-v9": "1.0.0",
    "@midnightntwrk/onchain-runtime-v4": "4.0.0",
    "@midnight-ntwrk/platform-js": "3.0.0"
  }
}
```

After `yarn install`, check that each of `@midnightntwrk/ledger-v9`,
`@midnightntwrk/onchain-runtime-v4` and `@midnight-ntwrk/platform-js` is installed once.

If you ship a ledger 8 contract, also pin `@midnight-ntwrk/onchain-runtime-v3` to `3.1.2`, so that
your ledger 8 contract module and the framework share one copy (see
[Dependencies of a ledger 8 contract](#dependencies-of-a-ledger-8-contract)).

---

## Step 2 — Choose the artifacts for each contract

**Why:** the framework places each contract on an era by the runtime version its artifacts
declare. It knows two: runtime `0.16` → ledger 8, runtime `0.21` → ledger 9. Anything else
is refused with `EraMismatchError` (reason `'unknown-artifact-runtime-version'`). That
includes artifacts from compactc 0.33, 0.34 and 0.35 (runtime 0.18, 0.19 and 0.20).

Two rules decide which artifacts a contract needs:

- **Before the fork, ledger 9 contracts do not run.** While the network is on ledger 8, a
  ledger 9 contract can be neither deployed nor called. The framework refuses it before
  proving, with `EraMismatchError` (reason `'ledger9-artifact-on-ledger8-network'`).
- **A contract keeps the verifier keys it was deployed with.** compactc 0.36 emits ZKIR v3
  only (ZKIR is the circuit format proofs are made from). So a recompiled circuit has a
  different verifier key than the one a pre-fork deploy (compactc 0.31, ZKIR v2) registered
  on chain. `findDeployedContract` with recompiled artifacts refuses a contract deployed
  before the fork with `ContractTypeError`; the circuits whose keys differ are on
  `mismatchedCircuitIds`.

So pick the artifacts by **when the contract is deployed**:

| Contract | Artifacts | Works |
|---|---|---|
| Deployed before the fork (with 4.1.1 or with this release) | its v4.1.1 build, as a **ledger 8 contract** | before and after the fork |
| Deployed after the fork | recompiled with **compactc 0.36.0**, as a **ledger 9 contract** | after the fork |
| Deployed at run time by your dApp | **both**: the ledger 8 build until the fork, the recompiled build from the fork on | both sides |

Most dApps ship this release before the fork, so most need the ledger 8 build for the
contracts they already have, and the recompiled build for contracts they deploy after the
fork. They also need providers that serve both eras until the fork
([Step 6](#step-6--update-the-proof-wallet-and-midnight-providers)). A dApp that starts
after the fork and uses only contracts deployed after it needs only the recompiled build.

### Ledger 8 contract: keep the v4.1.1 build

Pass the generated contract **instance** to the framework, not a `CompiledContract`
wrapper:

```ts
import { Contract } from './managed/counter/contract/index.js'; // generated by compactc 0.31

const found = await findDeployedContract(providers, {
  compiledContract: new Contract(witnesses),
  contractAddress
});
```

A ledger 8 contract can be deployed, called and maintained **before** the fork. **After**
the fork it can only be called; to maintain it, use the recompiled build
([If you keep ledger 8 contracts](#if-you-keep-ledger-8-contracts)). Wrapping it in
`CompiledContract.make` fails with `EraMismatchError` (reason
`'ledger8-artifacts-in-ledger9-container'`). A ledger 8 contract also needs its own runtime
package installed ([Dependencies of a ledger 8 contract](#dependencies-of-a-ledger-8-contract)).

### Ledger 9 contract: recompile with compactc 0.36.0

Use exactly compactc 0.36.0. Wrap the result with `CompiledContract.make(...)` exactly as in
4.1.1; only the import path changes
([Step 3](#step-3--import-ledger-9-from-the-era-named-subpaths)).

```ts
// Before (v4.1.1)
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// After (v5.0.0)
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
// or, from the barrel:
import { CompiledContract } from '@midnight-ntwrk/midnight-js/protocol/v9';
```

Gotcha: ZKIR v3 prover keys are larger. In the framework's own test contracts they are 1.7
to 4.7 times the size of the ZKIR v2 ones, so expect larger artifact downloads.

Read [Operating across the ledger fork](#operating-across-the-ledger-fork) before you ship.

---

## Step 3 — Import ledger 9 from the era-named subpaths

**Why:** in 4.1.1 the unnamed subpaths of `@midnight-ntwrk/midnight-js-protocol` served
ledger 8. They are removed, so each import must say which ledger it wants. Your build fails
on each old import until you change it.

| v4.1.1 import | v5.0.0 import |
|---|---|
| `…/ledger` | `…/v9` |
| `…/compact-runtime` | `…/v9/compact-runtime` |
| `…/compact-js` | `…/v9/compact-js` |
| `…/compact-js/effect` | `…/v9/compact-js/effect` |
| `…/compact-js/effect/Contract` | `…/v9/compact-js/effect/Contract` |
| `…/onchain-runtime` | `…/v9/onchain-runtime` |
| `import { ledger } from '…'` | `import * as ledger from '…/v9'` |
| `import { compactRuntime } from '…'` | `import * as compactRuntime from '…/v9/compact-runtime'` |
| `import { compactJs } from '…'` | `import * as compactJs from '…/v9/compact-js'` |
| `import { onchainRuntime } from '…'` | `import * as onchainRuntime from '…/v9/onchain-runtime'` |

`…` stands for `@midnight-ntwrk/midnight-js-protocol`.

```ts
// Before (v4.1.1)
import { Transaction } from '@midnight-ntwrk/midnight-js-types';
import { CostModel } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';

// After (v5.0.0)
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
```

Gotchas:

- `@midnight-ntwrk/midnight-js-types` no longer re-exports `Transaction`. Import it from
  `@midnight-ntwrk/midnight-js-protocol/v9`.
- The `platform` namespace and the `./platform-js` subpaths do not depend on the ledger and
  stay as they are.
- The barrel `@midnight-ntwrk/midnight-js` adds the subpath `./protocol/v9`
  (`CompiledContract`, `ContractExecutable`, type `Contract`) and the root namespace
  `ledger9Protocol`.

---

## Step 4 — Serve the `compiler/` directory with your ZK artifacts

**Why:** two new checks run on every contract's artifacts.

1. **Integrity check.** `NodeZkConfigProvider` and `FetchZkConfigProvider` check every
   artifact against `compiler/contract-manifest.json`. The check is *fail-closed*: by default
   (`verify: 'require'`) a missing manifest, or an artifact that does not match it, throws
   `ZkArtifactIntegrityError`.
2. **Runtime version.** Every contract operation reads the runtime version the artifacts
   declare, to know the contract's era ([Step 2](#step-2--choose-the-artifacts-for-each-contract)).
   The shipped providers read `runtime-version` from `compiler/contract-manifest.json`, or
   from `compiler/contract-info.json` when there is no manifest.

**What to do:** serve the whole `compiler/` directory that `compactc` writes, next to
`keys/` and `zkir/`. compactc 0.36.0 writes the manifest.

**Choose an integrity mode** (`ZkConfigIntegrityOptions`):

| `verify` | Use it when |
|---|---|
| `'require'` (default) | Your artifacts come from compactc 0.36.0. |
| `'require-if-present'` | Some artifacts come from compactc 0.31 (ledger 8 contracts). That compiler writes `contract-info.json` but no manifest. A missing manifest only warns; a manifest that is there must still cover the artifact. |
| `'warn'` | Short term only, while you regenerate artifacts. |
| `'off'` | Never in production. |

To defend against someone swapping both the artifacts and the manifest, pin the manifest's
SHA-256 with `expectedManifestHash`.

```ts
// Before (v4.1.1)
const zkConfigProvider = new NodeZkConfigProvider(artifactDir);
const browserZkConfigProvider = new FetchZkConfigProvider(baseURL, myFetch);

// After (v5.0.0)
const zkConfigProvider = new NodeZkConfigProvider(artifactDir, {
  verify: 'require',
  expectedManifestHash: MANIFEST_SHA256
});
const browserZkConfigProvider = new FetchZkConfigProvider(baseURL, { fetchFunc: myFetch });
```

Gotchas:

- **`FetchZkConfigProvider` takes an options object as its second argument.** A custom
  `fetch` moves into `{ fetchFunc }`. Passing the function itself no longer works.
- **Custom `ZKConfigProvider` classes** must override `getArtifactRuntimeVersion()` and return
  the `runtime-version` of the artifacts they serve. The base class throws
  `ArtifactRuntimeVersionUnavailableError`. Without the method, every contract operation
  fails with `EraMismatchError` (reason `'provider-cannot-declare-era'`). A test mock written
  as an object literal without the method fails with a plain `TypeError`.

```ts
class MyZkConfigProvider extends ZKConfigProvider<string> {
  // ...the methods you already have
  override async getArtifactRuntimeVersion(): Promise<string> {
    return '0.21.0';
  }
}
```

- Missing runtime version → `EraMismatchError` (reason `'artifact-era-undeclared'`).

---

## Step 5 — Add `config` to your providers

**Why:** the framework no longer reads a global network id, and the transaction time-to-live
(TTL) is no longer fixed at one hour. Both now come from a required `config` field on
`MidnightProviders`.

```ts
// Before (v4.1.1)
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preview');
const providers = {
  privateStateProvider, publicDataProvider, zkConfigProvider,
  proofProvider, walletProvider, midnightProvider
};

// After (v5.0.0)
const providers = {
  privateStateProvider, publicDataProvider, zkConfigProvider,
  proofProvider, walletProvider, midnightProvider,
  config: { networkId: 'preview', ttlSeconds: 3600 }
};
```

- `ttlSeconds: 3600` keeps the one-hour lifetime of the intents the framework builds, as in
  4.1.1.
- **New:** the framework now passes the TTL to `walletProvider.balanceTx(tx, ttl)`. In 4.1.1
  it called `balanceTx(tx)` with no TTL, so the wallet chose its own.
- Delete every `setNetworkId` / `getNetworkId` call. The `networkId` namespace and the
  `./network-id` subpath of `@midnight-ntwrk/midnight-js` are gone too.
- Import the `NetworkId` type from `@midnight-ntwrk/midnight-js-types`.
- Low-level builders that take no `providers`:
  - `createUnprovenCallTxFromInitialStates`: add `config` to its options.
  - `createUnprovenDeployTxFromVerifierKeys`: pass `config` as the new last argument.

**Errors:** a missing `config` throws `ConfigurationError`. A bad `networkId` (empty, or with
spaces around it) or a bad `ttlSeconds` (not a positive whole number, or too large for a
`Date`) throws `InvalidArgumentError`. To check the config yourself, call
`assertValidMidnightConfig` from `@midnight-ntwrk/midnight-js-utils`, or build the whole set
with `createMidnightProviders` ([Step 19](#step-19--optional-adopt-the-new-features)).

If you implement `WalletProvider`, use the `ttl` argument of `balanceTx` for the intent your
wallet adds, rather than a TTL of your own. A DApp Connector wallet keeps its own lifetime.

---

## Step 6 — Update the proof, wallet and midnight providers

**Why:** two changes meet here.

1. Transactions cross the three provider methods as **handles** (`LedgerTransaction`), not as
   ledger objects. A handle holds the transaction's bytes, its era and its stage.
2. Each of the three providers declares the eras it serves, in a required
   `readonly supportedEras: readonly LedgerEra[]`. The framework reads it **before** an
   operation starts. If the set of providers cannot carry the transaction from start to end,
   it throws `ProviderEraUnsupportedError` before any proof is paid for.

```ts
// Before (v4.1.1)
proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<UnboundTransaction>;
balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
submitTx(tx: FinalizedTransaction): Promise<TransactionId>;

// After (v5.0.0)
proveTx(unprovenTx: UnprovenTx, proveTxConfig?: ProveTxConfig): Promise<UnboundTx>;
balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>;
submitTx(tx: FinalizedTx): Promise<TransactionId>;
```

`UnprovenTx`, `UnboundTx` and `FinalizedTx` are `LedgerTransaction<'Unproven'>`,
`LedgerTransaction<'Unbound'>` and `LedgerTransaction<'Finalized'>` from
`@midnight-ntwrk/midnight-js-types`.

### Which providers to use

The framework checks the providers against the era the network is on when an operation
starts. So the providers must serve every era your build will run on.

- **Your dApp ships before the fork (most dApps):** every proof, wallet and midnight
  provider must serve `'v8'` and `'v9'`. Use `httpClientProofProvider`,
  `dappConnectorProofProvider` and `dappConnectorWalletProviders`, or build your own with the
  per-era factories. See [Providers that serve both eras](#providers-that-serve-both-eras).
- **Your dApp starts after the fork:** the ledger 9 adapters below (`createLedger9*`, which
  serve `'v9'` only) are enough.

### If you use `httpClientProofProvider` or `dappConnectorProofProvider`

Nothing to do for the type change. Both already speak handles, and both serve both eras.

### If you used `createProofProvider`

It is renamed `createLedger9ProofProvider`. Same arguments. It serves `'v9'` only: before
the fork, use a proof provider that serves both eras instead.

```ts
// Before (v4.1.1)
const proofProvider = createProofProvider(provingProvider);

// After (v5.0.0)
const proofProvider = createLedger9ProofProvider(provingProvider);
```

### If you wrote your own wallet or midnight provider

If your dApp ships before the fork, write one handler per era with
`createWalletProviderFromHandlers` and `createMidnightProviderFromHandlers`, as shown in
[Providers that serve both eras](#providers-that-serve-both-eras). If it starts after the
fork, wrap your provider with the ledger 9 adapters from `@midnight-ntwrk/midnight-js-types`. They set
`supportedEras: ['v9']`, hand you the v9 handle, and turn your answer back into a handle.
If your wallet runs its own copy of the ledger (wallet SDK, browser wallet), send it the
bytes with `tx.serialize()`. Its answer may be a transaction object of any ledger copy, or
its bytes.

```ts
// Before (v4.1.1)
const walletProvider: WalletProvider = {
  balanceTx: (tx, ttl) => wallet.balanceTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
};
const midnightProvider: MidnightProvider = {
  submitTx: (tx) => wallet.submitTransaction(tx)
};

// After (v5.0.0)
import {
  createLedger9MidnightProvider,
  createLedger9WalletProvider
} from '@midnight-ntwrk/midnight-js-types';

const walletProvider = createLedger9WalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceTransaction(tx.serialize(), ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
const midnightProvider = createLedger9MidnightProvider((tx) =>
  wallet.submitTransaction(tx.serialize())
);
```

`wallet` stands for your own wallet object.

**A ledger 9 only set cannot serve ledger 8 transactions.** Before the fork, every ledger 8
operation is refused with `ProviderEraUnsupportedError`.

### Gotcha: `proveTxConfig.timeout`

`createLedger9ProofProvider`, `createProofProviderFromProvingProviders` and
`dappConnectorProofProvider` now **refuse** `proveTx(tx, { timeout })` with
`InvalidArgumentError`. In 4.1.1 the option was silently ignored there. Drop it for these
providers. `httpClientProofProvider` honours it (in 4.1.1 it ignored it too).

---

## Step 7 — Pass transactions as handles

**Why:** see [Step 6](#step-6--update-the-proof-wallet-and-midnight-providers). This step
covers your own code that touches transactions.

A handle is a `LedgerTransaction` from `@midnight-ntwrk/midnight-js-types`:

| You want to | Call |
|---|---|
| Make a handle from a ledger transaction object | `LedgerTransaction.seal(era, stage, tx)` |
| Make a handle from bytes | `LedgerTransaction.fromBytes(era, stage, bytes)` |
| Get the bytes | `handle.serialize()` |
| Get a ledger object back | `handle.deserialize({ v9: Transaction })` |
| Read its era or stage | `handle.era`, `handle.stage` |

`deserialize` decodes with **your** copy of the ledger (the `Transaction` class you pass).
It throws `TransactionDecoderMissingError` if you gave no decoder for the handle's era, and
`TransactionDecodeFailedError` if the bytes do not decode. `fromBytes` and `seal` refuse
bytes without the right header with `InvalidTransactionHandleError`.

### Calling the provider methods yourself

Seal once, before the first call. Each method returns the handle the next one needs.

```ts
// Before (v4.1.1)
const proven = await proofProvider.proveTx(unprovenTx);
const balanced = await walletProvider.balanceTx(proven);
const txId = await midnightProvider.submitTx(balanced);

// After (v5.0.0)
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';

const proven = await proofProvider.proveTx(LedgerTransaction.seal('v9', 'Unproven', unprovenTx));
const balanced = await walletProvider.balanceTx(proven);
const txId = await midnightProvider.submitTx(balanced);
```

### `submitTx` from `contracts`

Before (v4.1.1), `unprovenTx` was a ledger `UnprovenTransaction`:

```ts
const finalized = await submitTx(providers, { unprovenTx });
```

After (v5.0.0), seal it first. `ledgerUnprovenTx` stands for the ledger transaction you built:

```ts
import { contracts, types } from '@midnight-ntwrk/midnight-js';

declare const providers: types.MidnightProviders;
declare const ledgerUnprovenTx: types.LedgerTransactionTypes['v9']['Unproven'];

const submitBuiltTransaction = async (): Promise<types.FinalizedTxRead> => {
  const unprovenTx = types.LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
  return contracts.submitTx(providers, { unprovenTx });
};
```

`submitTx` now resolves to `FinalizedTxRead` ([Step 11](#step-11--narrow-finalized-records-on-era))
and takes one type parameter: write `submitTx<PCK>(…)`, not `submitTx<C, PCK>(…)`.

### `.private.unprovenTx` on built results

The results of `createUnprovenCallTx`, `createUnprovenDeployTx` and the deploy and call
functions carry `private.unprovenTx` as a handle. Pass it on as it is. Decode it only where
you need the ledger object.

Before (v4.1.1):

```ts
console.log(callTx.private.unprovenTx.identifiers());
```

After (v5.0.0), decode it with your own ledger copy only where you need the object, and pass
the handle on unchanged. `inspect` stands for your own code:

```ts
import { contracts, type ledger9Protocol, types } from '@midnight-ntwrk/midnight-js';
import { Transaction, type UnprovenTransaction } from '@midnightntwrk/ledger-v9';

declare const callTx: contracts.UnsubmittedCallTxData<
  contracts.Ledger9Contract,
  ledger9Protocol.Contract.ProvableCircuitId<contracts.Ledger9Contract>
>;
declare const proofProvider: types.ProofProvider;
declare const inspect: (tx: UnprovenTransaction) => void;

const proveCall = async (): Promise<types.UnboundTx> => {
  const { unprovenTx } = callTx.private;
  if (unprovenTx.era === 'v9') {
    inspect(unprovenTx.deserialize({ v9: Transaction }));
  }
  return proofProvider.proveTx(unprovenTx);
};
```

Gotcha: a copy of a handle (`structuredClone`, `postMessage`, JSON, object spread) is **not**
a handle. To send one to a worker or store it, send `serialize()`, `era` and `stage`, and
call `LedgerTransaction.fromBytes` on the other side.

---

## Step 8 — Reach private state through `forContract`

**Why:** in 4.1.1 the private state provider held one "current" contract address, set with
`setContractAddress`. Two flows that ran at once could overwrite each other's address. In
5.0.0 you ask for a view of one contract's private states.

```ts
// Before (v4.1.1)
providers.privateStateProvider.setContractAddress(contractAddress);
const state = await providers.privateStateProvider.get(privateStateId);
await providers.privateStateProvider.set(privateStateId, nextState);
await providers.privateStateProvider.clear();

// After (v5.0.0)
const states = providers.privateStateProvider.forContract(contractAddress);
const state = await states.get(privateStateId);
await states.set(privateStateId, nextState);
await states.clear();                          // this contract only
await providers.privateStateProvider.clearAll(); // every contract
```

- `get`, `set`, `remove`, `clear`, `exportPrivateStates` and `importPrivateStates` moved to
  the view. An export now holds one contract's states, and an import writes into the
  contract you name.
- Signing-key methods (`getSigningKey`, `setSigningKey`, …) stay on the provider.
- `forContract` refuses an invalid address with `InvalidArgumentError`.
- `changePassword` on the level provider needs no address and re-encrypts every contract.
  **Security fix:** in 4.1.1, if the contract set with `setContractAddress` had no states,
  `changePassword` re-encrypted nothing and still reported success. If you rotated a
  password in 4.x, run `changePassword(() => oldPassword, () => newPassword)` again after
  upgrading.
- **Addresses are compared in lower case.** States or signing keys stored under an address
  with upper-case letters are no longer found. Fix them **before** you upgrade, with 4.1.1:
  - States: export them with 4.1.1 and import them after the upgrade.
  - Signing keys: do not export them, because 5.0.0 refuses a 4.1.1 key export
    ([Step 15](#step-15--move-signing-keys-to-the--tag-value--shape)). Store each one again under the
    lower-case address instead:
    `setSigningKey(address.toLowerCase(), await getSigningKey(address))`. 5.0.0 then reads
    it as usual.
- **Keep the `accountId`** an existing level store was created with. Another value opens a
  different, empty store.
- **Store plain data only.** `levelPrivateStateProvider` now refuses a private state that
  does not survive a save and load (functions, class instances, `ArrayBuffer`, `Error`, …)
  with `PrivateStateSerializationError`. In 4.1.1 such a value was stored and came back as
  something else.

**If you implement `PrivateStateProvider`:** add `forContract` and `clearAll`; remove
`setContractAddress`, `get`, `set`, `remove`, `clear`, `exportPrivateStates` and
`importPrivateStates` from the provider.

---

## Step 9 — Decode on-chain state yourself

**Why:** on-chain state now comes back as **bytes plus an era**, not as a decoded object.
Your contract's `ledger()` function only accepts objects made by the runtime copy it was
compiled with. A state decoded by any other copy, including the framework's, fails with
`expected instance of ChargedState`. So you decode it with your own runtime.

### What the reads return

| Method | v4.1.1 | v5.0.0 |
|---|---|---|
| `queryContractState` | `ContractState \| null` | `ContractStateAndParametersRead \| null` |
| `queryZSwapAndContractState` | `[ZswapChainState, ContractState, LedgerParameters] \| null` | `PublicStatesRead \| null` (an object, not a tuple) |
| `queryDeployContractState` | `ContractState \| null` | `ContractStateRead \| null` |
| `watchForContractState` | `ContractState` | `ContractStateRead` |
| `contractStateObservable` | `Observable<ContractState>` | `Observable<PositionedRecord<ContractStateRead>>` ([Step 10](#step-10--read-recordvalue-from-the-state-and-balance-streams)) |
| `getPublicStates` | `PublicContractStates` | `PublicStatesRead` |
| `getStates` | `PublicContractStates` + `privateState` | `PublicStatesRead` + `privateState` |

- `ContractStateRead` has `protocolVersion` and `contractState`.
- `ContractStateAndParametersRead` adds `ledgerParameters`.
- `PublicStatesRead` adds `zswapChainState` to that.

Each state is one of three classes from `@midnight-ntwrk/midnight-js-types`:
`SerializedContractState`, `SerializedLedgerParameters` or `SerializedZswapChainState`. Each
holds the bytes and the `era` of the ledger that wrote them. Decode one with `deserialize`,
passing a decoder for each era it may be.

### Reading a contract state

```ts
// Before (v4.1.1)
const state = await publicDataProvider.queryContractState(address);
const counter = state === null ? null : ledger(state.data);

// After (v5.0.0)
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { ledger } from './managed/counter/contract/index.js';

const read = await publicDataProvider.queryContractState(address);
const counter = read === null ? null : ledger(read.contractState.deserialize({ v9: ContractState }).data);
```

Import `ContractState` from **your own** `@midnight-ntwrk/compact-runtime` (0.21.0), the one
your contract uses.

### Reading zswap state and ledger parameters

These have no class in `compact-runtime`. Decode them with the ledger package.

```ts
// Before (v4.1.1)
const [zswapChainState, contractState, ledgerParameters] =
  (await publicDataProvider.queryZSwapAndContractState(address))!;

// After (v5.0.0)
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import { LedgerParameters, ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/v9';

const states = await publicDataProvider.queryZSwapAndContractState(address);
if (states !== null) {
  const contractState = states.contractState.deserialize({ v9: ContractState });
  const zswapChainState = states.zswapChainState.deserialize({ v9: ZswapChainState });
  const ledgerParameters = states.ledgerParameters.deserialize({ v9: LedgerParameters });
}
```

`getPublicStates` and `getStates` return the same shape. Inside a scoped transaction,
`Ledger9TransactionContext.getCurrentStates()` returns a `PublicStatesRead` too.

### Other places that now hold serialized state

- Deploy results: `deployTxData.public.initialContractState` is a `SerializedContractState`.
- Call builders: the `initialContractState`, `initialZswapChainState` and `ledgerParameters`
  inputs of `createUnprovenCallTxFromInitialStates`. Pass `read.contractState` (and the other
  fields) unchanged; do not decode them first.
- `ContractTypeError.contractState`.
- **`verifyContractState` is now async** and takes a `SerializedContractState`:

```ts
// Before (v4.1.1)
verifyContractState(verifierKeys, contractState);

// After (v5.0.0)
await verifyContractState(verifierKeys, read.contractState);
```

Not changed: `Ledger9ContractConstructorResult.nextContractState` is still a decoded object.

### Gotchas

- `deserialize` throws `SerializedStateDecoderMissingError` if you passed no decoder for the
  state's era, and `SerializedStateDecodeFailedError` if your decoder throws.
- A `Serialized*` object keeps its bytes in a private field. `structuredClone`,
  `postMessage` and JSON drop them. Send `serialize()` and `era`, and rebuild it with
  `SerializedContractState.fromBytes(era, bytes)` (or the same method of the other two
  classes).
- A contract deployed before the fork has a `v8` deploy state. To read one, pass a `v8`
  decoder as well (see [Operating across the ledger fork](#reading-the-state-of-a-ledger-8-contract)).
- Contract-state reads now refuse a block whose `protocolVersion` this version cannot place
  on an era, with `UnknownRecordEraError`, and `contractStateObservable` ends with it. This
  means the network moved to a ledger newer than your midnight-js: upgrade midnight-js.

---

## Step 10 — Read `record.value` from the state and balance streams

**Why:** `contractStateObservable` and `unshieldedBalancesObservable` now tell you where in
the chain each value came from, so you can resume after a restart.

Each emission is a `PositionedRecord<T>`: `{ value, blockHeight, blockHash }`.

```ts
// Before (v4.1.1)
publicDataProvider
  .contractStateObservable(address, { type: 'latest' })
  .subscribe((state) => render(state));

// After (v5.0.0)
publicDataProvider
  .contractStateObservable(address, { type: 'latest' })
  .subscribe((record) => render(record.value)); // record.value is a ContractStateRead
```

To resume after a restart, keep the last `blockHeight` and pass it back as
`{ type: 'blockHeight', blockHeight: record.blockHeight }`. Leave `inclusive` unset: the
stream then repeats values from that block rather than skipping part of it, so expect some
repeats.

---

## Step 11 — Narrow finalized records on `era`

**Why:** after the fork, the chain holds transactions of both eras. A finalized-transaction
record now says which era it belongs to.

| v4.1.1 | v5.0.0 |
|---|---|
| `FinalizedTxData` (one shape, `tx: Transaction`) | `FinalizedTxRead` = `Ledger8FinalizedTxData \| Ledger9FinalizedTxData`, tagged by `era` |

`watchForTxData`, `watchForDeployTxData` and `submitTx` (contracts) return
`FinalizedTxRead`. Its `tx` is a `FinalizedTx` handle of the same era
(`record.tx.era === record.era`). Narrow on `record.era` before you touch `tx`.

Before (v4.1.1):

```ts
const record = await publicDataProvider.watchForTxData(txId);
const ids = record.tx.identifiers();
```

After (v5.0.0), if you expect only ledger 9 records, check the era and decode with your own
ledger copy:

```ts
import { types } from '@midnight-ntwrk/midnight-js';
import { Transaction } from '@midnightntwrk/ledger-v9';

declare const publicDataProvider: types.PublicDataProvider;

const readIdentifiers = async (txId: string): Promise<string[]> => {
  const record = await publicDataProvider.watchForTxData(txId);
  if (record.era !== 'v9') {
    throw new Error(`Expected a ledger 9 record, got ${record.era}`);
  }
  return record.tx.deserialize({ v9: Transaction }).identifiers();
};
```

To treat both eras, switch on `record.era`. `describeNative` and `describeRetained` stand for
your own code:

```ts
import { types, utils } from '@midnight-ntwrk/midnight-js';

declare const describeNative: (tx: types.LedgerTransaction<'Finalized', 'v9'>) => string;
declare const describeRetained: (tx: types.LedgerTransaction<'Finalized', 'v8'>) => string;

const summarize = (record: types.FinalizedTxRead): string => {
  switch (record.era) {
    case 'v9':
      return `native ${record.txId}: ${describeNative(record.tx)}`;
    case 'v8':
      return `retained ${record.txId}: ${describeRetained(record.tx)}`;
    default:
      return utils.assertNever(record, 'summarize');
  }
};
```

- Close the switch with `assertNever(value, '<where>')`. If a new era is ever added, that line
  stops compiling and shows you the switch to change. The second argument is required: it is
  the only thing in the error that says where it came from.
- Do **not** treat a `v8` record as an error. A dApp that reads its own history from before
  the fork will receive them.
- Status fields (`status`, `txId`, `txHash`, `blockHeight`, …) are on both variants.

### Deploy records from `findDeployedContract`

`found.deployTxData.public` is tagged by `era` too. A ledger 8 contract, found through its
ledger 8 instance, reports a `v8` deploy record. Both variants have `contractAddress` and `initialContractState` (a
`SerializedContractState`). Narrow on `era` before you read `tx`, and decode
`initialContractState` by its own `era`.

```ts
const found = await findDeployedContract(providers, { compiledContract, contractAddress });
const deploy = found.deployTxData.public;
console.log(deploy.contractAddress); // both eras
if (deploy.era === 'v9') {
  inspect(deploy.tx.deserialize({ v9: Transaction }));
}
```

### Maintenance results

`submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx` and
the maintenance interfaces now resolve `{ era, public }`. The record is under `public`.

```ts
// Before (v4.1.1)
const { status } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');

// After (v5.0.0)
const { public: { status } } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
```

---

## Step 12 — Rename the ledger 9 types and fix generic code

**Why:** the same functions now serve ledger 8 and ledger 9 contracts. Types that describe
only ledger 9 got a `Ledger9` prefix. Types you name **with a contract type** keep their
4.1.1 names and pick the era from the contract.

**Code that names a concrete contract does not change:**

```ts
// Same in v4.1.1 and v5.0.0
const found: FoundContract<typeof MyContract> = await findDeployedContract(providers, options);
```

**Generic code must name the era**, because the flat name cannot pick one from an unknown `C`:

```ts
// Before (v4.1.1)
const check = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  data: FinalizedCallTxData<C, PCK>
) => data.public;

// After (v5.0.0)
const check = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  data: Ledger9FinalizedCallTxData<C, PCK>
) => data.public;
```

The same holds for return types: a helper typed `Promise<FoundContract<C>>` around
`findDeployedContract` becomes `Promise<Ledger9FoundContract<C>>`.

**`ContractProviders` changed shape.** It now needs the contract and lost the third type
parameter. Write `ContractProviders<typeof MyContract>`. To pass the private state type, use
`Ledger9ContractProviders<C, PCK, PS>`.

**Renamed exports** (`contracts` unless noted):

| v4.1.1 | v5.0.0 |
|---|---|
| `CallOptions`, `CallOptionsBase`, `CallOptionsWithArguments`, `CallOptionsWithPrivateState`, `CallOptionsWithProviderDataDependencies` | `Ledger9CallOptions`, `Ledger9CallOptionsBase`, `Ledger9CallOptionsWithArguments`, `Ledger9CallOptionsWithPrivateState`, `Ledger9CallOptionsWithProviderDataDependencies` |
| `CallOptionsProviderDataDependencies` | `Ledger9CallOptionsProviderDataDependencies` (adds required `config`; states are serialized) |
| `CallResult`, `CallResultPublic` | `Ledger9CallResult`, `Ledger9CallResultPublic` |
| `CircuitMaintenanceTxInterface`, `ContractMaintenanceTxInterface` | `Ledger9CircuitMaintenanceTxInterface`, `Ledger9ContractMaintenanceTxInterface` |
| `ContractConstructorOptions`, `ContractConstructorOptionsBase`, `ContractConstructorOptionsWithArguments`, `ContractConstructorOptionsWithPrivateState`, `ContractConstructorOptionsWithProviderDataDependencies` | `Ledger9ContractConstructorOptions`, `Ledger9ContractConstructorOptionsBase`, `Ledger9ContractConstructorOptionsWithArguments`, `Ledger9ContractConstructorOptionsWithPrivateState`, `Ledger9ContractConstructorOptionsWithProviderDataDependencies` |
| `ContractConstructorResult` | `Ledger9ContractConstructorResult` |
| `DeployTxOptions`, `DeployTxOptionsBase`, `DeployTxOptionsWithPrivateState`, `DeployTxOptionsWithPrivateStateId` | `Ledger9DeployTxOptions`, `Ledger9DeployTxOptionsBase`, `Ledger9DeployTxOptionsWithPrivateState`, `Ledger9DeployTxOptionsWithPrivateStateId` |
| `FinalizedDeployTxDataBase` | `Ledger9FinalizedDeployTxDataBase` |
| `FindDeployedContractOptionsBase`, `FindDeployedContractOptionsExistingPrivateState`, `FindDeployedContractOptionsStorePrivateState` | `Ledger9FindDeployedContractOptionsBase`, `Ledger9FindDeployedContractOptionsExistingPrivateState`, `Ledger9FindDeployedContractOptionsStorePrivateState` |
| `TransactionContext` | `Ledger9TransactionContext` |
| `UnprovenCallTxProvidersWithPrivateState`, `UnprovenDeployTxOptions`, `UnprovenDeployTxProviders` | `Ledger9UnprovenCallTxProvidersWithPrivateState`, `Ledger9UnprovenDeployTxOptions`, `Ledger9UnprovenDeployTxProviders` |
| `UnsubmittedDeployTxData`, `UnsubmittedDeployTxDataBase`, `UnsubmittedDeployTxPrivateData`, `UnsubmittedDeployTxPublicData`, `UnsubmittedTxData` | `Ledger9UnsubmittedDeployTxData`, `Ledger9UnsubmittedDeployTxDataBase`, `Ledger9UnsubmittedDeployTxPrivateData`, `Ledger9UnsubmittedDeployTxPublicData`, `Ledger9UnsubmittedTxData` |
| `PublicContractStates` | `PublicStatesRead` (now in `types`) |
| `FinalizedTxData` (types) | `Ledger9FinalizedTxData`; for both eras `FinalizedTxRead` |
| `UnboundTransaction` (types) | `Ledger9UnboundTransaction` |
| `ContractExecutableRuntimeOptions` (types) | `Ledger9ContractExecutableRuntimeOptions` |
| `makeContractExecutableRuntime` (types) | `makeLedger9ContractExecutableRuntime` |
| `createProofProvider` (types) | `createLedger9ProofProvider` |

Names kept from 4.1.1 that now pick the era from the contract: `FoundContract`,
`DeployedContract`, `FinalizedCallTxData`, `SubmittedCallTx`, `UnsubmittedCallTxData`,
`FinalizedDeployTxData`, `CallResultPrivate`, `CallTxOptions`, `CallTxOptionsBase`,
`CallTxOptionsWithPrivateStateId`, `DeployContractOptions`, `DeployContractOptionsBase`,
`DeployContractOptionsWithPrivateState`, `FindDeployedContractOptions`,
`CircuitCallTxInterface`, `CircuitMaintenanceTxInterfaces`, `ContractProviders`,
`SubmitTxProviders`.

The low-level functions `createUnprovenCallTx`, `createUnprovenCallTxFromInitialStates`,
`createUnprovenDeployTx`, `createUnprovenDeployTxFromVerifierKeys` and `submitDeployTx` keep
their names and route on the contract's era.

---

## Step 13 — Fix deploy options and scoped transactions

### `privateStateId` needs `initialPrivateState`

In 4.1.1, `deployContract(providers, { compiledContract, privateStateId })` compiled and
stored `undefined` as the private state. In 5.0.0 it does not compile. At run time, half of
the pair throws `IncompleteDeployContractPrivateStateConfig`. Pass both, or neither:

```ts
// Before (v4.1.1)
await deployContract(providers, { compiledContract, privateStateId: 'counter' });

// After (v5.0.0)
await deployContract(providers, {
  compiledContract,
  privateStateId: 'counter',
  initialPrivateState: { count: 0 }
});
```

### Scoped transactions on ledger 8 take a `Ledger8TransactionContext`

`withContractScopedTransaction` batches several calls into one transaction, as in 4.1.1. In 5.0.0
it reads the network's era first and runs the scope of that era. **Before the fork the scope
function receives a `Ledger8TransactionContext`**: type the function's parameter as one, or call
`withLedger8ContractScopedTransaction`. After the fork the scope takes ledger 9 contracts only; a
ledger 8 contract called inside it is refused (reason `'ledger8-call-in-scope'`), so submit those
calls on their own with `submitCallTx`.

---

## Step 14 — Update error handling

**Why:** every framework error is now a `MidnightJsError` with a stable `code` and a
`category`. Several 4.1.1 classes were merged.

### One `TxFailedError` for every operation

The five 4.1.1 subclasses are gone. Catch `TxFailedError` and branch on `operation`.

| v4.1.1 class | v5.0.0 |
|---|---|
| `CallTxFailedError` | `TxFailedError`, `operation: 'call'` |
| `DeployTxFailedError` | `TxFailedError`, `operation: 'deploy'` |
| `InsertVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'insert-verifier-key'` |
| `RemoveVerifierKeyTxFailedError` | `TxFailedError`, `operation: 'remove-verifier-key'` |
| `ReplaceMaintenanceAuthorityTxFailedError` | `TxFailedError`, `operation: 'replace-authority'` |

- `error.finalizedTxData` is now `error.record`, a `FinalizedTxRead`. Narrow on
  `error.record.era` before you read `tx`.
- The message is a sentence, not a JSON dump of the record.
- `contractAddress`, `circuitId` and `signingKey` are optional fields.
- `signingKey` is not enumerable: object spread and `JSON.stringify` leave it out. Read it as
  `error.signingKey`.

### Provider rejections are wrapped in `ProviderFailedError`

A rejection from `proveTx`, `balanceTx` or `submitTx` used to reach you unchanged. Now it
arrives as `ProviderFailedError`. `error.method` names the provider method. `error.cause` is
a plain `Error` with the original class name and a redacted message (anything that could
hold transaction or witness data is removed). Match wallet or node messages on
`error.cause.message`, not on the provider's error class.

### `ContractTypeError` is no longer a `TypeError`

`ContractTypeError` now extends `MidnightJsError`, so `instanceof TypeError` no longer
matches it. It carries `missingCircuitIds`, `keylessCircuitIds`, `mismatchedCircuitIds`,
`circuitIds` and `contractAddress`.

### Plain errors became coded classes

Many failures that were plain `Error`, `TypeError` or `RangeError` now have their own class,
for example `ContractNotFoundError`, `PrivateStateNotFoundError`, `InvalidArgumentError`,
`ConfigurationError`, `PrivateStateDecryptionError` and `ProofServerError`. If you matched
error messages, match the class or the code instead.

```ts
// Before (v4.1.1)
try {
  await submitCallTx(providers, options);
} catch (e) {
  if (e instanceof CallTxFailedError) console.error(e.finalizedTxData.status);
  throw e;
}

// After (v5.0.0)
import { ProviderFailedError, TxFailedError } from '@midnight-ntwrk/midnight-js-contracts';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';

try {
  await submitCallTx(providers, options);
} catch (e) {
  if (e instanceof TxFailedError) {
    console.error(e.operation, e.record.status, e.record.era);
  } else if (e instanceof ProviderFailedError && e.method === 'balanceTx') {
    console.error('wallet refused:', e.cause);
  } else if (hasErrorCode(e, CONTRACTS_ERROR_CODES.FORK_CROSSED_DURING_OPERATION)) {
    // see "Operating across the ledger fork"
  } else if (hasErrorCode(e, CONTRACTS_ERROR_CODES.LEDGER8_UNCONFIRMED)) {
    // ledger 8 deploy or authority replacement: keep e.signingKey; do not deploy again
    // before you check the address on chain (see "Operating across the ledger fork")
  }
  throw e;
}
```

Prefer `hasErrorCode(error, code)` over `instanceof` when two copies of a package might be
installed: a code survives that, a class check does not. Helpers in
`@midnight-ntwrk/midnight-js-utils`: `hasErrorCode`, `isMidnightJsError`, `errorCategory`.
Every code is listed in
[TROUBLESHOOTING.md](../../../TROUBLESHOOTING.md#midnightjs-error-codes).

Around the fork, contract operations can also throw `ForkCrossedDuringOperationError`,
`SubmitRejectionUndiagnosedError` and `EraMismatchError`. A ledger 8 deploy or authority
replacement that may have landed throws `Ledger8UnconfirmedError` (`operation: 'deploy'` or
`'replace-authority'`) instead. Keep its `signingKey`, and check the address on chain before
you deploy again. See
[Operating across the ledger fork](#operating-across-the-ledger-fork).

---

## Step 15 — Move signing keys to the `{ tag, value }` shape

**Why:** compact-runtime 0.21 types a signing key as `{ tag: 'schnorr' | 'ecdsa'; value: string }`
instead of a bare hex string.

```ts
// Before (v4.1.1)
const options: ContractExecutableRuntimeOptions = {
  // ...
  signingKey: keyHex // 64 hex characters
};

// After (v5.0.0)
const options: Ledger9ContractExecutableRuntimeOptions = {
  // ...
  signingKey: { tag: 'schnorr', value: keyHex }
};
```

The same shape applies to the `signingKey` option of `deployContract` and
`findDeployedContract`.

- **Compare keys with `toEqual`**, not `toBe`. A returned key is equal in content but is a new
  object.
- To validate a key, use `isValidSigningKey(value)` from `@midnight-ntwrk/midnight-js-utils`.
  It is a type guard and needs `value` to be exactly 64 hex characters.

**Keys already in a level store need no action.** The level provider reads a 4.1.1 entry
(bare hex) as `{ tag: 'schnorr', value }`. An entry that is neither shape throws
`StoredSigningKeyFormatError`, which names the contract address. Fix it with
`setSigningKey(address, key)`, re-import it, or remove it with `removeSigningKey(address)`.

**Export files made by 4.1.1 do not import.** `importSigningKeys` now checks the shape before
it writes anything, and refuses a bare-hex export with `InvalidExportFormatError`. The keys
in an export file are encrypted (AES-256-GCM, in `encryptedPayload`), so you cannot edit
them in the file. Open the old store with a 5.0.0 client and run `exportSigningKeys` again.
The level provider reads keys stored by 4.x, so the new export has the new shape.

---

## Step 16 — Code that uses the ledger directly

Skip this step if you only use the framework's functions.

**State you serialized yourself under ledger 8 does not decode with ledger 9.** The
`ContractState` serialization tag moved from `[v6]` to `[v8]`, and there is no in-place
conversion. Rebuild such state from the chain. A failed decode through the framework's
helpers raises `DeserializationError`; its details are on `error.context`:

```ts
import { isDeserializationError } from '@midnight-ntwrk/midnight-js-utils';

try {
  decodeMyStoredState();
} catch (error) {
  if (isDeserializationError(error) && error.context.classification === 'version-mismatch') {
    console.error(error.context.mitigation.join('\n')); // mitigation is a string[]
  }
  throw error;
}
```

**`ZswapChainState.postBlockUpdate` takes a retention duration.** In ledger 9 the method is
`postBlockUpdate(blockTime, retentionDuration)`, where `retentionDuration` is a `bigint`:
how long to keep past Merkle roots.

```ts
// Before (v4.1.1)
zswapChainState.postBlockUpdate(blockTime);

// After (v5.0.0)
zswapChainState.postBlockUpdate(blockTime, retentionDuration);
```

---

## Step 17 — Custom `PublicDataProvider` implementations

Skip this step if you use `indexerPublicDataProvider`.

**Add four required members:**

| Member | What it returns |
|---|---|
| `queryBlock(config?)` | `BlockInfo \| null` = `{ hash, height, protocolVersion }`. `protocolVersion` must be that block's, not the latest. Used to pin each call transaction to a block. |
| `queryLatestProtocolVersion()` | `number`, the network's current protocol version. The framework reads it to learn the network's era. Do not cache it forever: it changes at the fork. |
| `queryContractEvents(filter, page?)` | `ContractEvent[]` |
| `contractEventsObservable(filter, options?)` | `Observable<ContractEvent>` |

**Change the return types** as described in
[Step 9](#step-9--decode-on-chain-state-yourself),
[Step 10](#step-10--read-recordvalue-from-the-state-and-balance-streams) and
[Step 11](#step-11--narrow-finalized-records-on-era).

- Build each state with `SerializedContractState.fromBytes(era, bytes)`,
  `SerializedLedgerParameters.fromBytes(era, bytes)` or
  `SerializedZswapChainState.fromBytes(era, bytes)`. Take the era from the bytes' own tag
  with `ledgerVersionOfContractState` / `ledgerVersionOfLedgerParameters` from
  `@midnight-ntwrk/midnight-js-utils`. A zswap chain state has the same tag in both eras: give
  it the era of the ledger parameters from the same block.
- Build each `tx` with `LedgerTransaction.fromBytes(era, 'Finalized', bytes)`.
- Every `watchFor*` method takes an optional `options?: WatchOptions` and should honour
  `maxWaitMs` (throw `WatchTimeoutError` when it runs out).
- Contract-state reads must refuse a `protocolVersion` they cannot place on an era.

---

## Step 18 — testkit-js users

- testkit-js uses `@midnightntwrk/wallet-sdk` 2.0.0-rc.3 (was `@midnight-ntwrk/wallet-sdk`
  1.1.0). If you build wallets yourself, follow the wallet SDK 2.0 changes. For example,
  `createKeystore` now takes `{ kind, secret }` and the network id:
  `createKeystore({ kind: 'schnorr', secret: seed }, networkId)`.
- `NodeClient` takes the network id: `new NodeClient(nodeURL, logger, networkId)`. An empty id
  is refused.
- Remove `setNetworkId` from your tests. `initializeMidnightProviders` sets `config` for you
  (`ttlSeconds: 3600`).
- If you pin Docker images, use the versions in [Step 0](#step-0--check-the-prerequisites).

---

## Step 19 — Optional: adopt the new features

None of these is required. Details are in [new-features.md](./new-features.md).

- **Contract events.** `publicDataProvider.queryContractEvents(...)`,
  `contractEventsObservable(...)` and `getAllContractEvents(provider, filter)` from
  `@midnight-ntwrk/midnight-js-indexer-public-data-provider`. Only ledger 9 contracts emit
  events.
- **Log events on call results.** `result.public.logEvents` on ledger 9 calls; decode with
  `Ledger9ContractLog.decodeAll(result.public.logEvents)`.
- **Cross-contract calls** (ledger 9 contracts only). Prove with a `ZKConfigRegistry`, for
  example `await nodeZkConfigRegistry(artifactRoot)` (it returns a `Promise<ZKConfigRegistry>`),
  passed as `zkConfigProvider` to `httpClientProofProvider`, or as the second argument of
  `await dappConnectorProofProvider(api, registry, costModel)`. For calls whose callee is known
  only at run time, add `contractModuleProvider` to your providers, for example
  `bundledContractModuleProvider(new Map([[calleeAddress, () => import('./managed/callee/contract/index.js')]]))`
  from the new package `@midnight-ntwrk/midnight-js-bundled-contract-module-provider`.
- **Object-options factories.** `httpClientProofProvider({ url, zkConfigProvider })`,
  `nodeZkConfigProvider({ directory, ...integrity })`,
  `fetchZkConfigProvider({ baseURL, fetchFunc, ...integrity })` and
  `indexerPublicDataProvider({ queryURL, subscriptionURL })`. The positional forms still work.
  Only the positional `httpClientProofProvider` and `indexerPublicDataProvider` are deprecated. The indexer provider now has `dispose()`.
- **Predefined networks.** `networks.preview()`, `networks.preprod(blockfrostProjectId)` and
  `networks.mainnet(blockfrostProjectId)` from `@midnight-ntwrk/midnight-js-utils` return
  `{ networkId, indexer: { queryURL, subscriptionURL }, nodeURL, nodeWsURL }`.
  `dappConnectorNetwork(api)` reads the same shape from a connected wallet.

  ```ts
  const net = networks.preview();
  const publicDataProvider = indexerPublicDataProvider(net.indexer);
  const config = { networkId: net.networkId, ttlSeconds: 3600 };
  ```

- **Wallet providers from the DApp Connector.** `await dappConnectorWalletProviders(connectedAPI)`
  returns `{ walletProvider, midnightProvider }`, serving both eras. The function is async.
- **Start-up check.** `createMidnightProviders(providers)` from
  `@midnight-ntwrk/midnight-js-utils` throws `ConfigurationError` for a missing provider and
  checks `config`. It returns the same set.
- **Bounded waits.** `watchForTxData`, `watchForDeployTxData`, `watchForContractState` and
  `watchForUnshieldedBalances` take `{ maxWaitMs }`. When time runs out they throw
  `WatchTimeoutError`. The transaction may still land later, so check before you retry.

---

## Operating across the ledger fork

This chapter is about timing and operations. Read it whatever artifacts you chose in
[Step 2](#step-2--choose-the-artifacts-for-each-contract).

### Ship before the fork

Release this upgrade to your users **before** the fork, with time to spare. A build still on
4.1.1 when the fork lands cannot read the network afterwards, and cannot call the contracts
it deployed before.

### Contracts deployed before the fork

Keep finding and calling them through their ledger 8 artifacts, on both sides of the fork.
Recompiled artifacts do not fit them: their verifier keys differ, so `findDeployedContract`
refuses with `ContractTypeError` ([Step 2](#step-2--choose-the-artifacts-for-each-contract)).

At the fork, the network translates every contract's state to ledger 9, and indexer
4.4.0-rc.6 or later serves it that way. The ledger 8 contract keeps working on it: after the
fork, its calls are recorded as ledger 9 transactions
([What a ledger 8 call returns](#what-a-ledger-8-call-returns)).

### Contracts deployed after the fork (ledger 9 contracts)

These use the recompiled artifacts and need no further code change. Two limits apply before
the fork:

- A ledger 9 contract cannot be deployed or called while the network is still on ledger 8.
  The framework refuses it before proving, with `EraMismatchError` (reason
  `'ledger9-artifact-on-ledger8-network'`).
- Contract-scoped transactions (`withContractScopedTransaction`) are refused
  ([Step 13](#step-13--fix-deploy-options-and-scoped-transactions)).

So a dApp that runs on both sides of the fork and deploys contracts ships **both** builds of
those contracts: the ledger 8 instance for deploys before the fork, and the recompiled one
for deploys after it.

### If you keep ledger 8 contracts

| Action | Before the fork | After the fork |
|---|---|---|
| Deploy | works | refused: `EraMismatchError`, reason `'ledger8-deploy-on-ledger9-network'` |
| Call | works | works |
| Maintenance (verifier keys, authority) | works | refused: `EraMismatchError`, reason `'ledger8-maintenance-on-ledger9-network'` |
| Inside `withContractScopedTransaction` | refused | refused |

After the fork, to deploy or maintain, recompile with compactc 0.36.0 and call the same
function with the new artifact. The stored signing key still authorizes: the fork keeps the
contract's maintenance authority. Keep the same private-state store when you switch
artifacts, because the key is stored there and nowhere else.

### Providers that serve both eras

To work on both sides of the fork, all three transaction providers must list both eras in
`supportedEras`.

- `httpClientProofProvider` and `dappConnectorProofProvider` serve `v8` and `v9`.
- `dappConnectorWalletProviders` serves `v8` and `v9`.
- `createLedger9ProofProvider`, `createLedger9WalletProvider` and
  `createLedger9MidnightProvider` serve **`v9` only**.

For your own providers, write one handler per era with `createProofProviderFromHandlers`,
`createWalletProviderFromHandlers` or `createMidnightProviderFromHandlers` from
`@midnight-ntwrk/midnight-js-types`. Each handler receives the handle of its era. Set an era
you do not serve to `undefined`. The factory works out `supportedEras` for you. The
smallest form, where `proveOnLedger8` and `proveOnLedger9` stand for your own code that
proves the bytes:

```ts
import { types } from '@midnight-ntwrk/midnight-js';

declare const proveOnLedger8: (unproven: Uint8Array) => Promise<Uint8Array>;
declare const proveOnLedger9: (unproven: Uint8Array) => Promise<Uint8Array>;

const buildProofProvider = (): types.ProofProvider =>
  types.createProofProviderFromHandlers({
    v8: (tx) => proveOnLedger8(tx.serialize()),
    v9: (tx) => proveOnLedger9(tx.serialize())
  });
```

A fuller example, proving in-process and balancing with a wallet:

```ts
import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import { proveLedger8Transaction } from '@midnight-ntwrk/midnight-js-protocol/prove';
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { createProofProviderFromHandlers, createWalletProviderFromHandlers } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = createProofProviderFromHandlers({
  v8: async (tx) =>
    proveLedger8Transaction(tx.deserialize({ v8: (await loadLedger8Protocol()).Transaction }), ledger8ProvingProvider),
  v9: (tx) => tx.deserialize({ v9: Transaction }).prove(provingProvider, CostModel.initialCostModel())
});

const walletProvider = createWalletProviderFromHandlers({
  v8: (tx, ttl) => wallet.balanceTransaction(tx.serialize(), ttl),
  v9: (tx, ttl) => wallet.balanceTransaction(tx.serialize(), ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
```

`ledger8ProvingProvider`, `provingProvider` and `wallet` stand for your own objects. For a
proof provider built from proving providers, `createProofProviderFromProvingProviders({ v8, v9 })`
does the same in one call.

A handler that talks to another ledger copy (wallet SDK, browser wallet) passes
`tx.serialize()` and may return the bytes it gets back. To decode a v8 handle yourself, use
the framework's class: `(await loadLedger8Protocol()).Transaction`.

### Track finalization, not submit success

A transaction built for ledger 8 and still in flight when the fork applies is **rejected**.
A successful submit does not prove that anything landed. Around the fork, treat a
transaction as done only when you see it finalized.

### When the fork happens during an operation

If an operation starts on one era and the fork applies before it lands, the framework throws
`ForkCrossedDuringOperationError` (code `MIDNIGHT_JS_C_FORK_CROSSED_DURING_OPERATION`) for a
call, a verifier key insert or remove, and `submitTx`. It carries:

- `kind`: `'call'`, `'maintenance'` or `'transaction'` (from `submitTx`). Branch on this.
  The type also lists `'deploy'`, but a ledger 8 deploy reports the fork inside
  `Ledger8UnconfirmedError` (below), and a ledger 9 deploy cannot start before the fork.
- `startEra` and `freshEra`: the era when the operation started, and the era now.
- `circuitId`: the circuit that ran. It may be `undefined` for `kind: 'transaction'`.
- `contractAddress`: the contract. It is always `undefined` for `kind: 'transaction'`,
  because `submitTx` does not know the contract.

The message also contains the remediation. If the framework cannot tell whether the fork
caused the rejection, it throws `SubmitRejectionUndiagnosedError` instead. That happens when
it cannot re-read the network's ledger version, or when the fresh reading shows an earlier
era than the one the operation started on.

A ledger 8 **deploy** and a ledger 8 **authority replacement** do not throw
`ForkCrossedDuringOperationError` to you. Both carry a signing key, so when the transaction
may have landed they throw `Ledger8UnconfirmedError` (code `MIDNIGHT_JS_C_LEDGER8_UNCONFIRMED`)
instead, with the fork error (or `SubmitRejectionUndiagnosedError`) on `cause`. It carries
`operation` (`'deploy'` or `'replace-authority'`), `contractAddress` and `signingKey`. The
signing key is not stored, and this error may hold the only copy. Keep `error.signingKey`.

- `'deploy'`: **do not deploy again** before you check `error.contractAddress` on chain. A
  new attempt lands at a **different** address, so a blind re-run can leave two copies on
  chain. If the contract is there, store the key with
  `privateStateProvider.setSigningKey(error.contractAddress, error.signingKey)`. If it is not
  there and the network has crossed the fork, recompile with compactc 0.36.0 and deploy that
  artifact; a ledger 8 contract cannot be deployed after the fork.
- `'replace-authority'`: find out which key the contract's authority holds. Try a
  maintenance update with the key you still have stored. If it is refused with
  `MaintenanceAuthorityMismatchError`, the replacement landed: store the new key with
  `privateStateProvider.setSigningKey(error.contractAddress, error.signingKey)`.

For `ForkCrossedDuringOperationError`, the remediation always has two parts, in this order.

**First, confirm the transaction did not finalize.** The error carries no transaction id.

- for a call: read the contract state with `queryContractState(error.contractAddress)` and
  check whether the effect of the call to `error.circuitId` is already there;
- for maintenance: read the contract state and check whether the verifier key for
  `error.circuitId` already shows the update;
- for a transaction: you built it, so you still hold its handle `tx`. A handle has no
  `identifiers()`; decode it first:
  `tx.deserialize({ v8: (await loadLedger8Protocol()).Transaction, v9: Transaction }).identifiers()`
  (`loadLedger8Protocol` from `@midnight-ntwrk/midnight-js-protocol`, `Transaction` from
  `@midnight-ntwrk/midnight-js-protocol/v9`). Look one of the ids up with `publicDataProvider.watchForTxData(id, { maxWaitMs })`, or
  check whether its effects are already on chain.

**Then, act by `kind`:**

| `kind` | What to do |
|---|---|
| `'call'` | Run the same call again, unchanged. |
| `'maintenance'` | Recompile with compactc 0.36.0 and run the same maintenance function with it. |
| `'transaction'` | Build the transaction again for the new era and submit it. |

> **Why the check comes first.** If a rejected transaction can still finalize, a blind re-run
> executes twice, and moves funds twice. Checking first makes the re-run safe either way.

### Factories that deploy contracts at run time

If your dApp deploys a new contract per user, market or game, get compactc 0.36.0 artifacts
for every such contract and ship them **before** the fork. From the fork on, a ledger 8
contract cannot be deployed.

A ledger 8 deploy registers a maintenance authority of one key: `options.signingKey`, or a
freshly made one. The key is reported at `deployTxData.private.signingKey` and stored for
the new address through `privateStateProvider.setSigningKey`. If you lose that store, no
verifier key on that contract can ever be changed.

### What a ledger 8 call returns

Ledger 8 types are flat `Ledger8*` names in `@midnight-ntwrk/midnight-js-contracts`, for
example `Ledger8FinalizedCallTxData` and `Ledger8Contract`. Results have the same
`{ public, private }` shape in both eras, so `private.result`, `public.txId` and
`public.status` read the same. The differences:

- **Every result names its era.** `result.era` is `'v8'` or `'v9'`. Narrow with
  `isLedger8Result(result)`. To accept both, type a parameter as `AnyFinalizedCallTxData` or
  `AnySubmittedCallTx`.
- **`result.era` is not `result.public.era`.** `result.era` is the ledger your contract was
  compiled for; `result.public.era` is the ledger the network used when it recorded the
  transaction. After the fork, a ledger 8 call gives `era: 'v8'` with `public.era: 'v9'`. That is correct. Narrow on
  `public.era` before you touch `public.tx`.
- **`public.nextContractState` differs by era.** For ledger 8 it is a live onchain-runtime-v3
  object. Both eras also give `public.nextContractStateEncoded`, a plain encoded value that is
  safe to store, clone or post to a worker. Use that one.
- **No `logEvents`** on ledger 8 results.
- **`private.unprovenTx` can be either era.** It is a `v8` handle before the fork and a `v9`
  handle after. Read `unprovenTx.era` before you decode it.
- `deployTxData` has `{ era, public, private }` in both eras.
  `deployTxData.public.initialContractState` of a ledger 8 deploy is a
  `SerializedContractState` with `era: 'v8'`.

**Signing keys.** Ledger 8 signs with `schnorr` only. An `ecdsa` key, or a value that is not
exactly 64 hex characters, is refused with `Ledger8SigningKeyError` (reason `'unusable'`)
before anything is built or stored.

**Paying a shielded coin to someone else.** A ledger 8 circuit that pays a shielded coin to
a recipient other than your wallet or the burn address needs that recipient's encryption
public key. Pass it in
`additionalCoinEncPublicKeyMappings` on the `submitCallTx` or `submitCallTxAsync` options.
Without it the call is refused with `Ledger8CallUnsupportedError` (reason
`'unmappable-recipient'`) before proving. The `callTx.<circuit>(...)` method on a deployed or
found ledger 8 contract cannot carry mappings; call `submitCallTx` directly for these
circuits.

A ledger 8 **deploy** takes no recipient mappings. So a ledger 8 constructor that pays a
shielded coin to a recipient other than your wallet or the burn address is refused with
`Ledger8CallUnsupportedError` (reason `'unmappable-recipient'`, `circuitId` `'initialState'`).

**Spending a shielded coin the contract holds.** A ledger 8 call that spends a shielded coin
the contract already holds on chain is refused with `Ledger8CallUnsupportedError` (reason
`'shielded-spend'`) before proving. A coin that the same call creates is fine. Only a ledger 9
contract can spend a coin it held before the call.

### Failures and maintenance in either era

- A transaction recorded with a failed status throws `TxFailedError` in both eras
  ([Step 14](#step-14--update-error-handling)).
- **Keep `error.signingKey` after a failed deploy or authority replacement.** It may be the
  only copy of the contract's maintenance authority. It is not enumerable, so a logger that
  prints the error's fields leaves it out.
- Before a ledger 8 maintenance update, the framework reads the stored key. A missing or
  unreadable key throws `Ledger8SigningKeyError` (reason `'unavailable'`). A key that is not
  the contract's authority throws `MaintenanceAuthorityMismatchError` (import it from
  `@midnight-ntwrk/midnight-js-protocol/errors`). Both happen before
  proving.
- An authority replacement whose outcome cannot be confirmed (for example, rejected while the
  network crossed the fork) throws `Ledger8UnconfirmedError` (`operation: 'replace-authority'`).
  It carries the new key, which was **not** stored. Keep it. Store it with
  `setSigningKey(address, key)` once an update with the old key is refused with
  `MaintenanceAuthorityMismatchError`.

### Dependencies of a ledger 8 contract

The contract module that compactc 0.31 generates imports `@midnight-ntwrk/compact-runtime`
and checks that the version is exactly 0.16.0. The framework itself uses 0.21.0. So a dApp
that ships a ledger 8 contract needs **both** versions resolvable in one install.

There is no official recipe for this yet. The framework's own fork test does it like this:

- It installs with an **isolated** linker (one that gives each package its own dependencies,
  such as pnpm's default). A hoisted linker keeps only one copy of `compact-runtime` and
  cannot do this.
- It wraps the ledger 8 contract in its own package that depends on
  `@midnight-ntwrk/compact-runtime@0.16.0`. The package also has a `./runtime` entry that
  re-exports that runtime (`export * from '@midnight-ntwrk/compact-runtime';`), so the dApp
  uses the exact copy the contract module imports.
- It pins `@midnight-ntwrk/onchain-runtime-v3` to 3.1.2 (the version the framework is tested
  with), so that compact-runtime 0.16.0 and the framework share one copy.
- It aliases `@midnight-ntwrk/ledger-v8` to the framework's copy:
  `"@midnight-ntwrk/ledger-v8": "npm:@midnightntwrk/ledger-v8@8.1.3"`.

You do not need to add the ledger 8 ledger package for the framework itself; it carries what
it needs. Add `@midnightntwrk/ledger-v8` yourself only if your own code works with v8
ledger objects.

### Reading the state of a ledger 8 contract

A ledger 8 contract's `ledger()` function only reads objects made by the exact runtime copy
its module imports: it checks with `instanceof`. Take that runtime from the package that wraps
the contract (its `./runtime` entry, see above), not from a separate install. Before the fork
the contract's state is `v8`, which that runtime reads. After the fork its state is `v9`,
which it cannot read: decode the bytes with your 0.21 runtime and pass the value across as
plain encoded data. The framework's fork test does exactly this:

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime'; // 0.21.0
// my-ledger8-counter is your package that wraps the contract compiled with compactc 0.31
import * as ledger8Runtime from 'my-ledger8-counter/runtime';
import { ledger } from 'my-ledger8-counter';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const stateValue = read.contractState.deserialize({
    v8: { deserialize: (bytes) => ledger8Runtime.ContractState.deserialize(bytes).data.state },
    v9: {
      deserialize: (bytes) =>
        ledger8Runtime.StateValue.decode(ContractState.deserialize(bytes).data.state.encode())
    }
  });
  const counter = ledger(stateValue);
}
```

### Bundlers

- **The ledger 8 code is loaded lazily.** The framework reaches it through a dynamic
  `import()`, so a session that never touches ledger 8 never downloads it. An aggressive
  bundler setup can inline that import into the main chunk, or preload it. Check your build
  output and make sure those chunks stay separate and are not preloaded.
- **Do not load a WASM package twice.** Two copies in one bundle, usually from a duplicate
  dependency, reject each other's objects. Remove the duplicate; do not work around it.

See also [Vite WASM resolution](../../guides/vite-wasm-resolution.md).

### A security note on retrying

If one contract keeps failing for no clear reason — calls that pass their checks and then
fail, or submissions that are always rejected — **stop retrying** and investigate. Each
retry sends a proven transaction built from indexer data. If that data is wrong or was
tampered with, retrying in a loop keeps paying fees. Back off and check the indexer.

### Check before the fork

Use proof server 9.0.0: 9.0.0-rc.7 cannot prove circuits compiled by compactc 0.36
([Step 0](#step-0--check-the-prerequisites)). There is no stated
minimum wallet version. Before the fork, confirm with your wallet provider that the version
you run serves both eras, and test your dApp against it.

---

## Verification checklist

Setup
- [ ] Node >= 22.12. ESM project: TypeScript >= 5.8 with `module: nodenext`, or `module: preserve` + `moduleResolution: bundler`. CommonJS project: TypeScript >= 5.9 with `module: node20`.
- [ ] All midnight-js packages on 5.0.0; `@midnight-ntwrk/midnight-js-network-id` removed.
- [ ] `resolutions` (or `overrides`) pin `@midnightntwrk/ledger-v9` 1.0.0, `@midnightntwrk/onchain-runtime-v4` 4.0.0 and `@midnight-ntwrk/platform-js` 3.0.0; one installed copy each of `ledger-v9`, `onchain-runtime-v4` and `platform-js`.
- [ ] `@midnight-ntwrk/compact-runtime` 0.21.0 in your dependencies.
- [ ] Indexer 4.4.0-rc.6 or later; proof server 9.0.0; a node that accepts ledger-v9 1.0.0 transactions.
- [ ] `yarn build` and `yarn lint` succeed.

Contracts and artifacts
- [ ] Contracts deployed before the fork kept as ledger 8 contracts and passed as instances; contracts deployed after the fork recompiled with **compactc 0.36.0**.
- [ ] Every artifact location serves `compiler/` next to `keys/` and `zkir/`.
- [ ] Integrity mode chosen (`'require'`, or `'require-if-present'` for compactc 0.31 artifacts).
- [ ] `FetchZkConfigProvider` gets `{ fetchFunc }`, not a bare function.
- [ ] Every custom `ZKConfigProvider` overrides `getArtifactRuntimeVersion()`.
- [ ] No import of `@midnight-ntwrk/midnight-js-protocol/ledger`, `/compact-runtime`, `/compact-js*` or `/onchain-runtime`, nor of the root `ledger`, `compactRuntime`, `compactJs`, `onchainRuntime` namespaces; `Transaction` imported from `…-protocol/v9`.

Providers
- [ ] Every provider set has `config: { networkId, ttlSeconds }`; no `setNetworkId` left.
- [ ] Every proof, wallet and midnight provider serves both eras if the dApp ships before the fork (`httpClientProofProvider`, the DApp Connector providers or `create*FromHandlers`); `createLedger9*` only for a dApp that starts after the fork; `createProofProvider` renamed to `createLedger9ProofProvider`.
- [ ] No `proveTx(tx, { timeout })` on providers that refuse it.
- [ ] Custom `PublicDataProvider`s implement `queryBlock`, `queryLatestProtocolVersion`, `queryContractEvents`, `contractEventsObservable`, and return the new shapes.
- [ ] Custom `PrivateStateProvider`s implement `forContract` and `clearAll`.

Your code
- [ ] Every transaction you pass to a provider or to `submitTx` is a handle (`LedgerTransaction.seal` or `fromBytes`).
- [ ] No `setContractAddress`; private state goes through `forContract(address)`; `clear()` became `clearAll()` where you meant every contract.
- [ ] Private states are plain data.
- [ ] Every state read is decoded with `deserialize`, using your own `ContractState`; tuple results read by name; `verifyContractState` awaited.
- [ ] Stream subscribers read `record.value`.
- [ ] Every read of `record.tx` or `deployTxData.public.tx` narrows on `era`; switches closed with `assertNever`.
- [ ] Maintenance results read as `result.public.status`.
- [ ] Generic code uses `Ledger9*` names; `ContractProviders` given a contract; `submitTx<PCK>`.
- [ ] Deploys pass `privateStateId` and `initialPrivateState` together, or neither.
- [ ] No `withContractScopedTransaction` call runs before the fork.
- [ ] `catch` blocks use `TxFailedError` + `operation`, `ProviderFailedError`, or `hasErrorCode`; no `instanceof TypeError` for `ContractTypeError`; no old `*TxFailedError` names.
- [ ] Signing keys are `{ tag, value }`; tests compare keys with `toEqual`; 4.1.1 export files re-exported or converted.

Fork readiness
- [ ] Released to users before the fork, not only merged.
- [ ] Completion measured by finalization, not by submit success.
- [ ] `ForkCrossedDuringOperationError` handled: confirm no finalization, then act by `kind`.
- [ ] Contracts deployed at run time have compactc 0.36.0 artifacts shipped.
- [ ] No pre-fork contract is found or called with recompiled artifacts.
- [ ] `error.signingKey` kept after a failed deploy or authority replacement.
- [ ] If you ship ledger 8 contracts: providers serve both eras, compact-runtime 0.16.0 is resolvable for the contract module, `@midnight-ntwrk/onchain-runtime-v3` is pinned to 3.1.2, and the bundle keeps the ledger 8 chunks lazy and has one copy of each WASM package.
- [ ] Proof server 9.0.0; wallet version confirmed for both eras.
- [ ] Passwords rotated in 4.x rotated again with `changePassword`; states and signing keys under upper-case addresses moved before the upgrade.
