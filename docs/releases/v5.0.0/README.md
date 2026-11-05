# midnight-js v5.0.0 Release Documentation

**Release Date:** TBD
**Previous Version:** v4.1.1
**Node.js Requirement:** >=22.12
**Migration Complexity:** High. Every dApp must recompile its contracts (or keep them as ledger 8
contracts), add a `config` to its providers and move to ESM. dApps that wire their own providers,
read on-chain state or catch framework errors need more changes.

These documents describe the difference between **v4.1.1** and **v5.0.0**. If you used a 5.0.0
beta or release candidate, follow the same guide: it uses the final names only.

## Quick Links

- [Release Notes](./release-notes.md): a one-page summary.
- [Breaking Changes](./breaking-changes.md): every change that can break a v4.1.1 dApp, with before and after code.
- [Migration Guide](./migration-guide.md): the upgrade step by step, and how to operate across the ledger fork.
- [New Features](./new-features.md): what is new, with examples.
- [API Changes](./api-changes.md): added, changed, renamed and removed exports, per package.

## Why this is a major release

v5.0.0 moves the framework from **ledger 8** to **ledger 9**. It is the version a dApp must run
**before** the network's ledger 8 → ledger 9 hard fork: the same code keeps working on both sides
of it. A contract deployed before the fork can still be found and called after it.

To serve two ledgers at once, the framework no longer hands out decoded ledger objects.
Transactions and on-chain state travel as bytes tagged with their era (`'v8'` or `'v9'`), and your
dApp decodes them with its own copy of the ledger. This removes a whole class of errors caused by
two copies of the same WASM package in one bundle.

## Breaking Changes (high level)

1. **Ledger 9 is the current ledger.** Recompile with `compactc` 0.35.0, or run your v4.1.1 build as a ledger 8 contract. Protocol subpaths name their ledger (`/v9`, `/v9/compact-runtime`, ...).
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
| `compactc` | 0.35.0 (runtime 0.20.0) for ledger 9 contracts |
| `@midnightntwrk/ledger-v9` | 1.0.0-rc.5 |
| `@midnight-ntwrk/compact-js` | 3.0.0-rc.3 |

## Pre-release protocol note

The ledger 9 packages this release targets are release candidates (`@midnightntwrk/ledger-v9`
1.0.0-rc.5, `@midnightntwrk/onchain-runtime-v4` 4.0.0-rc.4, `@midnight-ntwrk/compact-js`
3.0.0-rc.3). Pin the exact versions given in the [migration guide](./migration-guide.md) so your
dApp and the framework load one copy of each.

---

**License:** Apache-2.0
