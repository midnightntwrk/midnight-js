# Midnight.js — Contributor Guide

TypeScript framework for building privacy-preserving dApps on the Midnight blockchain.

| File | What it covers |
|------|---------------|
| [AGENTS.md](./AGENTS.md) | Code style, architecture patterns, testing requirements, package guidelines |
| [llms.txt](./llms.txt) | API reference, package descriptions, usage examples, provider setup |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Prerequisites, setup, Docker, debug config, Turbo commands |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution process, license header requirements |

## Architecture

Provider pattern — 7 pluggable providers (interfaces in `packages/types/src/`):

```
MidnightProviders
├── privateStateProvider    LevelDB encrypted storage (AES-256-GCM) ← security-critical
├── publicDataProvider      GraphQL queries (Apollo Client)
├── zkConfigProvider        ZK artifact retrieval (browser or Node.js)
├── proofProvider           ZK proof generation (HTTP server or DApp Connector)
├── walletProvider          Transaction balancing & signing
├── midnightProvider        Transaction submission to network
└── loggerProvider          Optional diagnostics (Pino)
```

Directories:

```
packages/           # Core framework packages
testkit-js/         # Testing infrastructure
build-tools/        # Build configuration
```

Package layers (each layer depends on the one above):

```
protocol                                       ← ledger/runtime bindings, era resolver
types                                          ← provider interfaces (depends on protocol only)
contracts, utils                               ← core logic
provider implementations (6 packages)          ← concrete providers
midnight-js                                    ← barrel re-export
testkit-js, testkit-js-e2e                     ← testing infrastructure
```

IMPORTANT: `types/` defines all provider interfaces. Changing it breaks every package downstream.

Transaction flow:

```
UnprovenTx → ProofProvider.proveTx() → UnboundTx
  → WalletProvider.balanceTx() → FinalizedTx
  → MidnightProvider.submitTx() → TransactionId
```

Every transaction passed to those three methods is a transaction handle,
`LedgerTransaction<Stage>` from `types`. The handle holds the transaction's
bytes and carries the era (`'v8'` / `'v9'`) as data; the stage is in the type.
Make one with `LedgerTransaction.fromBytes(era, stage, bytes)` or
`LedgerTransaction.seal(era, stage, tx)` (an object of any ledger copy), and
decode it with the caller's own ledger copy:
`handle.deserialize({ v9: Transaction })`. Bytes without the header that era
writes for that stage, or a value that is not a transaction, are refused with
`InvalidTransactionHandleError`. Layer rule: `protocol` speaks
raw ledger objects; every package from `types` up speaks only handles in its
public API.

The read surface (`watchForTxData`, `watchForDeployTxData`) reports a
era-tagged *record*, `FinalizedTxRead`. Its `tx` is a `FinalizedTx`
of the same era (`record.tx.era === record.era`); narrow on `record.era` and
read it with `record.tx.deserialize({ v9: Transaction })`. To treat the eras
differently, narrow with a `switch (record.era)` closed by
`assertNever(record, '<call site>')` from `utils`.

On-chain state is bytes, never a decoded object. `watchForContractState`,
`queryDeployContractState` and `contractStateObservable` return
`ContractStateRead`; `queryContractState` returns
`ContractStateAndParametersRead` (adds `ledgerParameters`);
`queryZSwapAndContractState` returns `PublicStatesRead`, and
`Ledger9TransactionContext.getCurrentStates()` returns `PublicStatesRead | undefined`. Each state is one class per kind from `types`:
`SerializedContractState`, `SerializedLedgerParameters` or
`SerializedZswapChainState` (bytes + `era`, the ledger that wrote them), made
only by its own `fromBytes(era, bytes)`. The caller decodes it with its own runtime:
`read.contractState.deserialize({ v9: ContractState })`. Every full ledger state
on the `contracts` API is one of these classes too, in both eras, except
`Ledger9ContractConstructorResult.nextContractState`: call inputs
(pass `read.contractState` as it is), deploy and found `initialContractState`,
`verifyContractState` and `ContractTypeError.contractState`. `contracts` decodes
with the framework's copy only where it builds a transaction. See
[ADR 0020](./docs/adr/0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md).

Implementing `WalletProvider` or `MidnightProvider` for v9 only? Use
`createLedger9WalletProvider` / `createLedger9MidnightProvider` from `types` rather than
sealing by hand.

Serving more than one era? Use `createProofProviderFromHandlers` /
`createWalletProviderFromHandlers` / `createMidnightProviderFromHandlers` — one
handler per era, keyed `v8` / `v9` (`undefined` for an era you do not serve).
Each handler receives the handle of its era. A transaction answer (`proveTx`,
`balanceTx`) is a transaction object of any ledger copy or its bytes; the factory
seals it in the request's era at the method's output stage and derives
`supportedEras`. All three providers carry a required `supportedEras`, read
before an operation starts so a set that cannot carry a transaction end to end is
refused before the proof is paid for. A handler that talks to another ledger copy
(wallet-sdk, a DApp Connector wallet) passes `tx.serialize()` and can return the
bytes it gets back. See
[ADR 0024](./docs/adr/0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md)
(the transaction handle) and
[ADR 0014](./docs/adr/0014-build-provider-seams-from-per-era-handlers.md)
(providers built from per-era handlers).

## CI Pipeline & PR Gates

All CI checks block merge unless noted:

| Check | What it checks |
|-------|----------------|
| PR Title | Semantic format: `<type>(<scope>): <subject>` |
| PR Body | Must be non-empty |
| Commit Lint | All PR commits must follow conventional commit format |
| License Headers | Apache 2.0 header on `.ts`, `.js`, `.sh`, `Dockerfile*` |
| Build + Lint + Unit Tests | Turbo build, ESLint, Vitest with coverage |
| Integration Tests | Docker-based provider tests (skip: `[skip_it]` in commit message) |
| API Docs | TypeDoc generation (non-blocking) |

CI uses path filtering: midnight-js jobs run only if `packages/**` changed; testkit jobs if `packages/**` or `testkit-js/**` changed. Changes to the shared root config listed under `shared` in `.github/workflows/ci.yml` (workflows, `yarn.lock`, root `package.json`, any `turbo.json`, `build-tools/`, ...) trigger everything.

## PR Conventions

Commit format (enforced by commitlint hook + CI):

```
<type>(<scope>): <subject>
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`
- Scopes (optional): `testkit-js`, `midnight-js`, `deps`, `deps-dev`, `config`, `release`
- Subject: imperative mood, no trailing period

Branch naming: `<type>/<issue-number>-<description>` (e.g., `fix/742-per-recipient-encryption-key`)

PR title must match commit format (enforced by `pr-check.yml`).

PR description — use this structure:

```
## Summary
[What changed and why — bullet points]

## Test plan
- [ ] Tests written first (TDD), verified they fail before fix
- [ ] All existing tests pass (no regressions)
- [ ] Lint clean, build succeeds
```

GPG signing required. License header required on all new source files — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the full header.

## Common Mistakes

All derived from actual PR rejections in this repo:

1. **Unsafe `any` casts** — Use type guards instead of `(error as any)`. Blocked by review.
2. **Dead code / copy-pasted boilerplate** — Even "harmless" config from other packages gets flagged and rejected.
3. **One-directional test assertions** — `expect(subset).toContain(x)` misses leaked exports. Use strict equality: `expect(actual.sort()).toEqual(expected.sort())`.
4. **Swallowed errors** — Never `catch { log(e) }` without re-throwing. Always propagate with `{ cause: error }`.
5. **Command injection** — Never `execSync` with template literal interpolation. Use `spawnSync` with argument arrays.
6. **BigInt precision loss** — Never convert BigInt via `Number()`. Use `.toString()`.
7. **Hardcoded protocols** — Derive `https://` or `http://` from the configured URL, don't hardcode.
8. **Missing devDependencies** — Each package must declare its own build deps. Workspace hoisting alone is insufficient.
9. **Missing license headers** — CI enforces Apache 2.0 headers on `.ts`, `.js`, `.sh`, `Dockerfile*`.
10. **No-op assertions** — `expect(value)` without `.toBe()`/`.toEqual()` silently passes. Every `expect()` needs a matcher.

## Downstream Impact

| If you change... | Impact | Action |
|-----------------|--------|--------|
| `types/` interfaces | All packages break | Coordinate with Szymon — breaking change |
| `contracts/` public API | Consumer dApps break | Major version bump required |
| Provider interface shape | All implementations must update | Update all providers in same PR |
| `midnight-js` barrel exports | Consumer import paths change | Verify sub-path exports match |
| `build-tools/` config | All packages affected | `yarn clean-build` + full test run |
