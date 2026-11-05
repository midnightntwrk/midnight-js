# midnight-js v5.0.0 Release Documentation

**Release Date:** TBD
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22.12
**Migration Complexity:** High. Every dApp must decide, for each contract, whether it runs as a
ledger 8 contract (deployed before the fork) or is recompiled (deployed after the fork), add a
`config` to its providers and move to ESM. dApps that wire their own providers,
read on-chain state or catch framework errors need more changes.

These documents describe the difference between **v4.1.1** and **v5.0.0**. If you used a 5.0.0
beta or release candidate, names that existed only in those pre-releases (for example
`unwrapLedger9`, `VersionedTransaction`) have no entry here; replace them with the final API these
documents describe.

## Quick Links

- [Release Notes](./release-notes.md): a one-page summary.
- [Breaking Changes](./breaking-changes.md): every change that can break a v4.1.1 dApp, with before and after code.
- [Migration Guide](./migration-guide.md): the upgrade step by step, and how to operate across the ledger fork.
- [New Features](./new-features.md): what is new, with examples.
- [API Changes](./api-changes.md): added, changed, renamed and removed exports, per package.

## Why this is a major release

v5.0.0 moves the framework from **ledger 8** to **ledger 9**. It is the version a dApp must run
**before** the network's ledger 8 → ledger 9 hard fork: the same code keeps working on both sides
of it. A contract deployed before the fork keeps its pre-fork (ledger 8) artifacts and can still be
found and called after it with them. Contracts deployed after the fork use artifacts recompiled
with `compactc` 0.36.0.

To serve two ledgers at once, the framework no longer hands out decoded ledger objects.
Transactions and on-chain state travel as bytes tagged with their era (`'v8'` or `'v9'`), and your
dApp decodes them with its own copy of the ledger. This removes a whole class of errors caused by
two copies of the same WASM package in one bundle.

## Breaking Changes (high level)

1. **Ledger 9 is the current ledger.** Keep your v4.1.1 build as a ledger 8 contract for contracts deployed before the fork; recompile with `compactc` 0.36.0 for contracts deployed after it. Protocol subpaths name their ledger (`/v9`, `/v9/compact-runtime`, ...).
2. **ESM-only packages.** Node >=22.12 and TypeScript >=5.8.
3. **`MidnightProviders.config` is required.** `{ networkId, ttlSeconds }` replaces `setNetworkId()`; the network-id package is removed.
4. **ZK artifacts ship their `compiler/` directory.** The integrity manifest is checked, and the runtime version picks the ledger.
5. **Transactions are `LedgerTransaction` handles** at `proveTx`, `balanceTx` and `submitTx`.
6. **Providers declare `supportedEras`.** `createProofProvider` is now `createLedger9ProofProvider`.
7. **Private state is reached per contract** with `forContract(address)`.
8. **On-chain state is bytes.** `SerializedContractState`, `SerializedLedgerParameters`, `SerializedZswapChainState`, decoded by your runtime.
9. **Streams emit `PositionedRecord<T>`.**
10. **Finalized records are era-tagged** (`FinalizedTxRead`).
11. **Ledger-9-only type names carry `Ledger9`.**
12. **One coded error model.** `MidnightJsError`, one `TxFailedError`, `ProviderFailedError`.
13. **Custom `PublicDataProvider`s** need four new members.
14. **Indexer >=4.4.0-rc.6.**

[breaking-changes.md](./breaking-changes.md) lists all of them, including the smaller ones.

## Headline Features

1. **Ledger 8 contracts and the hard fork:** one API for contracts of both ledgers, and clear errors when the fork happens during an operation.
2. **Cross-contract calls**, including dynamic calls through `contractModuleProvider`.
3. **MIP-0002 contract events** on the public data provider, and log events on call results.
4. **Predefined network endpoints** (`networks.preview()`, `networks.preprod()`, `networks.mainnet()`).
5. **DApp Connector providers:** `dappConnectorWalletProviders` and `dappConnectorNetwork`.
6. **Error codes and categories** on every framework error.
7. **Bounded waits** with `maxWaitMs` on the `watchFor*` methods.

## Requirements

| Item | Version |
|---|---|
| Node.js | >=22.12 |
| TypeScript | >=5.8 (`module: nodenext`, or `preserve` + `moduleResolution: bundler`); >=5.9 with `module: node20` for a CommonJS project |
| Indexer | >=4.4.0-rc.6 |
| Proof server | 9.0.0 (9.0.0-rc.7 cannot prove circuits compiled by `compactc` 0.36) |
| `compactc` | 0.36.0 (runtime 0.21.0) for ledger 9 contracts |
| `@midnightntwrk/ledger-v9` | 1.0.0 |
| `@midnight-ntwrk/compact-js` | 3.0.0 |

## Protocol package versions

Pin the protocol package versions given in the [migration guide](./migration-guide.md)
(`@midnightntwrk/ledger-v9` 1.0.0, `@midnightntwrk/onchain-runtime-v4` 4.0.0,
`@midnight-ntwrk/platform-js` 3.0.0) so your dApp and the framework load one copy of each.

One dependency is still a pre-release: `@midnightntwrk/dapp-connector-api` 4.1.0-beta.1 (a beta,
used by the DApp Connector providers).

---

**License:** Apache-2.0
