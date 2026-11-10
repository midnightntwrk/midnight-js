# Release Notes v5.0.0

**Release Date:** TBD
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22.12

v5.0.0 is a major release. It moves the framework to **ledger 9** and keeps working with contracts
built for **ledger 8**, so a dApp can run on the same code before and after the ledger 8 → ledger 9
hard fork. To do this, transactions and on-chain state now travel as era-tagged values ("era" means
the ledger version, `'v8'` or `'v9'`), and you decode them with your own copy of the ledger.

The release also makes the packages ESM-only, replaces the global network id with a
`config` object on the providers, verifies ZK artifacts before use, gives every error a stable code,
and adds cross-contract calls, MIP-0002 contract events, predefined network endpoints and DApp
Connector providers.

This page is a summary. For the details:

- [Breaking changes](./breaking-changes.md): every change that can break a v4.1.1 dApp, with before and after code.
- [Migration guide](./migration-guide.md): the upgrade, step by step, and how to operate across the fork.
- [New features](./new-features.md): what is new and how to use it.
- [API changes](./api-changes.md): the full list of added, changed, renamed and removed exports.

## Requirements

| Item | v4.1.1 | v5.0.0 |
|---|---|---|
| Node.js | >=22 | **>=22.12** |
| Module format | CommonJS and ESM | **ESM only** |
| TypeScript (consumer) | any | **>=5.8** with `module: nodenext` or `preserve` + `moduleResolution: bundler`; a CommonJS project needs **>=5.9** with `module: node20` |
| Indexer | 4.3.x | **>=4.4.0-rc.6** |
| Proof server | 8.1.0 | **9.0.0** (9.0.0-rc.7 cannot prove circuits compiled by `compactc` 0.36) |
| `compactc` (ledger 9 contracts) | 0.31.0 | **0.36.0** |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | **0.21.0** |
| `@midnight-ntwrk/compact-js` | 2.5.1 | **3.0.0** |
| Ledger | `@midnight-ntwrk/ledger-v8` 8.1.0 | **`@midnightntwrk/ledger-v9` 1.0.0** (current); `@midnightntwrk/ledger-v8` 8.1.3 (pre-fork contracts, loaded on demand) |
| On-chain runtime | `@midnight-ntwrk/onchain-runtime-v3` 3.0.0 | **`@midnightntwrk/onchain-runtime-v4` 4.0.0** (v3 is kept for pre-fork contracts) |
| `@midnight-ntwrk/platform-js` | 2.2.4 | **3.0.0** |
| Wallet SDK (testkit-js) | `@midnight-ntwrk/wallet-sdk` 1.1.0 | **`@midnightntwrk/wallet-sdk` 2.0.0** |
| DApp Connector API | `@midnight-ntwrk/dapp-connector-api` 4.0.1 | **`@midnightntwrk/dapp-connector-api` 4.1.0-beta.1** |

The framework packages stay under `@midnight-ntwrk/midnight-js-*`. The ledger, on-chain runtime,
wallet SDK and DApp Connector API packages it depends on are now published under `@midnightntwrk`
(no hyphen) on the public npm registry.

## Breaking Changes

Each item links to the full description in [breaking-changes.md](./breaking-changes.md).

- **Ledger 9 is the current ledger (#970, #1599).** A contract deployed before the fork keeps its
  v4.1.1 build and runs as a ledger 8 contract, before and after the fork. Contracts deployed after
  the fork are recompiled with `compactc` 0.36.0 (runtime 0.21.0). Recompiled artifacts do not find a
  pre-fork contract: `compactc` 0.36 emits ZKIR v3 only, so the verifier keys differ, and
  `findDeployedContract` refuses with `ContractTypeError`. Artifacts of any other runtime version,
  including `compactc` 0.35 (runtime 0.20), are refused. The protocol subpaths now name their
  ledger: `/ledger` → `/v9`, `/compact-runtime` → `/v9/compact-runtime`, `/compact-js*` →
  `/v9/compact-js*`, `/onchain-runtime` → `/v9/onchain-runtime` (#1560). Import `Transaction` from
  `@midnight-ntwrk/midnight-js-protocol/v9`, not from `types` (#1562).
- **ESM-only packages (#1180).** `require()` of a `midnight-js-*` package needs Node >=22.12.
  TypeScript `node16` / `node18` module settings fail with TS1479.
- **`MidnightProviders.config` is required (#1435, #1606).** Pass `config: { networkId, ttlSeconds }`
  on the provider set. `setNetworkId()` and the `@midnight-ntwrk/midnight-js-network-id` package are
  removed; `NetworkId` is exported from `@midnight-ntwrk/midnight-js-types`.
- **ZK artifacts must ship their `compiler/` directory (#1015, #1591).** The ZK config providers
  check every artifact against `compiler/contract-manifest.json` and refuse a mismatch by default,
  and every contract operation reads the artifacts' runtime version to pick the ledger.
  `FetchZkConfigProvider` takes an options object as its second argument:
  `new FetchZkConfigProvider(url, { fetchFunc })`.
- **Transactions are `LedgerTransaction` handles (#1544, #1612, #1617).** `proveTx`, `balanceTx` and
  `submitTx` take and return `UnprovenTx` / `UnboundTx` / `FinalizedTx`. A handle holds the bytes and
  the era. Make one with `LedgerTransaction.seal(era, stage, tx)` or `fromBytes`, read one with
  `handle.deserialize({ v9: Transaction })`.
- **Providers declare `supportedEras` (#1218).** `ProofProvider`, `WalletProvider` and
  `MidnightProvider` need it. Build v9-only providers with `createLedger9ProofProvider` (was
  `createProofProvider`), `createLedger9WalletProvider` and `createLedger9MidnightProvider`.
- **Private state is reached per contract (#1609).** `provider.forContract(address)` returns the
  view with `get` / `set` / `remove` / `clear` / export / import. `setContractAddress` is removed, and
  `clearAll()` clears every contract.
- **On-chain state is bytes (#1555, #1601).** Every state read returns a `*Read` record whose states
  are `SerializedContractState`, `SerializedLedgerParameters` or `SerializedZswapChainState`. Decode
  with your own runtime: `read.contractState.deserialize({ v9: ContractState })`. Deploy results,
  call inputs and `ContractTypeError.contractState` use the same classes, and `verifyContractState`
  is now async.
- **Streams emit `PositionedRecord<T>` (#1425).** `contractStateObservable` and
  `unshieldedBalancesObservable` emit `{ value, blockHeight, blockHash }`.
- **Finalized records are era-tagged (#1562).** `watchForTxData`, `watchForDeployTxData` and
  `submitTx` return `FinalizedTxRead`; narrow on `record.era`. `FinalizedTxData` is now
  `Ledger9FinalizedTxData`.
- **Ledger-9-only names carry `Ledger9` (#1563, #1581).** For example `CallTxOptions` →
  `Ledger9CallTxOptions` in generic code, `TransactionContext` → `Ledger9TransactionContext`.
  Names without a prefix pick the era from the contract type.
- **One coded error model (#1440, #1576).** Every framework error extends `MidnightJsError` and has a
  `code` and a `category`. The five `*TxFailedError` classes are one `TxFailedError` with an
  `operation`. A rejection from the proof server, wallet or node arrives wrapped in
  `ProviderFailedError`. `ContractTypeError` is no longer a `TypeError`.
- **Custom `PublicDataProvider` implementations (#967, #988, #1218, #1397).** Four new required
  members: `queryBlock`, `queryLatestProtocolVersion`, `queryContractEvents`,
  `contractEventsObservable`.
- **Indexer >=4.4.0-rc.6 (#1507).** Contract-state reads need fields older indexers do not serve.
- **Proof server 9.0.0 and larger prover keys (#1599).** `compactc` 0.36 emits circuits in ZKIR v3
  only (ZKIR is the circuit format proofs are made from). Proof server 9.0.0-rc.7 refuses them with
  `400 Bad Request`; use 9.0.0. In the framework's own test contracts the ZKIR v3 prover keys are 1.7
  to 4.7 times the size of the ZKIR v2 ones, so expect larger artifact downloads.
- **`findDeployedContract` reports a deploy record of either era (#1416).** Narrow on
  `found.deployTxData.public.era`.
- **Maintenance functions resolve `{ era, public }` (#1517).** Read `result.public.status`.
- **`proveTxConfig.timeout` is refused (#1451, #1481)** by `createLedger9ProofProvider`,
  `createProofProviderFromProvingProviders` and `dappConnectorProofProvider`, which cannot honour it.
  `httpClientProofProvider` honours it.
- **Deploy: `privateStateId` needs `initialPrivateState` (#1325, #1433).** Passing only one no longer
  compiles, and is refused at run time.
- **Contract-state reads refuse an unknown `protocolVersion` (#1604)** with `UnknownRecordEraError`.
- **The level private-state provider refuses state that would not survive storage (#1365)** with
  `PrivateStateSerializationError`.
- **A contract-scoped transaction before the fork needs a ledger 8 context.** Type the scope
  function's parameter as `Ledger8TransactionContext`, or call `withLedger8ContractScopedTransaction`.
- **`SigningKey` is `{ tag, value }` (#970, #1414).** Keys stored by a 4.x client are still read.
- **testkit-js (#1249, #1435, #1599, #1627).** Wallet SDK 2.0.0; `NodeClient` takes the network id.

## Security

- **Duplicate keys in a ZK artifact manifest are refused (#1605).** `JSON.parse` keeps only the last
  copy of a repeated key, so a manifest pinned by `expectedManifestHash` could certify a forged file
  entry. The parser now refuses the manifest with `ZkArtifactIntegrityError`.
- **`changePassword` re-encrypts every contract (#1609).** In 4.x, when the contract set by
  `setContractAddress` had no states, it re-encrypted nothing and still reported success. If you
  rotated a password in 4.x, run `changePassword(() => oldPassword, () => newPassword)` again after
  upgrading.
- **API tokens no longer appear in indexer errors (#1570).** URL query strings are removed from the
  message and stack of a failed indexer request.
- **Faster password-cache hits in the level provider (#1448).** A cache hit no longer re-runs PBKDF2;
  it compares an HMAC fingerprint instead. Trade-off: someone who can read the process memory can
  test password guesses faster.

## New Features

See [new-features.md](./new-features.md) for examples.

- **Ledger 8 contracts and the hard fork (#1218, #1316, #1517, #1531, #1583, #1584).** The same
  functions deploy, find, call and maintain contracts of both ledgers. A contract deployed before the
  fork keeps working after it, through its ledger 8 artifacts. When the fork happens in the middle of an operation, you get
  `ForkCrossedDuringOperationError` with what to do next.
- **Cross-contract calls (#967, #1307).** Proof providers accept a `ZKConfigRegistry`
  (`nodeZkConfigRegistry`). Dynamic calls resolve the callee through the new optional
  `MidnightProviders.contractModuleProvider` and the new package
  `@midnight-ntwrk/midnight-js-bundled-contract-module-provider`.
- **MIP-0002 contract events (#988, #1083).** `queryContractEvents`, `contractEventsObservable` and
  `getAllContractEvents` on the indexer provider; `logEvents` on `Ledger9CallResultPublic`, decoded
  with `Ledger9ContractLog`.
- **Predefined network endpoints (#1570).** `networks.preview()`, `networks.preprod(projectId)`,
  `networks.mainnet(projectId)`, and `dappConnectorNetwork(api)` for a browser dApp.
- **Providers from the DApp Connector (#1522).** `await dappConnectorWalletProviders(connectedAPI)`
  resolves to `{ walletProvider, midnightProvider }`, which serve both ledgers.
- **Providers from one handler per era (#1364).** `createProofProviderFromHandlers`,
  `createWalletProviderFromHandlers`, `createMidnightProviderFromHandlers`,
  `createProofProviderFromProvingProviders`.
- **Start-up check of the provider set (#1442).** `createMidnightProviders(providers)` checks that
  every provider is present and `config` is valid.
- **Bounded waits (#1454).** The four `watchFor*` methods take `{ maxWaitMs }` and reject with
  `WatchTimeoutError` when it runs out.
- **Error codes (#1310, #1440).** `hasErrorCode`, `hasForeignErrorCode`, `isMidnightJsError`,
  `errorCategory`, `findCodedCause` and the code tables.
- **Object-options factories and a disposable indexer provider (#961, #1078).**
  `httpClientProofProvider({ url, zkConfigProvider })`, `nodeZkConfigProvider({ directory })`,
  `fetchZkConfigProvider({ baseURL })`, and `indexerPublicDataProvider({ queryURL, subscriptionURL })`
  with `dispose()`.
- **Classified deserialization errors (#955).** `DeserializationError.context` says whether the bytes
  are from another version or malformed, and how to fix it.
- **ZK artifact integrity modes (#1015, #1269).** `verify: 'require' | 'require-if-present' | 'warn' | 'off'`
  and an optional `expectedManifestHash`.
- **Compressed indexer subscriptions (#977).**
- **`createCallTxOptions` builds options for ledger 8 contracts too (#1554).**
- **testkit-js:** hard-fork fixtures under `@midnight-ntwrk/testkit-js/fixtures-hf` (#1184).

## Bug Fixes

- **http-client-proof-provider:** `proveTx(tx, { timeout })` is honoured (#1054). In 4.1.1 it was
  ignored.
- **level-private-state-provider:** concurrent operations on one store no longer fail with
  "Database failed to open", and `set` no longer races `changePassword` (#1166).
- **contracts:** `verifyContractState` and `findDeployedContract` no longer crash with a raw
  `TypeError` on an operation that has no verifier key. They throw `ContractTypeError`, which lists
  the missing, keyless and mismatched circuits (#1274).
- **contracts:** `submitInsertVerifierKeyTx` accepts an operation that is registered but has no key,
  and `submitRemoveVerifierKeyTx` refuses it before proving (#1431).
- **indexer-public-data-provider:** `queryZSwapAndContractState` reads the Zswap state and the
  ledger parameters from the queried block, not from the contract's last action (#1031).
- **indexer-public-data-provider:** the subscription no longer stalls silently on a lost or
  unreadable frame. It sends keep-alives, reconnects, and ends the stream with an error after
  repeated failures (#1360).
- **indexer-public-data-provider:** contract-state and balance streams read the per-contract action
  feed. Replays after a reconnect are dropped, `inclusive: false` survives a reconnect, `all` emits
  the full history, and `txId` works (#1428).
- **indexer-public-data-provider:** balance reads report a balance changed by a call, not the balance
  at deploy time (#1399).
- **contracts:** a ledger 9 deploy on a network still on ledger 8 is refused before proving, instead
  of failing after proving and balancing (#1613).
- **testkit-js:** health checks keep URL credentials and redact them in logs, and wait up to 10 s
  (#1421, #1485).

## Removed

- Package `@midnight-ntwrk/midnight-js-network-id` (#1606).
- `@midnight-ntwrk/testkit-js-e2e` is no longer published (#1103).
- Protocol subpaths `/ledger`, `/compact-runtime`, `/compact-js`, `/compact-js/effect`,
  `/compact-js/effect/Contract`, `/onchain-runtime`, and the root namespaces `ledger`,
  `compactRuntime`, `compactJs`, `onchainRuntime` (#1560).

The full list, with replacements, is in [breaking-changes.md](./breaking-changes.md).
