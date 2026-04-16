# Midnight.js — Contributor Guide

TypeScript framework for building privacy-preserving dApps on the Midnight blockchain.

| File | What it covers |
|------|---------------|
| [AGENTS.md](./AGENTS.md) | Code style, architecture patterns, testing requirements, package guidelines |
| [llms.txt](./llms.txt) | API reference, package descriptions, usage examples, provider setup |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Prerequisites, setup, Docker, debug config, Turbo commands |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution process, license header requirements |

IMPORTANT: Use GitNexus tools (impact analysis, context, query) before modifying code. See GitNexus section below.

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
types                                          ← interfaces, no internal deps
contracts, network-id, utils                   ← core logic
provider implementations (6 packages)          ← concrete providers
midnight-js                                    ← barrel re-export
testkit-js, testkit-js-e2e                     ← testing infrastructure
```

IMPORTANT: `types/` defines all provider interfaces. Changing it breaks every package downstream.

Transaction flow:

```
UnprovenTransaction → ProofProvider.proveTx() → UnboundTransaction
  → WalletProvider.balanceTx() → FinalizedTransaction
  → MidnightProvider.submitTx() → TransactionId
```

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

CI uses path filtering: midnight-js jobs run only if `packages/**` changed; testkit jobs if `packages/**` or `testkit-js/**` changed. Changes to workflows, `yarn.lock`, or root `package.json` trigger everything.

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
| `types/` interfaces | All packages break | Coordinate with Szymon/Tim — breaking change |
| `contracts/` public API | Consumer dApps break | Major version bump required |
| Provider interface shape | All implementations must update | Update all providers in same PR |
| `midnight-js` barrel exports | Consumer import paths change | Verify sub-path exports match |
| `build-tools/` config | All packages affected | `yarn clean-build` + full test run |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **midnight-js** (2156 symbols, 4991 relationships, 121 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/midnight-js/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/midnight-js/context` | Codebase overview, check index freshness |
| `gitnexus://repo/midnight-js/clusters` | All functional areas |
| `gitnexus://repo/midnight-js/processes` | All execution flows |
| `gitnexus://repo/midnight-js/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->
