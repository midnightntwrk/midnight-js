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

Rules that hold across the codebase (API details in [llms.txt](./llms.txt)):

- Transactions are handles, `LedgerTransaction<Stage>` from `types`: bytes plus
  the era (`'v8'` / `'v9'`). The caller decodes with its own ledger copy:
  `handle.deserialize({ v9: Transaction })`. See
  [ADR 0024](./docs/adr/0024-hold-transactions-as-bytes-decoded-by-the-callers-ledger.md).
- On-chain state is bytes, never a decoded object: one `Serialized*` class per
  kind, decoded by the caller's runtime. See
  [ADR 0020](./docs/adr/0020-carry-on-chain-state-as-bytes-decoded-by-the-callers-runtime.md).
- Layer rule: `protocol` speaks raw ledger objects; every package from `types`
  up speaks only handles in its public API.
- To treat eras differently, `switch` on `era` and close it with
  `assertNever(value, '<call site>')` from `utils`.
- Providers serving more than one era are built from per-era handlers
  (`create*ProviderFromHandlers`); v9-only providers use
  `createLedger9WalletProvider` / `createLedger9MidnightProvider`. Proof, wallet
  and midnight providers carry a required `supportedEras`, checked before an
  operation starts. See
  [ADR 0014](./docs/adr/0014-build-provider-seams-from-per-era-handlers.md).

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

## Code navigation

Use the editor's TypeScript language server (LSP) and ripgrep (`rg`). Packages
import each other through `dist/`, so LSP finds references only inside one package.

- Before editing a function, class or method, list its callers: LSP
  `findReferences` or `incomingCalls` inside the package and, for an exported
  symbol, `rg -w <name> packages testkit-js`. Report what is affected.
- Before committing, check that `git diff --stat` touches only the expected files.
- To rename a symbol, find every use with `rg -w <name>`, then run `yarn build`
  and `yarn test`.
