# HF v8/v9 — Plan 4 of 4: MJS-03 Providers + Integration & Hardening (#1006)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Providers become version-agnostic: an uncached head query, `queryRawContractState` with the composed snapshot + adversarial tag parse, lazy dual decode, version-tagged tx-flow seams, private-state continuity — then the release-gating integration, docs and fork-crossing e2e.

**Architecture:** The head version is **never latched** (ADR 0008): `queryLatestProtocolVersion()` takes no arguments, a cache is permitted only if it expires by itself, and `IndexerPublicDataProvider` caches nothing. A read's era comes from the `protocolVersion` that read carries; `contracts` stays stateless. The v8 tx-flow arm is tag-prefixed bytes at every external seam with the OQ15 parse as defence-in-depth.

**Tech Stack:** Apollo Client + GraphQL codegen (`src/gen`), vitest 4, docker integration env, testkit-js mocks, pnpm/PnP + Vite CI fixtures.

**Spec:** `docs/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (**v5.5**) — §4.4 (read the "As delivered (#1177 → #1207)" block first), §4.5, §6.3, §8 (providers slice), §10 steps 4–6, AC0/AC9.

> **SCOPE REVISION (2026-09-03, refreshed 2026-09-04 at spec v5.5) — read this before Task 4.1.** Issue #1006 landed **three PRs** (#1204 → #1177 → #1207) that ship most of Phase 4's first half, and a fourth ([#1225](https://github.com/midnightntwrk/midnight-js/pull/1225)) that removed the era latch again. All four are on the long-living integration branch `feat/1004-protocol-dual-ledger`, which [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) tracks. **That branch — not `main` — is the base for everything below** (see the Worktree rule).
>
> | Task | Status | Left to do |
> |---|---|---|
> | 4.1 head query, uncached | **DELIVERED** (#1177, #1207, #1225) | nothing — the docker assertion landed too |
> | 4.2 `queryRawContractState` + composed request + parse | **DELIVERED** (#1177, #1207) | nothing structural; extend coverage as needed |
> | 4.3 per-record dual decode + union surfacing | **OPEN** | all of it — today a v8 record is *refused*, not decoded |
> | 4.4 version-tagged tx-flow seams | **PARTLY** (#1204) | the real v8 arm; the seams refuse it today |
> | 4.5 private-state cross-window | **OPEN** | all of it |
> | 4.6 barrel + packaging gates | **OPEN** | all of it |
>
> **The one design rule shipped here that this plan must not re-litigate: the envelope decides, the block bounds.** The envelope comes off the bytes and decides *decodability*; the reported `protocolVersion` dates the *read* and is an **upper bound only**, because the indexer serves the latest contract action at or before the requested block — so an older envelope under a newer block is the ordinary case. Only the reverse is reported (`era-disagreement`), and only where both signals describe the same block: `parseHexContractState` takes `{ upperBound: 'enforced' | 'withheld' }`, defaulting to `'enforced'` so no call site loses the check by omission, and `'withheld'` on the unpinned sibling reads. Withholding drops the comparison only; the envelope still decides decodability. See spec §4.4.

**Ticket:** [#1006 MJS-03](https://github.com/midnightntwrk/midnight-js/issues/1006). Branch: `feat/1006-provider-dual-decode` (fresh worktree per PR).

**Prerequisites:** plan-2 D14-B merged — **DONE as #1204**. Tasks 4.1/4.2 were to ship in a **cross-plan PR** with plan-2 Task 2.3 (interface members) and the testkit mocks (spec §4.4 same-PR rule); that happened as **#1177 (interface members + indexer implementation) → #1207 (era dating) → #1225 (latch removed)**. Remaining work branches off **`origin/feat/1004-protocol-dual-ledger`**; #1218 does not have to land on `main` first.

## Global Constraints

- **Worktree rule (CHANGED 2026-09-04, owner ruling):** every phase starts on a fresh `wt` worktree branched from clean **`origin/feat/1004-protocol-dual-ledger`**, and its PR targets that branch. #1218 need not reach `main` first — it is a long-living integration branch, not a pending merge. This is a deliberate exception to the repo's usual "branch from clean `origin/main`" rule, and it holds for the whole hard-fork window; sync parent → child by **merge, never rebase** (a rebase orphans the merge bases the stack depends on), and give each stacked child its own `yarn.lock` commit whenever the root `resolutions` pin moves. Branching off `main` instead would produce a tree with none of what this plan extends: `unwrapV9`, `loadLedger8`, `queryRawContractState`, `requireV9Era`, the `packages/utils` error-code registry, ADRs 0006/0007/0008 and the nine `packages/protocol/docs/` documents are all absent there. Branch names: `feat/1006-provider-dual-decode` and siblings.
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

### Task 4.1: indexer — head query, uncached — **DELIVERED (#1177, #1207, #1225)**

**Files:**
- Modify: `packages/indexer-public-data-provider/src/provider.ts`, `src/query-definitions.ts` (new head query on the OQ3d field)
- Create: `packages/indexer-public-data-provider/src/test/head-freshness.test.ts` (shipped as `head-latch.test.ts` in #1177, renamed by #1225)

**Interfaces:**
- Consumes: `PublicDataProvider.queryLatestProtocolVersion(): Promise<number>` from Task 2.3 — **no arguments** (#1225 removed the `options?: { fresh?: boolean }` parameter along with the latch).
- Produces: the reference implementation, which is now the trivial one:
  ```ts
  // inside IndexerPublicDataProvider
  async queryLatestProtocolVersion(): Promise<number> {
    return await this.fetchHeadProtocolVersion();   // HEAD_PROTOCOL_VERSION_QUERY, fetchPolicy: 'no-cache'
  }
  ```
- [x] **Steps 1–5 — shipped.** The head field is `HEAD_PROTOCOL_VERSION_QUERY` = `query { block { protocolVersion } }` (OQ3d). `head-freshness.test.ts` asserts one GraphQL request per call and a moved head reported on the next call, by **observable request counts** rather than private state.
- [x] **The docker integration assertion landed** in `testkit-js/testkit-js-e2e/test/indexer-public-data-provider.singlecontract.it.test.ts`: it issues `query { block { protocolVersion } }` against the live indexer and asserts the provider returns exactly that integer, plus that `versionOfRecord` places it in `LEDGER_VERSIONS`. The sibling test does the same for `queryRawContractState`.
- [x] **REVERSAL — read this before touching anything head-related.** #1177/#1207 shipped a corroborated monotone latch (`v9HeadLatch`, `corroborateV9`, routes `'snapshot-envelope'` / `'finalized-record'`); **#1225 removed all of it** and `docs/adr/0008-never-latch-the-network-head-version.md` records why: upgrade-only meant nothing would clear it at the *next* fork, so it saved a request mid-era and misreported at the era boundary; its own contract forbade caching pre-fork, making it inert during the transition it was built for; and corroborating from a finalized record cost an extra head request per finalized transaction until it engaged. **Do not reintroduce it.** The interface now carries one bound instead of a protocol: a cache is permitted only if it **expires by itself**, short relative to block time. Two shapes stay open if head reads ever become a measured cost — a self-expiring cache, or coalescing concurrent in-flight reads into one request (promise-memo, released on resolve). Neither is corroboration.
- [x] **Two separation rules that constrain Tasks 4.3–4.4.** A read's era comes from the `protocolVersion` that read carries, never from a head reading — and not the reverse. And a read must **not** issue a head request as a side effect of the caller's request; that is what keeps a read's per-call cost predictable.
- [ ] **Still owed:** nothing in this task. The deploy path's head resolution (read fresh → compose → confirm from the finalized record) is named in ADR 0008 as MJS-02/MJS-03 follow-up work and belongs to Task 4.4's era arm, not here.

### Task 4.2: indexer — `queryRawContractState` + composed request + adversarial parse — **DELIVERED (#1177, #1207)**

**Files:**
- Modify: `src/provider.ts`, `src/query-definitions.ts` (composed call-path document: head field + raw state in one request — §4.4 mitigation), `src/codec.ts`
- Create: `src/test/raw-contract-state.test.ts`

- [x] **Steps 1–5 — shipped.** `RAW_CONTRACT_STATE_QUERY` selects `block(offset:) { protocolVersion }` beside the contract state in **one** document (still one round trip, still not one snapshot — OQ3e; the era check remains the backstop). `raw-contract-state.test.ts` covers the composed call path, both envelopes round-tripping, and the adversarial-envelope matrix, in the indexer's real hex wire encoding. `parseSerializedTag` lives in `packages/utils/src/serialized-tag.ts` with `MIDNIGHT_JS_U_TAG_PARSE_FAILED`.
- [x] **`protocol-version-coverage.test.ts` states the whole document surface exhaustively and in BOTH directions** — a document that decodes era-sensitive bytes without dating them fails the build, and so does a document that starts paying for a field it has no use for; an unclassified new document also fails. `BLOCK_QUERY` and `LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY` are deliberately untouched (no serialized bytes). `ContractAction` carries no era in the schema, which is why two documents reach it through `transaction`.
- [x] **Error taxonomy shipped alongside:** `IndexerDataError` kinds `'undated-state'` (a state with no block to date it — it was mis-reusing `'missing-head-block'`, whose remediation tells the caller to wait for a block to be indexed), `'era-disagreement'` (carries `protocolVersion` / `reportedVersion` / `envelopeVersion`) and `'unsupported-decode-era'`; plus `EraUnsupportedError` / `EraUnresolvableError`.
- [ ] **Note (Task 0.3 discovery), still live:** the OQ3 fail-open set is six types (see spec OQ3(c)) — the tag check cannot rely on tags discriminating era for the zswap-subsystem types; design against the full list, not `ZswapChainState` alone. The `[vN]` counter in a tag is the **object schema version, not the ledger era**.
- [ ] **Follow-up recorded on #1207, still owed:** `RawContractState.version` is derived from the read-viewpoint block while its docs tell callers to narrow on it and hand the bytes to that era's deserializer — wrong runtime for a contract dormant across a fork. The type hedges; the primary instruction needs rewording.

### Task 4.3: indexer — per-record dual decode + lazy `loadLedger8()` + union surfacing — **OPEN (all of it)**

**Files:**
- Modify: `src/mapping.ts` (both `protocolVersion:` construction sites — `toFinalizedDeployTxData`, `watchForTxData` path), `src/codec.ts`, `src/provider.ts`
- Create: `src/test/dual-decode.test.ts`

> **Where this task starts from, as shipped.** A v8-era record is currently **named and refused**, not decoded: `requireV9Era` raises `EraUnsupportedError` (`MIDNIGHT_JS_PR_ERA_UNSUPPORTED`). `toFinalizedDeployTxData` resolves the era **before** `parseHexTransaction` deliberately — that deserializer is v9-only, so a v8 record has to surface as a named era failure rather than a codec failure. That resolution point is the seam this task replaces with a real decode. The accessor is `loadLedger8()` (the v5.2 name `loadV8()` no longer exists).

- [ ] **Step 1: Failing tests:** v9 records decode through today's static path byte-unchanged (golden against Task 3.1-era baselines); v8-tagged records decode via `loadLedger8()` — awaited inside the already-async query method, memoised (spy: exactly one load across N records); lazy gates: a v9-only session never triggers the v8 WASM (grep-level + spy); a decode-only session never loads the 0.16 runtimes; `VersionedFinalizedTxData` arms carry the version-truth invariant; wrong-version decode → `DECODE_VERSION_MISMATCH` wrapped `{ cause }`, cause sanitized (serialize, assert no state bytes — QA-8 fixture).
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): decode v8 history lazily and surface versioned records (FR6/NFR6)`.

### Task 4.4: tx-flow seams — proof/wallet/midnight providers + OQ15 asserts — **PARTLY DELIVERED (#1204)**

**Files:**
- Modify: `packages/http-client-proof-provider/src/`, `packages/dapp-connector-proof-provider/src/`, `packages/types/src/proof-provider.ts` (`createProofProvider` — re-audit `CostModel.initialCostModel()` for the v8 arm, record the finding)
- Create: seam tests in each provider package

> **What #1204 already shipped.** `proveTx` / `balanceTx` / `submitTx` in `types` take `VersionedTx<T> = V8TxBytes | V9Tx<T>`, with a compile-time exhaustiveness pair asserting the arms' `version` set equals `LedgerVersion` in both directions; `VersionedFinalizedTxData` and `RawContractState` likewise. `http-client-proof-provider` adopted the union. **But every v8 arm is refused today** — `unwrapV9(payload, seam)` throws `MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED`, and `contracts` mirrors it with `requireV9`. So the shape exists and this task's real content is **lifting the refusal and implementing the v8 arm**, in step with MJS-02 Task 3.5 — a half-lifted seam fails in the middle of a submit. Also note a convention divergence to resolve or accept: `unwrapV9` is a **runtime** helper living in `types`, which the repo treats as declarations-only; if it is to move, `utils` is its home and this is the task that moves it.

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
- [ ] TROUBLESHOOTING entries for every code in `MIDNIGHT_JS_ERROR_CODES`; llms.txt/API-doc updates. ~~Fix the stale layering diagram in CLAUDE.md/AGENTS.md~~ — **DONE on the integration branch**: `CLAUDE.md` already reads `types ← provider interfaces (depends on protocol only)`, and `AGENTS.md` carries no layering diagram at all.
- [ ] AC5 positive compile test runs against the guide's exact snippet.

### Task 5.3: fork-crossing e2e + harness-gated negatives (AC0/OQ14)
- [ ] **Blocker recorded on #1207, fix before anything else in this task:** `nightly-e2e.yml` is the **only** coverage for eras other than v9 — it rotates `TESTKIT_DOCKER_ENV` across all five image sets — and it has been `startup_failure` with **zero jobs launched** for at least six consecutive nights. Until it runs, every e2e signal on this whole stack is devnet, i.e. node 2.x / ledger v9 only, and the static v8-era environment below has no CI home.
- [ ] Static v8-era environment (QA-6) stands up (pinned v8 node/indexer/proof-server images, or recorded responses fallback — recorded in spec which FR8 items gate where until then).
- [ ] AC0 scenario, one session, unchanged code: pre-fork v8-native call+deploy → fork (stale-head → two-step re-run → keep-state) → v9-native → reads own v8 history. Mocked head flips until OQ14 lands; authoritative at the OQ14 tier.
- [ ] Harness-gated security negatives per the Task 0.2 Step 2 ruling: perturbed-bytes rejection at apply; A5 cross-era rewrap fails verification; double-submit — re-run's call leg fails effects-equality.
- [ ] Wallet test-shim port (OQ7) so the fee-paying cross-fork e2e never degrades to `test.skip`; release gate: production-ready only after AC0 in the OQ14 environment or an upstream fork rehearsal (participation = named work item).

---


---

## PR slicing

| PR | Tasks | Contents | Depends on |
|----|-------|----------|-----------|
| ~~**cross-plan**~~ | plan-2 Task 2.3 + 4.1, 4.2 + mocks | **DONE** — landed as #1177 (interface members + indexer head/raw state + mocks), #1207 (era dating, `parseHexContractState` upper bound, contract-event `protocolVersion`) and #1225 (latch removed, ADR 0008) | plan-2 D14-B = #1204 |
| 1006-A | 4.3 | per-record dual decode + lazy `loadLedger8()` + union surfacing | `origin/feat/1004-protocol-dual-ledger` tip |
| 1006-B | 4.4 | version-tagged proof/wallet/midnight seams + OQ15 asserts + CostModel re-audit | 1006-A |
| 1006-C | 4.5 | private-state cross-window round-trip + mock version-invariant | 1006-A, plan-1 1004-E (keep-state) |
| 1006-D | 4.6 | barrel re-exports + isolated-linker smoke + Vite laziness CI jobs | 1006-B |
| 1006-E | 5.1 | split-topology integration milestone | all plans' code PRs |
| 1006-F | 5.2 | migration guide + TROUBLESHOOTING + CLAUDE.md layering fix (AC9) | feature-complete |
| 1006-G | 5.3 | static v8-era env, AC0 fork-crossing e2e, harness-gated security negatives, wallet test-shim port | OQ9/OQ14 rulings |
