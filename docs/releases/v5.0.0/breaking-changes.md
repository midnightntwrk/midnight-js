# Breaking Changes v4.1.1 → v5.0.0

This page lists every change that can break a dApp, a provider implementation or a test suite when it
moves from midnight-js v4.1.1 to v5.0.0. The main change is that ledger 9 is now the current ledger,
while contracts deployed on ledger 8 keep working across the hard fork (the network upgrade from
ledger 8 to ledger 9). Most other breaks follow from that: transactions and on-chain state now carry
their ledger era (`'v8'` or `'v9'`) with them.

For step-by-step upgrade instructions see [the migration guide](./migration-guide.md). For new APIs
see [new features](./new-features.md).

## Requirements

| Item | v4.1.1 | v5.0.0 |
|---|---|---|
| Node.js | `>=22` | `>=22.12` |
| Module format | CommonJS and ESM | ESM only |
| TypeScript (for consumers) | any | ESM project: `>=5.8` with `module: nodenext`, or `module: preserve` + `moduleResolution: bundler`. CommonJS project: `>=5.9` with `module: node20` |
| Indexer | 4.3.x | `>=4.4.0-rc.6` |
| Node (blockchain node) | 1.0.0 | a node that accepts `@midnightntwrk/ledger-v9` 1.0.0-rc.7 transactions (section 14) |
| Proof server | 8.1.0 | 9.0.0 |
| compactc (contract compiler) | 0.31.0 | 0.36.0 |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | 0.21.0 |
| `@midnight-ntwrk/compact-js` | 2.5.1 | 3.0.0-rc.6 |
| Ledger | `@midnight-ntwrk/ledger-v8` 8.1.0 | `@midnightntwrk/ledger-v9` 1.0.0-rc.7 (ledger 8.1.2 is kept for pre-fork contracts) |
| Onchain runtime | `@midnight-ntwrk/onchain-runtime-v3` 3.0.0 | `@midnightntwrk/onchain-runtime-v4` 4.0.0-rc.4 (v3 is kept for pre-fork contracts) |
| `@midnight-ntwrk/platform-js` | 2.2.4 | 3.0.0 |
| Wallet SDK (testkit-js) | `@midnight-ntwrk/wallet-sdk` 1.1.0 | `@midnightntwrk/wallet-sdk` 2.0.0-rc.2 |
| DApp Connector API | `@midnight-ntwrk/dapp-connector-api` 4.0.1 | `@midnightntwrk/dapp-connector-api` 4.1.0-beta.1 |

The framework packages keep the `@midnight-ntwrk/midnight-js-*` names. The ledger, onchain runtime,
wallet SDK and DApp Connector packages they depend on moved to the `@midnightntwrk/*` scope (no
hyphen, public npm).

## Index

1. [Ledger 9 is the current ledger](#1-ledger-9-is-the-current-ledger) — pre-fork contracts keep their ledger 8 artifacts, later ones are recompiled with compactc 0.36.0; protocol subpaths renamed.
2. [ESM-only packages](#2-esm-only-packages-node--2212-and-typescript--58) — Node >= 22.12 and TypeScript >= 5.8.
3. [`MidnightProviders.config` is required](#3-midnightprovidersconfig-is-required-the-network-id-package-is-removed) — the network-id package is removed.
4. [ZK artifacts need their `compiler/` metadata](#4-zk-artifacts-need-their-compiler-metadata) — integrity check and declared runtime version.
5. [Transactions are `LedgerTransaction` handles](#5-transactions-are-ledgertransaction-handles) — at the three provider methods and in `contracts`.
6. [Providers declare `supportedEras`](#6-providers-declare-supportederas-createproofprovider-is-renamed) — `createProofProvider` is renamed.
7. [Private state is reached per contract](#7-private-state-is-reached-per-contract) — `forContract(address)` replaces `setContractAddress`.
8. [On-chain state is returned as bytes](#8-on-chain-state-is-returned-as-bytes) — you decode it with your own runtime.
9. [State and balance streams emit `PositionedRecord`](#9-state-and-balance-streams-emit-positionedrecord) — each value carries its block.
10. [Finalized-transaction records carry their era](#10-finalized-transaction-records-carry-their-era) — `FinalizedTxData` becomes `Ledger9FinalizedTxData`; the read surface returns `FinalizedTxRead`.
11. [Ledger-9-only names carry `Ledger9`](#11-ledger-9-only-names-carry-ledger9) — kept names pick the era from the contract.
12. [New error model](#12-new-error-model) — coded `MidnightJsError`, one `TxFailedError`, wrapped provider rejections.
13. [`PublicDataProvider` implementations](#13-publicdataprovider-implementations-need-new-members) — four new required members.
14. [Indexer >= 4.4.0-rc.6](#14-indexer--440-rc6-and-a-ledger-9-network-stack) — and a ledger-9-capable network stack, with proof server 9.0.0.
15. [`findDeployedContract` deploy record](#15-finddeployedcontract-reports-the-deploy-record-of-either-era) — tagged by era.
16. [Maintenance results are `{ era, public }`](#16-maintenance-functions-return--era-public-) — read `result.public.status`.
17. [`proveTxConfig.timeout` refused](#17-provetxconfigtimeout-is-refused-by-some-proof-providers) — by some proof providers.
18. [`privateStateId` needs `initialPrivateState`](#18-deploy-privatestateid-needs-initialprivatestate) — on deploy.
19. [Unplaceable blocks are refused](#19-contract-state-reads-refuse-a-block-they-cannot-place-on-an-era) — on contract-state reads.
20. [Private state must round-trip](#20-levelprivatestateprovider-refuses-private-state-that-does-not-round-trip) — in `levelPrivateStateProvider`.
21. [Scoped transactions refused on ledger 8](#21-contract-scoped-transactions-are-refused-while-the-network-is-on-ledger-8) — before the fork.
22. [Signing keys are `{ tag, value }`](#22-signing-keys-are--tag-value-) — no longer a hex string.
23. [testkit-js](#23-testkit-js) — wallet SDK 2.0 and `NodeClient` network id.

---

## 1. Ledger 9 is the current ledger

**Who is affected:** all dApps.

**Before (v4.1.1)** — one ledger (ledger 8), re-exported from unnamed protocol subpaths:

```ts
import { Transaction } from '@midnight-ntwrk/midnight-js-types';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
```

**After (v5.0.0)** — ledger 9 is served from era-named subpaths. The ledger 8 runtime is kept inside
the framework for contracts deployed before the hard fork.

```ts
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/v9';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
```

The barrel `@midnight-ntwrk/midnight-js` adds the subpath `./protocol/v9` (`CompiledContract`,
`ContractExecutable`, type `Contract`) and the root namespace `ledger9Protocol`.

The framework maps a contract to an era by the runtime version its compiler wrote: runtime 0.16
(compactc 0.31) is ledger 8, runtime 0.21 (compactc 0.36.0) is ledger 9. Any other runtime version is
refused with `EraMismatchError`, so artifacts from compactc 0.33, 0.34 or 0.35 (runtime 0.18, 0.19
or 0.20) do not load.

Two rules decide which artifacts a contract needs:

- While the network is still on ledger 8 (before the fork), a ledger 9 contract can be neither
  deployed nor called (`EraMismatchError`, reason `'ledger9-artifact-on-ledger8-network'`).
- A contract keeps the verifier keys it was deployed with. compactc 0.36 emits ZKIR v3 only (ZKIR is
  the circuit format proofs are made from), so a recompiled circuit has a different verifier key than
  the one a pre-fork deploy (compactc 0.31, ZKIR v2) registered. `findDeployedContract` with
  recompiled artifacts refuses a pre-fork contract with `ContractTypeError`; the circuits are listed
  in `mismatchedCircuitIds`.

Two ledger 9 behaviour changes come with the new ledger package:

- The `ContractState` serialization tag moves from `[v6]` to `[v8]`. A state you serialized yourself
  under ledger 8 does not decode with the ledger 9 runtime. Re-read it from the chain instead.
- `ZswapChainState.postBlockUpdate` needs a `retentionDuration` argument.

**What to do**

1. For every contract deployed before the fork (including those you deploy before the fork with
   this release), keep the v4.1.1 build (runtime 0.16) and pass the generated contract instance
   (`new Contract(witnesses)`) instead of a `CompiledContract`. Use it before and after the fork.
2. For contracts deployed after the fork, recompile with compactc 0.36.0 and depend on
   `@midnight-ntwrk/compact-runtime@0.21.0`. Wrap the result with `CompiledContract.make(...)` as in
   4.x. A dApp that deploys contracts at run time ships both builds and switches at the fork.
3. A dApp that ships before the fork needs providers that serve both eras until the fork (section 6).
   See the [migration guide](./migration-guide.md#step-2--choose-the-artifacts-for-each-contract) for
   the full path.
4. Replace removed subpaths: `/ledger` → `/v9`, `/compact-runtime` → `/v9/compact-runtime`,
   `/compact-js` → `/v9/compact-js`, `/compact-js/effect` → `/v9/compact-js/effect`,
   `/compact-js/effect/Contract` → `/v9/compact-js/effect/Contract`,
   `/onchain-runtime` → `/v9/onchain-runtime`.
5. Replace the root namespaces `ledger`, `compactRuntime`, `compactJs` and `onchainRuntime` of
   `@midnight-ntwrk/midnight-js-protocol` with `import * as x from` the matching `/v9` subpath.
6. Import `Transaction` from `@midnight-ntwrk/midnight-js-protocol/v9`, not from
   `@midnight-ntwrk/midnight-js-types`.
7. Keep exactly one copy of each protocol package. Two copies of a WASM package break `instanceof`.
   Pin them in your root `resolutions` (Yarn) or `overrides` (npm):
   `"@midnightntwrk/ledger-v9": "1.0.0-rc.7"`, `"@midnightntwrk/onchain-runtime-v4": "4.0.0-rc.4"`
   and `"@midnight-ntwrk/platform-js": "3.0.0"`.

**Sources:** #970, #1068, #1125, #1190, #1244, #1384 (toolchain), #1081, #1341 (compact-js 3), #1249,
#1375 (ledger-v9), #1560 (issue #1536), #1562, #1581, #1599 (compactc 0.36, runtime 0.21).

---

## 2. ESM-only packages; Node >= 22.12 and TypeScript >= 5.8

**Who is affected:** all dApps; CommonJS consumers most.

**Before (v4.1.1)** — every package shipped two builds:

```jsonc
{
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" } }
}
```

**After (v5.0.0)** — one ESM build per entry:

```jsonc
{
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "engines": { "node": ">=22.12" }
}
```

Subpath names are unchanged, except the protocol subpaths in section 1 and the removed
`./network-id` subpath in section 3. Deep imports into `dist/` fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

A CommonJS project still works at run time, because Node 22.12 can `require()` an ES module without a
flag. TypeScript must also understand this. With a CommonJS consumer:

| `module` | `moduleResolution` | Result |
|---|---|---|
| `node16` | `node16` | error `TS1479` |
| `node18` | (default) | error `TS1479` |
| `node20` (TypeScript >= 5.9) | (default) | compiles |
| `nodenext` | `nodenext` | compiles |
| `preserve` | `bundler` | compiles |

**What to do**

1. Use Node.js 22.12 or newer.
2. ESM project: use TypeScript 5.8 or newer with `module: nodenext`, or `module: preserve` with
   `moduleResolution: bundler`. CommonJS project: use TypeScript 5.9 or newer with `module: node20`
   (TypeScript 5.8 has no `node20` setting). `node16` and `node18` fail with `TS1479`.
3. Replace any import from a package's `dist/` folder with a declared subpath.

**Sources:** #1180 (ADR 0005).

---

## 3. `MidnightProviders.config` is required; the network-id package is removed

**Who is affected:** all dApps.

**Before (v4.1.1)** — a global network id, and a fixed one-hour lifetime (TTL, time to live) for every
transaction the framework built:

```ts
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preview');
const providers: MidnightProviders = {
  privateStateProvider, publicDataProvider, zkConfigProvider,
  proofProvider, walletProvider, midnightProvider
};
```

**After (v5.0.0)** — the provider set carries a `config` object of type `MidnightConfig`:

```ts
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

const providers: MidnightProviders = {
  privateStateProvider, publicDataProvider, zkConfigProvider,
  proofProvider, walletProvider, midnightProvider,
  config: { networkId: 'preview', ttlSeconds: 3600 }
};
```

The framework never reads a global network id. `ttlSeconds` applies to every transaction it builds and
is passed on to `walletProvider.balanceTx` (a DApp Connector wallet uses its own lifetime). A missing
`config` throws `ConfigurationError`. An empty `networkId`, one with surrounding spaces, or a
`ttlSeconds` that is not a positive whole number throws `InvalidArgumentError`.

The package `@midnight-ntwrk/midnight-js-network-id` is removed, together with `getNetworkId`,
`setNetworkId`, the barrel's `networkId` namespace and its `./network-id` subpath. `NetworkId` (a
string) is now exported from `@midnight-ntwrk/midnight-js-types`.

The low-level builders need the config too: `createUnprovenCallTxFromInitialStates` reads
`options.config`, and `createUnprovenDeployTxFromVerifierKeys` takes `config` as a new last argument.

**What to do**

1. Delete every `setNetworkId` / `getNetworkId` call and the network-id dependency.
2. Add `config: { networkId, ttlSeconds }` to your provider set. `ttlSeconds: 3600` keeps the
   one-hour lifetime of the intents the framework builds. New: the framework now passes this TTL to
   `walletProvider.balanceTx(tx, ttl)`. In 4.1.1 it called `balanceTx(tx)` with no TTL, so the wallet
   chose its own.
3. Import `NetworkId` from `@midnight-ntwrk/midnight-js-types`.
4. Optional: build the set with `createMidnightProviders` from `@midnight-ntwrk/midnight-js-utils`
   to check it at start-up.

**Sources:** #1435 (issue #982), #1440, #1606 (issue #1546). ADR 0016.

---

## 4. ZK artifacts need their `compiler/` metadata

**Who is affected:** all dApps that load ZK artifacts; implementers of `ZKConfigProvider`; anyone who
passes a custom `fetch` to `FetchZkConfigProvider`.

**Before (v4.1.1)** — artifacts were loaded from `keys/` and `zkir/` without any check:

```ts
new NodeZkConfigProvider(directory);
new FetchZkConfigProvider(baseURL, myFetch);
```

**After (v5.0.0)** — two new checks.

1. **Integrity check, fail-closed.** Each artifact is checked against
   `compiler/contract-manifest.json`. The default mode is `'require'`: a missing manifest or a wrong
   digest throws `ZkArtifactIntegrityError`. The second constructor argument is now an options
   object (`ZkConfigIntegrityOptions`: `verify`, `expectedManifestHash`, `onWarn`). For
   `FetchZkConfigProvider` it also holds `fetchFunc`.
2. **Declared runtime version.** Every contract operation calls
   `ZKConfigProvider.getArtifactRuntimeVersion()` to decide the contract's era. The shipped providers
   read `runtime-version` from `compiler/contract-manifest.json`, or else from
   `compiler/contract-info.json`. If neither has it, the operation throws `EraMismatchError`. The base
   class throws `ArtifactRuntimeVersionUnavailableError`.

```ts
new NodeZkConfigProvider(directory, { verify: 'require-if-present' });
new FetchZkConfigProvider(baseURL, { fetchFunc: myFetch, expectedManifestHash: MANIFEST_SHA256 });

class MyZkConfigProvider extends ZKConfigProvider<string> {
  override async getArtifactRuntimeVersion(): Promise<string> {
    return '0.21.0';
  }
  // ...other methods as before
}
```

`verify` accepts `'require'` (default), `'require-if-present'`, `'warn'` and `'off'`.
`'require-if-present'` warns when the whole manifest is absent, but a manifest that exists must cover
the artifact. A wrong digest always throws, except in `'off'` mode. A manifest with duplicate keys is
refused. Only `expectedManifestHash` (the SHA-256 of the manifest, pinned at build time) protects you
against someone who can replace both the artifacts and the manifest.

**What to do**

1. Serve the whole `compiler/` directory next to `keys/` and `zkir/`. compactc 0.36.0 writes the
   manifest.
2. For contracts compiled for v4.1.1 (compactc 0.31: `contract-info.json`, no manifest), pass
   `verify: 'require-if-present'`.
3. Change `new FetchZkConfigProvider(url, fetchFn)` to
   `new FetchZkConfigProvider(url, { fetchFunc: fetchFn })`.
4. Custom providers and test doubles must implement `getArtifactRuntimeVersion()`. An object-literal
   mock without it fails with a plain `TypeError`.
5. Optional: pin `expectedManifestHash`.

**Sources:** #1015, #1269, #1605, #1591 (issue #1526). ADR 0012.

---

## 5. Transactions are `LedgerTransaction` handles

**Who is affected:** every dApp that writes its own `WalletProvider` or `MidnightProvider` (most
browser and Node dApps); implementers of `ProofProvider`; callers of `submitTx` and the
`createUnproven*Tx` functions that touch the transaction.

**Before (v4.1.1)** — ledger objects crossed the provider methods:

```ts
proveTx(unprovenTx: UnprovenTransaction, proveTxConfig?: ProveTxConfig): Promise<UnboundTransaction>;
balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
submitTx(tx: FinalizedTransaction): Promise<TransactionId>;
// contracts: SubmitTxOptions.unprovenTx and result.private.unprovenTx were UnprovenTransaction
```

**After (v5.0.0)** — a handle (a wrapper object) crosses them:

```ts
proveTx(unprovenTx: UnprovenTx, proveTxConfig?: ProveTxConfig): Promise<UnboundTx>;
balanceTx(tx: UnboundTx, ttl?: Date): Promise<FinalizedTx>;
submitTx(tx: FinalizedTx): Promise<TransactionId>;
```

`UnprovenTx`, `UnboundTx` and `FinalizedTx` are `LedgerTransaction<'Unproven' | 'Unbound' |
'Finalized'>` from `@midnight-ntwrk/midnight-js-types`. A handle holds the transaction bytes plus its
`era` (`'v8'` or `'v9'`) and `stage`. You decode it with your own copy of the ledger:

```ts
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { LedgerTransaction } from '@midnight-ntwrk/midnight-js-types';
import { submitTx } from '@midnight-ntwrk/midnight-js-contracts';

const unprovenHandle = LedgerTransaction.seal('v9', 'Unproven', unprovenTx);
const unbound = await proofProvider.proveTx(unprovenHandle);
const tx = unbound.deserialize({ v9: Transaction });

await submitTx(providers, { unprovenTx: unprovenHandle });
```

- `LedgerTransaction.seal(era, stage, tx)` wraps a ledger object from any ledger copy.
- `LedgerTransaction.fromBytes(era, stage, bytes)` wraps bytes and checks their header.
- `handle.serialize()` returns the bytes; `handle.deserialize({ v9: Transaction })` decodes them.
- Wrong input throws `UnknownLedgerEraError`, `InvalidTransactionHandleError`,
  `TransactionDecoderMissingError`, `TransactionDecodeFailedError` or `TransactionEraMismatchError`.
  A provider built with `create*FromHandlers` throws `PayloadNotATransactionError` when a handler
  answers with something that is not a transaction.

In `contracts`, `SubmitTxOptions.unprovenTx` is an `UnprovenTx`. In deploy and call results,
`private.unprovenTx` is a `LedgerTransaction<'Unproven', 'v9'>` for a ledger 9 contract.

**What to do**

1. Build v9-only wallet and midnight providers with `createLedger9WalletProvider` and
   `createLedger9MidnightProvider` (section 6). Pass `tx.serialize()` to a wallet that runs its own
   ledger copy. The wallet may answer with a ledger object of any copy or with bytes.
2. Seal transactions you build yourself with `LedgerTransaction.seal`.
3. Decode handles with your own `Transaction` class through `deserialize`.

**Sources:** #1218, #1544 (issue #1533), #1612, #1617 (issue #1551). ADR 0019, ADR 0024.

---

## 6. Providers declare `supportedEras`; `createProofProvider` is renamed

**Who is affected:** anyone who implements or hand-builds a `ProofProvider`, `WalletProvider` or
`MidnightProvider`; callers of `createProofProvider`.

**Before (v4.1.1):**

```ts
import { createProofProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';

const proofProvider = createProofProvider(provingProvider);
const walletProvider: WalletProvider = {
  balanceTx: (tx, ttl) => wallet.balanceTransaction(tx, ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
};
```

**After (v5.0.0)** — the three providers have a required `readonly supportedEras: readonly LedgerEra[]`.
The framework reads it before any operation. If the providers cannot carry the transaction from start
to end, it throws `ProviderEraUnsupportedError` before proving. The v9-only adapters set it to
`['v9']` for you:

```ts
import {
  createLedger9MidnightProvider,
  createLedger9ProofProvider,
  createLedger9WalletProvider
} from '@midnight-ntwrk/midnight-js-types';

const proofProvider = createLedger9ProofProvider(provingProvider);
const walletProvider = createLedger9WalletProvider({
  balanceTx: (tx, ttl) => wallet.balanceTransaction(tx.serialize(), ttl),
  getCoinPublicKey: () => wallet.coinPublicKey,
  getEncryptionPublicKey: () => wallet.encryptionPublicKey
});
const midnightProvider = createLedger9MidnightProvider((tx) => wallet.submitTransaction(tx.serialize()));
```

`LedgerEra` comes from `@midnight-ntwrk/midnight-js-protocol/version` or the barrel, not from
`@midnight-ntwrk/midnight-js-types`.

The `createLedger9*` adapters serve `'v9'` only, so they fit a dApp that starts after the fork. A dApp
that runs before the fork needs providers that serve `'v8'` and `'v9'`: `httpClientProofProvider`,
`dappConnectorProofProvider`, `dappConnectorWalletProviders`, or your own built with the per-era
handler factories in [new features](./new-features.md#10-providers-built-from-one-handler-per-era).

**What to do**

1. Rename `createProofProvider` to `createLedger9ProofProvider`.
2. Wrap hand-written wallet and midnight providers with the adapters above, or add `supportedEras`
   that lists exactly the eras you serve.
3. If your dApp runs before the fork, give it providers that serve both eras (see above).

**Sources:** #1218 (issue #1004), #1364, #1475, #1581 (issue #1574). ADR 0014.

---

## 7. Private state is reached per contract

**Who is affected:** dApps that read or write private state directly; `PrivateStateProvider`
implementers; `levelPrivateStateProvider` users who change passwords.

**Before (v4.1.1)** — the provider was pointed at one contract at a time:

```ts
privateStateProvider.setContractAddress(address);
await privateStateProvider.set(id, state);
const state = await privateStateProvider.get(id);
await privateStateProvider.remove(id);
await privateStateProvider.clear();
const exported = await privateStateProvider.exportPrivateStates(options);
await privateStateProvider.importPrivateStates(exported, options);
```

**After (v5.0.0)** — `forContract(address)` returns a view of one contract (`ContractPrivateStates`):

```ts
const states = privateStateProvider.forContract(address);
await states.set(id, state);
const state = await states.get(id);
await states.remove(id);
await states.clear();
const exported = await states.exportPrivateStates(options);
await states.importPrivateStates(exported, options);

await privateStateProvider.clearAll(); // every contract
```

Signing-key methods stay on the provider. `forContract` throws `InvalidArgumentError` for an invalid
address. Addresses are compared in lower case. `changePassword` needs no address and re-encrypts
every contract of the account. The framework no longer leaves the provider pointed at the last
contract it used.

**What to do**

1. Replace `setContractAddress` plus the unscoped calls with `forContract(address)`.
2. Replace `clear()` with `clearAll()` (all contracts) or `forContract(address).clear()` (one).
3. If you stored states or signing keys under an address with upper-case letters, they are not found
   after the upgrade. States: export them with 4.1.1 and import them after. Signing keys: do not
   export them (5.0 refuses a 4.1.1 key export); instead, with 4.1.1, store each one again under the
   lower-case address: `setSigningKey(address.toLowerCase(), await getSigningKey(address))`.
4. If you rotated a password in 4.x, run `changePassword(() => oldPassword, () => newPassword)` again
   after upgrading. In 4.x, when the contract set by `setContractAddress` had no states, nothing was
   re-encrypted.
5. Implementers: add `forContract` and `clearAll`; remove `setContractAddress`, `get`, `set`,
   `remove`, `clear`, `exportPrivateStates` and `importPrivateStates` from the provider.
6. Keep the `accountId` your store was created with. Another value opens an empty store.

**Sources:** #1609 (issue #812). ADR 0023.

---

## 8. On-chain state is returned as bytes

**Who is affected:** dApps that read contract state, zswap state or ledger parameters through
`PublicDataProvider`, `getPublicStates`, `getStates`, scoped transactions, deploy results,
`verifyContractState` or `ContractTypeError`; `PublicDataProvider` implementers.

**Before (v4.1.1)** — decoded ledger objects:

```ts
queryContractState(address, config?): Promise<ContractState | null>;
queryZSwapAndContractState(address, config?): Promise<[ZswapChainState, ContractState, LedgerParameters] | null>;
queryDeployContractState(address): Promise<ContractState | null>;
watchForContractState(address): Promise<ContractState>;
getPublicStates(publicDataProvider, address): Promise<PublicContractStates>;
verifyContractState(verifierKeys, contractState: ContractState): void;
```

**After (v5.0.0)** — records that hold serialized state:

```ts
queryContractState(address, config?): Promise<ContractStateAndParametersRead | null>;
queryZSwapAndContractState(address, config?): Promise<PublicStatesRead | null>; // an object, not a tuple
queryDeployContractState(address): Promise<ContractStateRead | null>;
watchForContractState(address, options?): Promise<ContractStateRead>;
getPublicStates(publicDataProvider, address): Promise<PublicStatesRead>;
verifyContractState(verifierKeys, contractState: SerializedContractState, contractAddress?): Promise<void>;
```

- `ContractStateRead` has `protocolVersion` and `contractState`. `ContractStateAndParametersRead` adds
  `ledgerParameters`. `PublicStatesRead` adds `zswapChainState`.
- Each state is one of three classes from `@midnight-ntwrk/midnight-js-types`:
  `SerializedContractState`, `SerializedLedgerParameters` or `SerializedZswapChainState`. Each holds
  the bytes and the `era` of the ledger that wrote them. You make one only with its own
  `fromBytes(era, bytes)`, and decode it with `deserialize({ v9: ... })`.
- `verifyContractState` is now async: `await` it.
- Also serialized now: the deploy result's `public.initialContractState`, the call inputs
  `initialContractState`, `initialZswapChainState` and `ledgerParameters`,
  `ContractTypeError.contractState`, and `Ledger9TransactionContext.getCurrentStates()`.
  `Ledger9ContractConstructorResult.nextContractState` stays a decoded object.

```ts
import { ContractState } from '@midnight-ntwrk/compact-runtime';

const read = await publicDataProvider.queryContractState(address);
if (read !== null) {
  const state = read.contractState.deserialize({ v9: ContractState });
  const counter = ledger(state.data);
}
```

Decoding errors: `SerializedStateDecoderMissingError` (no decoder for that era),
`SerializedStateDecodeFailedError` (the decoder threw), `InvalidSerializedStateError` (bad bytes).

**What to do**

1. Decode each state where you use it, with your own runtime.
2. Pass `read.contractState` unchanged to the low-level call builders.
3. Add `await` before `verifyContractState(...)`.
4. Read `queryZSwapAndContractState` results by name (`zswapChainState`, `contractState`,
   `ledgerParameters`) instead of by tuple index.
5. Replace `PublicContractStates` with `PublicStatesRead`.
6. Do not `structuredClone` or JSON-encode a serialized state. Send `serialize()` and `era`, and
   rebuild it with `fromBytes`.
7. Implementers: build states with `fromBytes`. Take the era from the bytes themselves
   (`ledgerVersionOfContractState`, `ledgerVersionOfLedgerParameters` in
   `@midnight-ntwrk/midnight-js-utils`).

**Sources:** #1555 (issue #1550), #1601, #1507. ADR 0020.

---

## 9. State and balance streams emit `PositionedRecord`

**Who is affected:** users and implementers of `contractStateObservable` and
`unshieldedBalancesObservable`.

**Before (v4.1.1):**

```ts
contractStateObservable(address, config): Observable<ContractState>;
unshieldedBalancesObservable(address, config): Observable<UnshieldedBalances>;
```

**After (v5.0.0)** — each value comes with the block it was read at:

```ts
contractStateObservable(address, config): Observable<PositionedRecord<ContractStateRead>>;
unshieldedBalancesObservable(address, config): Observable<PositionedRecord<UnshieldedBalances>>;
// PositionedRecord<T> = { value: T; blockHeight: number; blockHash: BlockHash }
```

**What to do**

1. Read `record.value` instead of the record itself.
2. To resume after a restart, pass `{ type: 'blockHeight', blockHeight: record.blockHeight }`.
   Values from that block may be emitted again.

Both streams now read the indexer's per-contract action feed, not every block on chain. What they
emit changed with it:

- `{ type: 'all' }` emits the contract's full history, from the first block.
- `inclusive: false` still skips the starting block, or the named transaction, after a reconnect.
- `{ type: 'txId' }` now finds the transaction on a real indexer. With `inclusive: false` it skips the
  whole transaction. A transaction with no action for the contract is refused with
  `IndexerProviderConfigError` before anything is subscribed.
- Values replayed after a reconnect are dropped, so each value is emitted once per subscription.

**Sources:** #1425 (issue #1399), #1428, #1555.

---

## 10. Finalized-transaction records carry their era

**Who is affected:** dApps that read `watchForTxData`, `watchForDeployTxData`, `submitTx` results or
the `public` part of finalized results; code that builds these records (tests, custom providers).

**Before (v4.1.1):**

```ts
interface FinalizedTxData { /* ... */ readonly tx: Transaction<SignatureEnabled, Proof, Binding> }
watchForTxData(txId): Promise<FinalizedTxData>;
submitTx<C, PCK>(providers, options): Promise<FinalizedTxData>;
```

**After (v5.0.0)** — `FinalizedTxRead` is a union of `Ledger8FinalizedTxData` and
`Ledger9FinalizedTxData`, tagged by `era`. Its `tx` is a `LedgerTransaction` of the same era.

```ts
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { assertNever } from '@midnight-ntwrk/midnight-js-utils';

const record = await publicDataProvider.watchForTxData(txId);
switch (record.era) {
  case 'v9': {
    const tx = record.tx.deserialize({ v9: Transaction });
    break;
  }
  case 'v8':
    break;
  default:
    assertNever(record, 'watchForTxData');
}
```

`watchForTxData(txId, options?)` and `watchForDeployTxData(address, options?)` return
`Promise<FinalizedTxRead>`. `submitTx<PCK>(providers, options)` returns `Promise<FinalizedTxRead>`; it
has one type parameter now, and its providers exclude `privateStateProvider`. A record whose
`protocolVersion` cannot be placed on an era throws `UnknownRecordEraError`.

**What to do**

1. Check `record.era` before you touch `record.tx`.
2. Rename `FinalizedTxData` to `Ledger9FinalizedTxData` (one era) or `FinalizedTxRead` (both).
3. Write `submitTx<PCK>(...)` instead of `submitTx<C, PCK>(...)`.

**Sources:** #1218, #1544, #1562, #1581, #1617.

---

## 11. Ledger-9-only names carry `Ledger9`

**Who is affected:** TypeScript code that names `contracts` or `types` types, or calls
`makeContractExecutableRuntime`.

**Before (v4.1.1):**

```ts
import type { CallOptions, CallResult, ContractProviders, DeployTxOptions } from '@midnight-ntwrk/midnight-js-contracts';
import { makeContractExecutableRuntime } from '@midnight-ntwrk/midnight-js-types';

type Providers = ContractProviders<MyContract, MyCircuitId, MyPrivateState>;
```

**After (v5.0.0)** — a name that only makes sense for ledger 9 has the `Ledger9` prefix (full list in
[Renamed exports](#renamed-exports)). Names kept from 4.1.1 now pick the era from the contract type
`C`: `FoundContract`, `DeployedContract`, `FinalizedCallTxData`, `SubmittedCallTx`,
`UnsubmittedCallTxData`, `FinalizedDeployTxData`, `CallResultPrivate`, `CallTxOptions`,
`CallTxOptionsBase`, `CallTxOptionsWithPrivateStateId`, `DeployContractOptions`,
`DeployContractOptionsBase`, `DeployContractOptionsWithPrivateState`, `FindDeployedContractOptions`,
`CircuitCallTxInterface`, `CircuitMaintenanceTxInterfaces`, `ContractProviders`, `SubmitTxProviders`.

```ts
import type {
  Ledger9CallOptions,
  Ledger9CallResult,
  Ledger9ContractProviders,
  Ledger9DeployTxOptions
} from '@midnight-ntwrk/midnight-js-contracts';
import { makeLedger9ContractExecutableRuntime } from '@midnight-ntwrk/midnight-js-types';

type Providers = Ledger9ContractProviders<MyContract, MyCircuitId, MyPrivateState>;
```

`ContractProviders` lost its `PS` (private state) type parameter and now needs `C`. These low-level
functions keep their 4.1.1 names and pick the era from the contract: `createUnprovenCallTx`,
`createUnprovenCallTxFromInitialStates`, `createUnprovenDeployTx`,
`createUnprovenDeployTxFromVerifierKeys`, `submitDeployTx`. `withContractScopedTransaction` also
keeps its name, but it serves ledger 9 contracts only and is refused while the network is on
ledger 8 (see section 21).

**What to do**

1. Code that uses a concrete contract type usually needs no change.
2. Rename the types in [Renamed exports](#renamed-exports).
3. Generic code (`PCK extends Contract.ProvableCircuitId<C>`) must name the era, for example
   `Ledger9FinalizedCallTxData<C, PCK>` or `Ledger9CallTxOptions<C, PCK>`.
4. Use `Ledger9ContractProviders<C, PCK, PS>` where you passed the private state type to
   `ContractProviders`.

**Sources:** #1562, #1563, #1575, #1581 (issue #1574), #1583 (issue #1524), #1593. ADR 0018, ADR 0021.

---

## 12. New error model

**Who is affected:** anyone who catches framework errors.

**Before (v4.1.1)** — `TxFailedError extends Error` with five subclasses, `ContractTypeError extends
TypeError`, many plain `Error` / `TypeError` / `RangeError` throws, and wallet / node / proof-server
rejections passed through unchanged:

```ts
try {
  await submitCallTx(providers, options);
} catch (e) {
  if (e instanceof CallTxFailedError) console.error(e.finalizedTxData.status);
}
```

**After (v5.0.0):**

- Every framework error extends `MidnightJsError` (from `@midnight-ntwrk/midnight-js-protocol`), with a
  `code` and a `category` (`USAGE`, `ENVIRONMENT`, `TRANSIENT`, `REJECTED`, `UNCERTAIN`, `INTEGRITY`,
  `INTERNAL`). General classes: `InvalidArgumentError`, `ConfigurationError`,
  `EnvironmentUnsupportedError`, `InvariantViolationError`.
- One `TxFailedError` replaces `DeployTxFailedError`, `CallTxFailedError`,
  `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError` and
  `ReplaceMaintenanceAuthorityTxFailedError`. Its `operation` is `'call'`, `'deploy'`,
  `'insert-verifier-key'`, `'remove-verifier-key'` or `'replace-authority'`. Its `record`
  (`FinalizedTxRead`) replaces `finalizedTxData`. It may have `contractAddress`, `circuitId` and a
  non-enumerable `signingKey`. The message is a sentence, not a JSON dump.
- `ProviderFailedError` wraps a rejection from `proveTx`, `balanceTx` or `submitTx` on every submit
  path. `method` names the provider method. `cause` is a plain `Error` with the original class name
  and a redacted message. Framework errors are not wrapped.
- `ContractTypeError extends MidnightJsError`, so it is no longer `instanceof TypeError`.
- Many plain throws became coded classes, for example `ContractNotFoundError`,
  `PrivateStateNotFoundError`, `PrivateStateDecryptionError`, `ProofServerError`, `StateInconsistentError` and
  `DeserializationError`.
- Around the fork, submit paths can throw `ForkCrossedDuringOperationError` or
  `SubmitRejectionUndiagnosedError` instead of passing a node rejection through.

```ts
import { ProviderFailedError, TxFailedError } from '@midnight-ntwrk/midnight-js-contracts';
import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';

try {
  await submitCallTx(providers, options);
} catch (e) {
  if (e instanceof TxFailedError) {
    console.error(e.operation, e.record.era, e.record.status);
  } else if (e instanceof ProviderFailedError && e.method === 'balanceTx') {
    console.error(e.cause);
  } else if (hasErrorCode(e, CONTRACTS_ERROR_CODES.TX_FAILED)) {
    // same check by code, safe across package copies
  }
}
```

**What to do**

1. Replace the five `*TxFailedError` checks with `TxFailedError` and `e.operation`.
2. Replace `e.finalizedTxData` with `e.record`, and check `e.record.era` before reading `tx`.
3. Remove `instanceof TypeError` checks meant for `ContractTypeError`.
4. If you matched wallet or node messages, match them on `ProviderFailedError.cause`.
5. Prefer `hasErrorCode` over `instanceof` when more than one copy of a package may be loaded.

**Sources:** #1440, #1310, #1576 (issue #1557), #1274, #1439, #955, #1584. ADR 0017.

---

## 13. `PublicDataProvider` implementations need new members

**Who is affected:** anyone who implements `PublicDataProvider`, including test doubles.

**Before (v4.1.1)** — ten members: `queryContractState`, `queryZSwapAndContractState`,
`queryDeployContractState`, `queryUnshieldedBalances`, `watchForContractState`,
`watchForUnshieldedBalances`, `watchForDeployTxData`, `watchForTxData`, `contractStateObservable`,
`unshieldedBalancesObservable`.

**After (v5.0.0)** — four more required members:

```ts
queryBlock(config?): Promise<BlockInfo | null>;           // BlockInfo = { hash, height, protocolVersion }
queryLatestProtocolVersion(): Promise<number>;            // must not cache forever
queryContractEvents(filter, page?): Promise<ContractEvent[]>;
contractEventsObservable(filter, options?): Observable<ContractEvent>;
```

Every `watchFor*` method takes an optional `options?: WatchOptions` and should honour `maxWaitMs`.
Return types change as described in sections 8, 9 and 10. Contract-state reads must refuse a block
they cannot place on an era (section 19).

**What to do**

1. Implement the four new members.
2. Return the new record types, with states built by `fromBytes`.
3. Set `BlockInfo.protocolVersion` to the version of that block, not of the latest block.

**Sources:** #967, #1397 (issue #1395), #1218, #988, #1454, #1555, #1604.

---

## 14. Indexer >= 4.4.0-rc.6 and a ledger-9 network stack

**Who is affected:** everyone who runs their own indexer, node or proof server, or pins images.

**Before (v4.1.1):** indexer 4.3.x, node 1.0.0, proof server 8.1.0.

**After (v5.0.0):** `indexerPublicDataProvider` asks for `stateAt` on every contract-state read and
for `contractZswapState` on blocks. Older indexers do not serve these fields. Indexer 4.4.0-rc.6 also
serves every contract's state in ledger 9 format after the fork.

The proof server must prove ZKIR v3 circuits, the only format compactc 0.36 emits. Proof server
9.0.0-rc.7 refuses them with `400 Bad Request`; 9.0.0 proves them. The node must accept
`@midnightntwrk/ledger-v9` 1.0.0-rc.7 transactions: node 2.1.0-rc.4 refuses every such contract call
(error 1010, custom error 104). At release, the framework's tests used proof server 9.0.0 and
pre-release builds of the node (2.1.100) and the indexer (4.4.100).

**What to do**

1. Upgrade the indexer to 4.4.0-rc.6 or newer before you upgrade the framework.
2. Use proof server 9.0.0, and a node that accepts ledger-v9 1.0.0-rc.7 transactions.

**Sources:** #1507 (issue #1452), #1031, #1045, #1375, #1599.

---

## 15. `findDeployedContract` reports the deploy record of either era

**Who is affected:** code that reads `found.deployTxData.public`.

**Before (v4.1.1)** — `public` was always the ledger 8 record, with `initialContractState:
ContractState` and `tx: Transaction`.

**After (v5.0.0)** — for a ledger 9 contract, `found.deployTxData.public` is a `FoundDeployTxPublicData`:
a ledger 8 or ledger 9 record, tagged by `era`. A ledger 8 contract, found through its ledger 8
instance (section 1), reports a `'v8'` record. Both kinds have `contractAddress` and
`initialContractState` (a `SerializedContractState`).

```ts
const { public: deploy } = found.deployTxData;
if (deploy.era === 'v9') {
  const state = deploy.initialContractState.deserialize({ v9: ContractState });
  const tx = deploy.tx.deserialize({ v9: Transaction });
}
```

**What to do**

1. Check `found.deployTxData.public.era` before you read `tx`.
2. Decode `initialContractState` according to its own `era`.

**Sources:** #1416, #1601.

---

## 16. Maintenance functions return `{ era, public }`

**Who is affected:** callers of `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`,
`submitReplaceAuthorityTx` and the maintenance interfaces.

**Before (v4.1.1)** — a flat record:

```ts
const { status } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
```

**After (v5.0.0)** — `Ledger9FinalizedMaintenanceTxData` (`{ era: 'v9'; public: Ledger9FinalizedTxData }`)
for a ledger 9 contract, `Ledger8FinalizedMaintenanceTxData` for a ledger 8 one. The union is
`FinalizedMaintenanceTxData`.

```ts
const { public: { status } } = await submitRemoveVerifierKeyTx(providers, compiledContract, address, 'increment');
```

**What to do**

1. Read `result.public.status` instead of `result.status`.

**Sources:** #1517.

---

## 17. `proveTxConfig.timeout` is refused by some proof providers

**Who is affected:** callers who pass `{ timeout }` to `proveTx` on a provider made by
`createLedger9ProofProvider`, `createProofProviderFromProvingProviders` or
`dappConnectorProofProvider`.

**Before (v4.1.1)** — `createProofProvider` and `dappConnectorProofProvider` ignored the timeout
silently:

```ts
await proofProvider.proveTx(tx, { timeout: 60_000 });
```

**After (v5.0.0)** — these providers throw `InvalidArgumentError`. `httpClientProofProvider` now
honours the timeout.

**What to do**

1. Drop the `timeout` option when you use one of those providers.

**Sources:** #1451, #1481.

---

## 18. Deploy: `privateStateId` needs `initialPrivateState`

**Who is affected:** `deployContract` and `submitDeployTx` callers that pass `privateStateId` alone.

**Before (v4.1.1)** — this compiled and stored `undefined` as the private state:

```ts
await deployContract(providers, { compiledContract, privateStateId: 'myState' });
```

**After (v5.0.0)** — it does not compile. At run time, half a pair throws
`IncompleteDeployContractPrivateStateConfig`.

```ts
await deployContract(providers, { compiledContract, privateStateId: 'myState', initialPrivateState });
```

**What to do**

1. Pass both `privateStateId` and `initialPrivateState`, or neither.

**Sources:** #1325 (issue #1321), #1433.

---

## 19. Contract-state reads refuse a block they cannot place on an era

**Who is affected:** dApps reading contract state on a network newer than the framework, or reading
history written under node 0.x.

**Before (v4.1.1):** reads succeeded whatever the block's `protocolVersion` was.

**After (v5.0.0):** `queryContractState`, `queryZSwapAndContractState`, `queryDeployContractState` and
`watchForContractState` reject, and `contractStateObservable` ends, with `UnknownRecordEraError`. A
malformed `protocolVersion` throws `IndexerDataError`.

**What to do**

1. Upgrade midnight-js when the network moves to a newer ledger.

**Sources:** #1604 (issue #1396).

---

## 20. `levelPrivateStateProvider` refuses private state that does not round-trip

**Who is affected:** dApps that store functions, class instances, `ArrayBuffer`, `Error` objects or
other values that do not survive storage.

**Before (v4.1.1):** the value was stored and came back as something else.

**After (v5.0.0):** `set` throws `PrivateStateSerializationError`.

**What to do**

1. Store plain data only.

**Sources:** #1365.

---

## 21. Contract-scoped transactions are refused while the network is on ledger 8

**Who is affected:** dApps that use `withContractScopedTransaction` before the fork.

**Before (v4.1.1):** calls inside the scope were batched into one transaction.

**After (v5.0.0):** on a ledger 8 network, `withContractScopedTransaction` throws `EraMismatchError`.
A ledger 8 contract called inside a scope is also refused.

**What to do**

1. Before the fork, submit each call with `submitCallTx`.

**Sources:** #1218, #1576, #1581.

---

## 22. Signing keys are `{ tag, value }`

**Who is affected:** code that passes, stores, compares, imports or exports signing keys.

**Before (v4.1.1):**

```ts
const options: ContractExecutableRuntimeOptions = { /* ... */ signingKey: keyHex };
```

**After (v5.0.0)** — `SigningKey` is `{ tag: 'schnorr' | 'ecdsa'; value: string }`, where `value` is
exactly 64 hex characters:

```ts
const options: Ledger9ContractExecutableRuntimeOptions = { /* ... */ signingKey: { tag: 'schnorr', value: keyHex } };
```

`isValidSigningKey` (in `@midnight-ntwrk/midnight-js-utils`) is a type guard for this shape.
`importSigningKeys` checks the shape before it writes, so a 4.x export with bare hex strings fails
with `InvalidExportFormatError`. Keys already stored by 4.x in a level store are read as
`{ tag: 'schnorr', value }` automatically. A stored entry of neither shape throws
`StoredSigningKeyFormatError`.

**What to do**

1. Pass `signingKey: { tag: 'schnorr', value: keyHex }` in runtime, deploy and find options.
2. Compare keys by value (`toEqual`), not by reference.
3. Re-export 4.x signing-key export files with a 5.0 client, or convert them to the new shape before
   import.

**Sources:** #970, #999, #1414.

---

## 23. testkit-js

**Who is affected:** users of `@midnight-ntwrk/testkit-js`.

**Before (v4.1.1):** `@midnight-ntwrk/wallet-sdk` 1.1.0; `new NodeClient(nodeURL, logger)`; tests
called `setNetworkId`.

**After (v5.0.0):** `@midnightntwrk/wallet-sdk` 2.0.0-rc.2, with structured signatures.
`NodeClient` takes the network id as a third argument and rejects an empty one.
`initializeMidnightProviders` sets `config` (with `ttlSeconds: 3600`).

```ts
const nodeClient = new NodeClient(nodeURL, logger, networkId);
```

**What to do**

1. Follow the wallet SDK 2.0 changes in your own wallet code.
2. Pass the network id to `NodeClient`.
3. Remove `setNetworkId` calls from your tests (section 3).

**Sources:** #970, #1249, #1337, #1375, #1435, #1599.

---

## Removed packages, subpaths and exports

**Packages**

| Removed | Replacement |
|---|---|
| `@midnight-ntwrk/midnight-js-network-id` (`NetworkId`, `getNetworkId`, `setNetworkId`) | `NetworkId` from `@midnight-ntwrk/midnight-js-types`; the network id is `MidnightProviders.config.networkId` (section 3) |
| `@midnight-ntwrk/testkit-js-e2e` (no longer published) | none (internal test suite) |

**Subpaths**

| Removed | Replacement |
|---|---|
| `@midnight-ntwrk/midnight-js/network-id` | none (section 3) |
| `@midnight-ntwrk/midnight-js-protocol/ledger` | `@midnight-ntwrk/midnight-js-protocol/v9` |
| `@midnight-ntwrk/midnight-js-protocol/compact-runtime` | `@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime` |
| `@midnight-ntwrk/midnight-js-protocol/compact-js` | `@midnight-ntwrk/midnight-js-protocol/v9/compact-js` |
| `@midnight-ntwrk/midnight-js-protocol/compact-js/effect` | `@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect` |
| `@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract` | `@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract` |
| `@midnight-ntwrk/midnight-js-protocol/onchain-runtime` | `@midnight-ntwrk/midnight-js-protocol/v9/onchain-runtime` |

**Exports**

| Package | Removed | Replacement |
|---|---|---|
| `@midnight-ntwrk/midnight-js` | `networkId` namespace | none |
| `@midnight-ntwrk/midnight-js-protocol` | `ledger`, `compactRuntime`, `compactJs`, `onchainRuntime` namespaces | `import * as x from` the matching `/v9` subpath |
| `@midnight-ntwrk/midnight-js-types` | `Transaction` | `@midnight-ntwrk/midnight-js-protocol/v9` |
| `@midnight-ntwrk/midnight-js-contracts` | `CallTxFailedError`, `DeployTxFailedError`, `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`, `ReplaceMaintenanceAuthorityTxFailedError` | `TxFailedError` with `operation` (section 12) |

Removed members (not exports): `PrivateStateProvider.setContractAddress`, `get`, `set`, `remove`,
`clear`, `exportPrivateStates` and `importPrivateStates` (section 7); `TxFailedError.finalizedTxData`
(section 12).

Renamed exports are listed in the next section.

## Renamed exports

The left column has only names that existed in v4.1.1.

| v4.1.1 | v5.0.0 | Package |
|---|---|---|
| `CallOptions` | `Ledger9CallOptions` | contracts |
| `CallOptionsBase` | `Ledger9CallOptionsBase` | contracts |
| `CallOptionsProviderDataDependencies` | `Ledger9CallOptionsProviderDataDependencies` (adds required `config`; states are serialized) | contracts |
| `CallOptionsWithArguments` | `Ledger9CallOptionsWithArguments` | contracts |
| `CallOptionsWithPrivateState` | `Ledger9CallOptionsWithPrivateState` | contracts |
| `CallOptionsWithProviderDataDependencies` | `Ledger9CallOptionsWithProviderDataDependencies` | contracts |
| `CallResult` | `Ledger9CallResult` | contracts |
| `CallResultPublic` | `Ledger9CallResultPublic` | contracts |
| `CircuitMaintenanceTxInterface` | `Ledger9CircuitMaintenanceTxInterface` | contracts |
| `ContractConstructorOptions` | `Ledger9ContractConstructorOptions` | contracts |
| `ContractConstructorOptionsBase` | `Ledger9ContractConstructorOptionsBase` | contracts |
| `ContractConstructorOptionsWithArguments` | `Ledger9ContractConstructorOptionsWithArguments` | contracts |
| `ContractConstructorOptionsWithPrivateState` | `Ledger9ContractConstructorOptionsWithPrivateState` | contracts |
| `ContractConstructorOptionsWithProviderDataDependencies` | `Ledger9ContractConstructorOptionsWithProviderDataDependencies` | contracts |
| `ContractConstructorResult` | `Ledger9ContractConstructorResult` | contracts |
| `ContractMaintenanceTxInterface` | `Ledger9ContractMaintenanceTxInterface` | contracts |
| `DeployTxOptions` | `Ledger9DeployTxOptions` | contracts |
| `DeployTxOptionsBase` | `Ledger9DeployTxOptionsBase` | contracts |
| `DeployTxOptionsWithPrivateState` | `Ledger9DeployTxOptionsWithPrivateState` | contracts |
| `DeployTxOptionsWithPrivateStateId` | `Ledger9DeployTxOptionsWithPrivateStateId` | contracts |
| `FinalizedDeployTxDataBase` | `Ledger9FinalizedDeployTxDataBase` | contracts |
| `FindDeployedContractOptionsBase` | `Ledger9FindDeployedContractOptionsBase` | contracts |
| `FindDeployedContractOptionsExistingPrivateState` | `Ledger9FindDeployedContractOptionsExistingPrivateState` | contracts |
| `FindDeployedContractOptionsStorePrivateState` | `Ledger9FindDeployedContractOptionsStorePrivateState` | contracts |
| `TransactionContext` | `Ledger9TransactionContext` | contracts |
| `UnprovenCallTxProvidersWithPrivateState` | `Ledger9UnprovenCallTxProvidersWithPrivateState` | contracts |
| `UnprovenDeployTxOptions` | `Ledger9UnprovenDeployTxOptions` | contracts |
| `UnprovenDeployTxProviders` | `Ledger9UnprovenDeployTxProviders` | contracts |
| `UnsubmittedDeployTxData` | `Ledger9UnsubmittedDeployTxData` | contracts |
| `UnsubmittedDeployTxDataBase` | `Ledger9UnsubmittedDeployTxDataBase` | contracts |
| `UnsubmittedDeployTxPrivateData` | `Ledger9UnsubmittedDeployTxPrivateData` | contracts |
| `UnsubmittedDeployTxPublicData` | `Ledger9UnsubmittedDeployTxPublicData` | contracts |
| `UnsubmittedTxData` | `Ledger9UnsubmittedTxData` | contracts |
| `PublicContractStates` | `PublicStatesRead` | contracts → types |
| `FinalizedTxData` | `Ledger9FinalizedTxData` (union of both eras: `FinalizedTxRead`) | types |
| `UnboundTransaction` | `Ledger9UnboundTransaction` | types |
| `ContractExecutableRuntimeOptions` | `Ledger9ContractExecutableRuntimeOptions` | types |
| `makeContractExecutableRuntime` | `makeLedger9ContractExecutableRuntime` | types |
| `createProofProvider` | `createLedger9ProofProvider` | types |

Names kept from v4.1.1 whose meaning changed (they now pick the era from the contract type) are listed
in section 11.
