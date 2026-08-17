# HF v8/v9 — Plan 3 of 4: MJS-02 `contracts` Unified Entries & Dispatch (#1005)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The existing entries (`submitCallTx`, `deployContract`, …) gain an additive 0.16 overload and dispatch internally on three axes (artifact era → pipeline, head era → envelope, key-set → verification path); keep-state and v8-native pipelines work through the same unchanged call sites.

**Architecture:** Dispatch is fully internal (D7); every fail-fast is typed with a registered code; the operation acquires `loadV8()` once at its async start and passes the handle down as a value; one `queryRawContractState` snapshot per operation feeds routing, SEC-5 and execution.

**Tech Stack:** TypeScript 6, vitest 4 typecheck mode (compile-assertion harness — new tooling, Task 3.2), the plan-1 engine, the plan-2 type surface.

**Spec:** `docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (v5.2) — §4.3, §6.2, §8 (contracts slice).

**Ticket:** [#1005 MJS-02](https://github.com/midnightntwrk/midnight-js/issues/1005). Branch: `feat/1005-contracts-unified-entries` (fresh worktree per PR).

**Prerequisites:** plan-1 PRs 1004-B/C/D merged (engine core, errors); plan-2 D14-B + the cross-plan provider-members PR merged (mocks implement the new interface). Task 3.1 (baselines) lands before any other change in this package.

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

## Phase 3 — #1005 MJS-02: `contracts` unified entries & dispatch

Branch: `feat/1005-contracts-unified-entries`. **Task 3.1 (baselines) lands before any other change in this package.**

### Task 3.1: non-regression baselines (FR7/AC4 — capture BEFORE first change)

- [ ] **Step 1:** On clean `main`, record the diff-gate file list: every `packages/contracts/src/test/**` behavioural test file, split into `d14-touching` (imports `FinalizedTxData`/provider mocks) and `untouched` (must remain byte-identical — enforce with a checked-in sha256 manifest + a CI script comparing hashes).
- [ ] **Step 2:** Capture golden fixtures on `main` for the deterministic stages **enumerated** (QA-11): decoded state, transcript POJO, unproven-call prototype pre-binding; structural-equality assertions for post-binding stages (randomness — no injection seam exists today).
- [ ] **Step 3:** Commit `test(midnight-js): capture v9-native non-regression baselines` (dedicated no-production-change commit — the re-baselining rule).

### Task 3.2 [was OQ13-gated — anchors delivered by Plan-1 Task 0.1, 2026-08-17]: compile-assertion harness + 0.16 overload prototype

**Files:**
- Create: `packages/contracts/src/test/typecheck/overloads.test-d.ts` (vitest typecheck mode — enable `typecheck: { enabled: true }` in contracts' vitest config), `packages/contracts/src/ledger8-contract.ts` (the 0.16 type family)

**Interfaces:**
- Consumes: Task 0.1 Step 3 era-tag discriminators (resolved — spec v5.2 §4.3): 0.18 = compact-js `CompiledContract` with the `Symbol.for('compact-js/CompiledContract')` brand (type level: its unique-symbol variance brand); 0.16 = raw sync `Contract` instance (type-level anchor: non-Promise `impureCircuits` returns + `initialState(ctx): ConstructorResult`); near-miss guard: 0.18 codegen is fully `async` (`initialState.constructor.name === 'AsyncFunction'` ⇒ typed era/artifact-mismatch error), 0.18 modules export `expectedVk`. A real spike-generated 0.16 contract object as devDependency fixture.
- Produces (the parallel type family — spec §4.3, the largest single work item):
  ```ts
  export interface Ledger8Contract<PS = unknown> { /* pinned from the real 0.16 artifact shape: impureCircuits, initialState, witnesses */ }
  export type Ledger8CircuitId<C extends Ledger8Contract> = keyof C['impureCircuits'] & string;
  export type Ledger8CallTxOptions<C extends Ledger8Contract, K extends Ledger8CircuitId<C>> = { readonly compiledContract: C; readonly contractAddress: string; readonly circuitId: K; readonly args: Parameters<C['impureCircuits'][K]>; /* + privateStateId variant */ };
  export type Ledger8FinalizedCallTxData = /* VersionedFinalizedTxData-based result — v8 pre-fork / v9 keep-state */;
  ```
- [ ] **Step 1: Failing typecheck tests:** 0.16 object accepted by `submitCallTx`; 0.18 call sites compile byte-unchanged (compile the Task 3.1 untouched files); **negative:** 0.16 object does NOT structurally match the 0.18 overload and vice versa (`@ts-expect-error` both directions); neither-shape object produces the named diagnostic (catch-all overload with a conditional-type error brand: `type NeitherContractShape = { readonly __error: 'Object is neither a 0.16- nor a 0.18-generated contract. See migration guide §window.' }`) — snapshot the diagnostic text.
- [ ] **Step 2–4:** red → implement the overload additions on `submitCallTx`/`submitCallTxAsync`/`deployContract`/`findDeployedContract` (types only at this task — bodies `throw new Error('not implemented')` behind the dispatch fork) → typecheck green.
- [ ] **Step 5: Commit** — `feat(midnight-js): add 0.16 contract overloads (typing prototype, D7)`. This closes the OQ13 "exact overload typing" item — record in spec.

### Task 3.3: era resolution, dispatch predicate, fail-fasts

**Files:**
- Create: `packages/contracts/src/internal/era.ts`, `packages/contracts/src/hf-errors.ts`, `packages/contracts/src/test/era-dispatch.test.ts`

**Interfaces:**
- Consumes: `networkHeadVersion`, `parseSerializedTag`, `CONTRACTS_ERROR_CODES`, Task 0.1 era-tag discriminators (resolved — spec v5.2 §4.3: compact-js `Symbol.for('compact-js/CompiledContract')` brand ⇒ v9native; raw sync `Contract` instance ⇒ ledger8; async raw instance ⇒ typed era/artifact-mismatch error, never silent).
- Produces:
  ```ts
  export type PipelineEra = 'ledger8' | 'v9native';
  export const pipelineEraOf: (compiledContract: unknown) => PipelineEra;                    // spec v5.2 §4.3 discriminators
  export const resolveOperationEra: (pdp: PublicDataProvider) => Promise<{ head: LedgerVersion; headProtocolVersion: number }>; // memoised per operation
  export const assertEraCompatible: (pipeline: PipelineEra, head: LedgerVersion, kind: 'call' | 'deploy') => void;
  export const assertHeadStateEraAgreement: (head: LedgerVersion, state: RawContractState, pdp: PublicDataProvider) => Promise<void>;
  ```
  `hf-errors.ts`: `EraArtifactMismatchError`, `Ledger8DeployOnV9Error` (remediation → guide runtime-deploy chapter), `HeadStateEraMismatchError` (QA-3-family, two-step re-run text), `IndexerInconsistencyError` (retry-later text) — each `code` from `CONTRACTS_ERROR_CODES`, each message = what/why/one-next-step.
- [ ] **Step 1: Failing dispatch-table test** — artifact era × head era, all four cells: `(0.18, v9) → v9native`, `(0.16, v9) → ledger8 keep-state`, `(0.16, v8) → ledger8 v8-native`, `(0.18, v8) → EraArtifactMismatchError`; deploy variant: `(0.16, v9) → Ledger8DeployOnV9Error` with remediation matched by regex `/runtime-deploy|0\.18 artifacts/`. Head memoisation spy: exactly one `queryLatestProtocolVersion` per operation. Head↔state agreement: `assertHeadStateEraAgreement('v9', v8EnvelopeState, pdp)` first calls `queryLatestProtocolVersion({ fresh: true })` (spy asserts), then: fresh=v8 → `HeadStateEraMismatchError`; fresh=v9 → `IndexerInconsistencyError` (QA-2 — never the fork-in-progress text). Tag check runs **before any decode**, both pipelines.
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): add internal era dispatch and fork-window fail-fasts (§4.3/§6.2)`.

### Task 3.4: key-set truth table + SEC-5 checks

**Files:**
- Create: `packages/contracts/src/internal/key-set.ts`, `packages/contracts/src/test/key-set.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type KeySetShape = 'co-v2-only' | 'v3-present' | 'both' | 'neither';
  export const classifyKeySet: (state: DecodedKeySetView) => KeySetShape;
  export const selectVerificationPath: (pipeline: PipelineEra, shape: KeySetShape) => 'keep-state' | 'v9-native';
  export const assertVerifierKeyMatches: (localKey: Uint8Array, onChainSlot: Uint8Array | undefined, slotName: 'v2' | 'co.v2' | 'v3') => void; // SEC-5 — byte-match via existing verifierKeysEqual, BEFORE proving
  ```
- [ ] **Step 1: Failing truth-table test,** strict on all four shapes (v9 head): `co-v2-only → keep-state`; `v3-present → v9-native`; `both → v9-native` + dual-key breadcrumb asserted; `neither → UnsupportedKeySetError`. Contradictions both directions (0.16 pipeline × `v3-present`; 0.18 × `co-v2-only`) → `KeySetContradictionError`, message contains **both observed eras and both plausible causes** (`/migrated pre-fork contract/` and `/v9-era ZKIR-v2 deploy/` — A4 text). SEC-5: flipped-key fixtures → `assertVerifierKeyMatches` throws before any proving spy fires. A4 mis-dispatch: `state-co-v2-only-foreign.hex` → deterministic typed failure at down-convert.
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): add key-set verification-path truth table with SEC-5 pre-checks`.

### Task 3.5: keep-state + v8-native orchestration through the unified entries

**Files:**
- Modify: `packages/contracts/src/submit-call-tx.ts`, `packages/contracts/src/deploy-contract.ts`, `packages/contracts/src/unproven-call-tx.ts`
- Create: `packages/contracts/src/internal/ledger8-pipeline.ts`, tests `packages/contracts/src/test/keep-state.test.ts`, `packages/contracts/src/test/v8-native.test.ts`

**Interfaces:**
- Consumes: Tasks 1.5–1.8 engine via `loadV8()` (acquired at operation start — an already-async boundary — passed down as a value), Tasks 3.3/3.4 dispatch, Task 2.4 payload unions.
- Produces: the working FR4/FR8 paths behind the existing entry names; single-snapshot invariant (one `queryRawContractState` per operation feeds routing + SEC-5 + execution).
- [ ] **Step 1: Failing positives:** keep-state — the 0.16 fixture contract completes a post-fork call through the **same unchanged call site** (mock providers; head v9; migrated fixture; proof spy receives V2 selected by key tag; wallet/midnight spies receive the v9 live-object arm). v8-native — same contract completes call **and deploy** with a v8 head; wallet/proof/midnight spies receive `{ version: 'v8', txBytes }` and `parseSerializedTag(txBytes).tag` matches the v8 tag at every seam. Single-snapshot spy: exactly one `queryRawContractState` per operation, both eras. Era-invariant assert: mocked pipeline emitting a v8-tagged result into the 0.18 return → `ERA_INVARIANT_VIOLATION` typed throw.
- [ ] **Step 2–4:** red → implement (`ledger8-pipeline.ts` orchestrates: fetch snapshot → tag/era check → key-set → engine execute → wrap or compose → prove/balance/submit through the configured providers) → green.
- [ ] **Step 5: Unsanctioned-mixing negatives:** every construction mechanism other than (a) native v8 pre-fork, (b) keep-state post-fork throws `UNSANCTIONED_MIXING` (serialized fixtures via the OQ15 tag). **Step 6: Commit** — `feat(midnight-js): route keep-state and v8-native pipelines through unified entries (FR4/FR8)`.

### Task 3.6: QA-3 stale-head detection + two-step remediation

**Files:**
- Create: `packages/contracts/src/internal/stale-head.ts`, `packages/contracts/src/test/stale-head.test.ts`

**Interfaces:**
- Produces: `export const handleSubmitRejection: (pdp: PublicDataProvider, startEra: LedgerVersion, kind: 'call' | 'deploy', rejection: unknown) => Promise<never>;`
- [ ] **Step 1: Failing tests:** rejection + flipped head **era** (via `queryLatestProtocolVersion({ fresh: true })` — spy asserts the bypass) → `StaleHeadError` whose message matches BOTH remediation steps (`/did not.*finalize|not finalize/` then `/re-run/`) for calls, and the runtime-deploy chapter pointer for deploys (QA-1); rejection + same era (incl. same-era node-minor int bump 2_000_000→2_001_000 — ARCH-8) → original error re-thrown wrapped `{ cause }`; the wrapped submit-rejection cause is sanitized (serialize the error, assert fixture payload bytes absent — QA-8); re-run after the flip lands on keep-state with no code change (integration of 3.3+3.5).
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): add fork-crossing stale-head detection with two-step remediation (QA-3/OQ17)`.

### Task 3.7: scoped transactions era rules

**Files:**
- Modify: `packages/contracts/src/internal/transaction.ts`, `packages/contracts/src/transaction.ts`
- Create: `packages/contracts/src/test/scoped-era.test.ts`

- [ ] **Step 1: Failing tests (spec §4.3 scoped rules):** era resolved **once per scope** at context creation (spy: one head query per scope, not per merged call); mixed 0.16/0.18 calls merged into one scope → `MIXED_ERA_SCOPE` typed error; on a v8 head, per-call composition inside the scope stays live v8 objects and serialization happens once at scope submit (spy: `parseSerializedTag` succeeds on the submit payload; no per-call serialization); fork mid-scope surfaces as the Task 3.6 stale-head at submit.
- [ ] **Step 2–4:** red → implement (thread `ResolvedOperationEra` through `TransactionContextImpl`) → green. **Step 5: Commit** — `feat(midnight-js): extend scoped transactions with per-scope era rules (§4.3)`.

### Task 3.8: dispatch breadcrumbs + AC2 registry meta-test (contracts slice)

**Files:**
- Create: `packages/contracts/src/internal/breadcrumbs.ts`, `packages/contracts/src/test/breadcrumbs.test.ts`, `packages/contracts/src/test/error-codes-negative.test.ts`

- [ ] **Step 1: Failing tests:** each dispatch decision (head resolution, pipeline/verification-path selection, encoding) emits a debug-level `loggerProvider` breadcrumb — strict equality on structured fields `{ decision, version, path, source, protocolVersion, latchProvenance }`; path-selection additionally `{ keySetShape, contractAddress }`; no payloads/keys in any field. Meta-test: `expect(NEGATIVE_TESTED_CONTRACT_CODES.sort()).toEqual(Object.values(CONTRACTS_ERROR_CODES).sort())` where `NEGATIVE_TESTED_CONTRACT_CODES` is maintained next to the negative tests — a new code cannot ship untested.
- [ ] **Step 2–4:** red → implement → green. **Step 5: Commit** — `feat(midnight-js): add version-dispatch breadcrumbs and error-code meta-test (AC2/AC8)`.

---


---

## PR slicing

| PR | Tasks | Contents | Depends on |
|----|-------|----------|-----------|
| 1005-A | 3.1 | non-regression baselines: sha256 manifest of untouched test files + golden fixtures (dedicated no-production-change PR) | — |
| 1005-B | 3.2 | compile-assertion harness + 0.16 overload typing prototype (closes OQ13 typing item) | 1005-A (era-tag anchors delivered by Plan-1 Task 0.1 — spec v5.2 §4.3) |
| 1005-C | 3.3, 3.4 | era dispatch + fail-fasts; key-set truth table + SEC-5 | 1005-B, cross-plan provider-members PR |
| 1005-D | 3.5 | keep-state + v8-native orchestration through unified entries | 1005-C, plan-1 PR 1004-E |
| 1005-E | 3.6, 3.7 | stale-head two-step remediation + deploy branch; scoped-transaction era rules | 1005-D |
| 1005-F | 3.8 | breadcrumbs + AC2 error-code meta-test | 1005-E |
