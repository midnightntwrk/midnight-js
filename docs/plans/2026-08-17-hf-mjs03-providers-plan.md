# HF v8/v9 — Plan 4 of 4: MJS-03 Providers + Integration & Hardening (#1006)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Providers become version-agnostic: head query with the corroborated D16 era latch, `queryRawContractState` with the composed snapshot + adversarial tag parse, lazy dual decode, version-tagged tx-flow seams, private-state continuity — then the release-gating integration, docs and fork-crossing e2e.

**Architecture:** The latch lives inside the indexer provider (`contracts` stays stateless); `{ fresh: true }` bypasses any cache (QA-3 + mismatch re-read); the v8 tx-flow arm is tag-prefixed bytes at every external seam with the OQ15 parse as defence-in-depth.

**Tech Stack:** Apollo Client + GraphQL codegen (`src/gen`), vitest 4, docker integration env, testkit-js mocks, pnpm/PnP + Vite CI fixtures.

**Spec:** `docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (v5.2) — §4.4, §4.5, §6.3, §8 (providers slice), §10 steps 4–6, AC0/AC9.

**Ticket:** [#1006 MJS-03](https://github.com/midnightntwrk/midnight-js/issues/1006). Branch: `feat/1006-provider-dual-decode` (fresh worktree per PR).

**Prerequisites:** plan-2 D14-B merged. Tasks 4.1/4.2 ship in the **cross-plan PR** together with plan-2 Task 2.3 (interface members) and the testkit mocks — spec §4.4 same-PR rule.

## Global Constraints

- **Worktree rule:** every phase starts on a fresh `wt` worktree branched from clean `origin/main` (never off another feature branch). Branch names: `feat/1004-protocol-dual-ledger`, `feat/1006-types-d14-foundation`, `feat/1005-contracts-unified-entries`, `feat/1006-provider-dual-decode`.
- **Fresh worktree:** run `yarn && yarn build` before first push (pre-push lint needs `dist/`).
- Apache 2.0 license header on every new `.ts` file (copy from any existing `src/` file).
- Conventional commits, GPG-signed; PR title matches `<type>(<scope>): <subject>`.
- `yarn lint` clean; **no `any` casts, no `as unknown`** (NFR2 — CI-enforced from the first PR).
- TDD: test first, watch it fail, implement, watch it pass, commit. Arrange-Act-Assert. Every `expect()` has a matcher. Strict equality on export surfaces (`expect(actual.sort()).toEqual(expected.sort())`).
- Errors: never swallow; re-throw with `{ cause }`; every typed error carries a stable `code` and remediation text; cause chains sanitized before the logger seam (spec §6.2).
- Coverage: `packages/protocol` vitest thresholds are 100/100/100/100 and **coverage is always enabled** — every protocol task must keep 100% or add the glob-scoped carve-outs from Task 1.6. `packages/utils` thresholds: lines 97, functions 94, branches 93, statements 97.
- Exact versions (spec OQ2, re-confirm at implementation): v8 = `@midnightntwrk/ledger-v8@8.1.1` (implemented pin, PR #1156; `ledger-v8` is dual-published — org-ownership check on BOTH scopes per OQ2) + `@midnight-ntwrk/onchain-runtime-v3`; retained dApp stack compact `0.31.1` / compact-runtime `0.16.0` (only under `@midnight-ntwrk`); v9 = `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`.
- The spec's §6.2 privacy constraint applies to all error messages and breadcrumbs: version ints/sets and key identifiers allowed; key bytes, decoded state, raw payloads forbidden.

## Phase 4 — #1006 MJS-03: providers

Branch: `feat/1006-provider-dual-decode`. All in-repo `PublicDataProvider` implementations + testkit mocks update in the same PR as Tasks 4.1/4.2 (interface is breaking).

### Task 4.1: indexer — head query + D16 corroborated latch

**Files:**
- Modify: `packages/indexer-public-data-provider/src/provider.ts`, `src/query-definitions.ts` (new head query on the OQ3d field)
- Create: `packages/indexer-public-data-provider/src/test/head-latch.test.ts`

**Interfaces:**
- Consumes: `PublicDataProvider.queryLatestProtocolVersion(options?)` contract from Task 2.3.
- Produces: the reference latch implementation:
  ```ts
  // inside IndexerPublicDataProvider
  private v9HeadLatch: number | undefined;   // set ONLY by corroborate(); never pre-v9
  private corroborateV9(headProtocolVersion: number, route: 'snapshot-envelope' | 'finalized-record'): void;
  async queryLatestProtocolVersion(options?: { readonly fresh?: boolean }): Promise<number> {
    if (options?.fresh !== true && this.v9HeadLatch !== undefined) return this.v9HeadLatch;
    return await this.fetchHeadProtocolVersion();   // GraphQL, OQ3d field
  }
  ```
- [ ] **Step 1: Failing tests (mock Apollo handle):** GraphQL head requests go to zero only after a corroborated v9 — **one engagement test per route** (route 1: composed snapshot returns v9 head + v9-envelope state; route 2: provider decodes a finalized record with v9-era `protocolVersion`); poisoned-latch negative: a single bare v9 int pre-fork does NOT latch — next call hits the network again; `{ fresh: true }` bypass: latched provider still issues a GraphQL request; latch never downgrades (v8 after latch is ignored for latching purposes).
- [ ] **Step 2–4:** red → implement → green (integration test against the docker indexer asserts strictly against the OQ3d source field).
- [ ] **Step 5: Commit** — `feat(midnight-js): add head-version query with corroborated monotonic era latch (FR3/D16)`.

### Task 4.2: indexer — `queryRawContractState` + composed request + adversarial parse

**Files:**
- Modify: `src/provider.ts`, `src/query-definitions.ts` (composed call-path document: head field + raw state in one request — §4.4 mitigation), `src/codec.ts`
- Create: `src/test/raw-contract-state.test.ts`

- [ ] **Step 1: Failing tests:** round-trips both envelopes (Task 0.2 fixtures served as **hex** — the indexer's real wire encoding, `:` = `3a`); `version` derived via `protocolVersionToLedger(protocolVersion, 'read')` at the single construction point; adversarial matrix at this parse point (missing second `:`, unknown tag, tag/content mismatch, oversized prefix, all in hex encoding) → `TAG_PARSE_FAILED` typed error before any decode; the composed request feeds route-1 corroboration (Task 4.1 spy).
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): add raw contract-state query with composed head snapshot (FR6/§4.4)`.
- [ ] **Note (Task 0.3 discovery):** the OQ3 fail-open set is six types (see spec OQ3(c)) — the tag check cannot rely on tags discriminating era for the zswap-subsystem types; design against the full list, not `ZswapChainState` alone.

### Task 4.3: indexer — per-record dual decode + lazy `loadV8()` + union surfacing

**Files:**
- Modify: `src/mapping.ts` (both `protocolVersion:` construction sites — `toFinalizedDeployTxData`, `watchForTxData` path), `src/codec.ts`, `src/provider.ts`
- Create: `src/test/dual-decode.test.ts`

- [ ] **Step 1: Failing tests:** v9 records decode through today's static path byte-unchanged (golden against Task 3.1-era baselines); v8-tagged records decode via `loadV8()` — awaited inside the already-async query method, memoised (spy: exactly one load across N records); lazy gates: a v9-only session never triggers the v8 WASM (grep-level + spy); a decode-only session never loads the 0.16 runtimes; `VersionedFinalizedTxData` arms carry the version-truth invariant; wrong-version decode → `DECODE_VERSION_MISMATCH` wrapped `{ cause }`, cause sanitized (serialize, assert no state bytes — QA-8 fixture).
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): decode v8 history lazily and surface versioned records (FR6/NFR6)`.

### Task 4.4: tx-flow seams — proof/wallet/midnight providers + OQ15 asserts

**Files:**
- Modify: `packages/http-client-proof-provider/src/`, `packages/dapp-connector-proof-provider/src/`, `packages/types/src/proof-provider.ts` (`createProofProvider` — re-audit `CostModel.initialCostModel()` for the v8 arm, record the finding)
- Create: seam tests in each provider package

- [ ] **Step 1: Failing tests:** the v8 arm is `{ version: 'v8', txBytes }` at every seam, request and response (strict shape assertion + `parseSerializedTag` tag assert at both proving seams and submit — the OQ15 permanent mechanism); v9 arm passes through as today's live objects (non-regression); keep-state proving passes retained key triples through the configured `proofProvider` and selects V2 by key tag; proof-server HTTP failure wrap is sanitized (QA-8).
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): carry version-tagged tx payloads through proof/wallet/midnight seams (D14/OQ15)`.

### Task 4.5: private-state cross-window round-trip + testkit mocks

**Files:**
- Modify: `testkit-js/testkit-js/src/` mocks (implement the two new members; version-truth invariant assert in mock constructors — a mock whose `version` disagrees with `protocolVersionToLedger(protocolVersion)` throws `MOCK_VERSION_INVARIANT`)
- Create: `packages/level-private-state-provider/src/test/cross-window.test.ts`

- [ ] **Step 1: Failing tests:** write private state under 0.16 keep-state execution → read under 0.18 after simulated graduation via the both-keys fixture + PS-schema-identical v9 twin (Task 0.2); pass criterion = decoded **value equality** (not byte equality); pre-fork→post-fork continuity case. Mock invariant negative.
- [ ] **Step 2–4:** red → implement → green (anchored to AC3 — MJS-03 cannot close without it). **Step 5: Commit** — `test(midnight-js): assert private-state continuity across the fork window (SEC-8)`.

### Task 4.6: barrel + packaging gates

**Files:**
- Modify: `packages/midnight-js/src/` (re-export `LedgerVersion` utilities, `assertNever`, `hasErrorCode` + guards; **no** `protocol/v8` runtime re-export), `packages/midnight-js/package.json`
- Create: CI jobs — isolated-linker install smoke (pnpm default linker + yarn PnP consuming the packed tarballs, running a ledger-8 operation fixture) and the Vite laziness fixture (build a v9-only fixture app; assert the `./v8` chunk is neither preloaded nor executed)

- [ ] **Steps:** failing barrel export-surface test (strict sorted-key equality incl. the new names, excl. any v8 runtime surface) → implement → green; both CI jobs wired and red-then-green against a deliberate break; commit `feat(midnight-js): re-export version utilities from barrel + packaging gates (AC6)`.

---

## Phase 5 — Integration, hardening, docs (release-gating; tracked on #1004/#1005/#1006 checklists)

### Task 5.1: split-topology integration milestone (§10 step 5)
- [ ] Port the spike to the productized topology: packed framework tarballs + a dApp persona with its retained 0.16 stack, calling the unified entries; keep-state proving e2e runs serialized against its proof server (spike-documented contention). Closes the OQ13 split-topology item.

### Task 5.2: migration guide + docs (AC9)
- [ ] Guide chapters: bump-only window chapter (D14 narrowing stated **up front**), narrowing recipe (`assertNever` + `hasErrorCode` guards), retained-toolchain note (A2), bundler section (`./v8` chunk + dual-instantiation), runtime-deploy chapter (linked from `Ledger8DeployOnV9Error`), operator requirements (OQ12/OQ16), OQ17 finalization-tracking note + stop-retrying signal (OQ8 guide note), minimum wallet version (OQ7), OQ18 scope statement, V2-support statement.
- [ ] TROUBLESHOOTING entries for every code in `MIDNIGHT_JS_ERROR_CODES`; llms.txt/API-doc updates; **fix the stale layering diagram in CLAUDE.md/AGENTS.md** (`types` depends on `protocol`).
- [ ] AC5 positive compile test runs against the guide's exact snippet.

### Task 5.3: fork-crossing e2e + harness-gated negatives (AC0/OQ14)
- [ ] Static v8-era environment (QA-6) stands up (pinned v8 node/indexer/proof-server images, or recorded responses fallback — recorded in spec which FR8 items gate where until then).
- [ ] AC0 scenario, one session, unchanged code: pre-fork v8-native call+deploy → fork (stale-head → two-step re-run → keep-state) → v9-native → reads own v8 history. Mocked head flips until OQ14 lands; authoritative at the OQ14 tier.
- [ ] Harness-gated security negatives per the Task 0.2 Step 2 ruling: perturbed-bytes rejection at apply; A5 cross-era rewrap fails verification; double-submit — re-run's call leg fails effects-equality.
- [ ] Wallet test-shim port (OQ7) so the fee-paying cross-fork e2e never degrades to `test.skip`; release gate: production-ready only after AC0 in the OQ14 environment or an upstream fork rehearsal (participation = named work item).

---


---

## PR slicing

| PR | Tasks | Contents | Depends on |
|----|-------|----------|-----------|
| **cross-plan** | plan-2 Task 2.3 + 4.1, 4.2 + mocks | interface members + indexer implementation (latch, raw state) + testkit mocks — ONE PR (spec §4.4) | plan-2 D14-B |
| 1006-A | 4.3 | per-record dual decode + lazy `loadV8()` + union surfacing | cross-plan PR, plan-1 1004-C |
| 1006-B | 4.4 | version-tagged proof/wallet/midnight seams + OQ15 asserts + CostModel re-audit | 1006-A |
| 1006-C | 4.5 | private-state cross-window round-trip + mock version-invariant | 1006-A, plan-1 1004-E (keep-state) |
| 1006-D | 4.6 | barrel re-exports + isolated-linker smoke + Vite laziness CI jobs | 1006-B |
| 1006-E | 5.1 | split-topology integration milestone | all plans' code PRs |
| 1006-F | 5.2 | migration guide + TROUBLESHOOTING + CLAUDE.md layering fix (AC9) | feature-complete |
| 1006-G | 5.3 | static v8-era env, AC0 fork-crossing e2e, harness-gated security negatives, wallet test-shim port | OQ9/OQ14 rulings |
