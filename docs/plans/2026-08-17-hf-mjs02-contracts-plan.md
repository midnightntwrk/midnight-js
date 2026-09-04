# HF v8/v9 — Plan 3 of 4: MJS-02 `contracts` Unified Entries & Dispatch (#1005)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The existing entries (`submitCallTx`, `deployContract`, …) gain an additive 0.16 overload and dispatch internally on three axes (artifact era → pipeline, head era → envelope, key-set → verification path); keep-state and v8-native pipelines work through the same unchanged call sites.

**Architecture:** Dispatch is fully internal (D7); every fail-fast is typed with a registered code; one `queryRawContractState` snapshot per operation feeds routing, SEC-5 and execution. The operation acquires **two** handles at its async start and passes both down as values: `era = await loadLedgerEra(headEra)` and, on the ledger-8 pipeline only, `engine = await loadLedger8Engine()`.

> **SECOND SCOPE REVISION (2026-09-03, spec v5.4) — read this first.** Three things changed under this plan after the 2026-08-31 revision below was written, all read off the tree [#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) puts on `main`:
>
> 1. **OQ19 is CLOSED. Coin-moving circuits work on the retained era.** `Ledger8ZswapUnsupportedError` and its code do not exist. `TranscriptPojo.zswapLocalState` carries the post-call Zswap local state; both compose arms take offer bytes. Task 3.0 Step 3 becomes a wiring task, not a ruling, and Task 3.5's "Zswap refused" negative is deleted and replaced.
> 2. **OQ21 is narrowed to one question, not three.** #1204 shipped the seam union with a **live** v9 arm (`V9Tx<T> = { version: 'v9'; tx: T }`), which eliminates option (b) unless `types` changes again. Confirm option (a) rather than re-opening the trilemma.
> 3. **Part of what this plan consumes already exists.** `packages/contracts/src/internal/era.ts` (`requireV9`, `requireV9Record`, `EraInvariantViolationError`, `UntaggedPayloadError`), `CONTRACTS_ERROR_CODES` with `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION`, the repo-level registry in `packages/utils/src/error-codes.ts` and `parseSerializedTag` in `packages/utils/src/serialized-tag.ts` all shipped with #1204. **Extend them; do not create them.** New in v5.4: **OQ22** — an unpartitioned cross-contract callee is not composable (`PreTranscript`'s `comm_comm` is unwired), masked today by the v8 one-call limit.
>
> **SCOPE REVISION (2026-08-31) — read this before Task 3.2.** PRs #1194 and #1198 moved the era-symmetric half of MJS-02 down into `protocol`. **This package no longer composes transactions on either era and never imports `protocol/v8`.** Three tasks change materially (3.5, 3.7, and the interfaces 3.3 consumes) and three new blocking decisions land on this plan (spec OQ19/OQ20/OQ21). What did NOT change: the overload typing work (still the largest single item), the dispatch axes, the key-set truth table, SEC-5, stale-head, breadcrumbs.
>
> | You call | Instead of |
> |---|---|
> | `(await loadLedgerEra(v)).extractState(raw)` / `.decodeContractState(raw)` | decoding with a module handle you were passed |
> | `(await loadLedgerEra(v)).composeCallTx(opts)` -> `Uint8Array` | composing an `Intent`/`Transaction` yourself, per era |
> | `(await loadLedgerEra(v)).composeDeployTx(opts)` -> `{ transaction, contractAddress, initialState }` | composing a deploy and deriving its address |
> | `(await loadLedger8Engine())` -> 4 methods | a 7-method engine behind `loadV8()` |
> | `loadLedger8()` | -- unchanged, but now only for **raw v8 module** access (provider read paths), not for composition |
>
> **`packages/contracts/src/utils/ledger-utils.ts` is untouched and is still the production v9 path.** Repointing it at the facade is a decision this plan must take explicitly (see Task 3.0), not a side effect.

**Tech Stack:** TypeScript 6, vitest 4 typecheck mode (compile-assertion harness — new tooling, Task 3.2), the plan-1 engine, the plan-2 type surface.

**Spec:** `docs/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (**v5.4**) — §4.1(5) (the era facade — read this first), §4.3 (the three real arm asymmetries + the partition-context rule), §4.5/OQ21, §6.2, §8 (contracts slice), OQ20/OQ21/OQ22. **OQ19 is closed — do not plan around a Zswap refusal.**
**Architecture:** `docs/architecture/2026-08-05-ledger-v8-v9-dual-support-architecture.md` (rewritten against v5.3).
**Durable sources in the tree you branch from — they ship with #1218 and therefore reach `main` with the work, which the spec and this plan never do, so cite these in code:** [ADR 0004](../adr/0004-lazy-v8-era-access-via-protocol-subpath.md) (lazy v8 era access), [ADR 0006](../adr/0006-version-tagged-payloads-at-provider-seams.md) (version-tagged payloads at the provider seams), [ADR 0007](../adr/0007-cross-the-era-boundary-with-plain-data-only.md) (only bytes and POJOs cross the era seam), and the nine package documents under `packages/protocol/docs/`: `era-seam`, `compose-refusal-order`, `retained-era-execution`, `fail-closed-decoding`, `injected-vendor-slices`, `module-graph-and-lazy-loading`, `shared-table-discipline`, `verifier-keys`, `dual-instantiation-guard`. Read `era-seam` and `compose-refusal-order` before Task 3.5. They landed on the integration branch after this plan's 2026-09-03 reconciliation, so they are the newest statement of the seam's behaviour where anything reads ambiguous here.

**Ticket:** [#1005 MJS-02](https://github.com/midnightntwrk/midnight-js/issues/1005). Branch: `feat/1005-contracts-unified-entries` (fresh worktree per PR).

**Prerequisites:** **plan-1 is complete** — the MJS-01 stack merged as #1155 → #1156 → #1164 → #1168 → #1165 → #1194 → #1198 onto `feat/1004-protocol-dual-ledger`, which **[#1218](https://github.com/midnightntwrk/midnight-js/pull/1218) puts on `main` together with the #1006 half** (#1204 → #1177 → #1207). Delivered: `loadLedger8`, `loadLedger8Engine`, `loadLedgerEra`, the 12-code `PROTOCOL_ERROR_CODES` (note the composition: `LEDGER8_ZSWAP_UNSUPPORTED` is out, `UNKNOWN_LEDGER8_AXIS` is in), the `./version` and `./errors` leaf subpaths, and the `dist-*` gates. **#1218 does not have to merge first:** this phase branches off `origin/feat/1004-protocol-dual-ledger` — the integration branch #1218 proposes — and its PRs target that branch, continuing the stack. Plan-2 D14-B and the cross-plan provider-members PR are already in that tree (the mocks implement the new interface). Stack discipline carried over from MJS-01: sync parent → child by **merge**, never rebase; merge rather than squash anything open children descend from; a moved root `resolutions` pin needs its own `yarn.lock` commit on every stacked child. Task 3.1 (baselines) lands before any other change in this package; **Task 3.0 (the three decisions) lands before any code at all.**

## Global Constraints

- **Worktree rule:** every phase starts on a fresh `wt` worktree, branched from the current tip of `origin/feat/1004-protocol-dual-ledger` for as long as that integration branch is open (from clean `origin/main` once it lands) — never off a sibling feature branch. Branch names: `feat/1004-protocol-dual-ledger`, `feat/1006-types-d14-foundation`, `feat/1005-contracts-unified-entries`, `feat/1006-provider-dual-decode`.
- **Fresh worktree:** run `yarn && yarn build` before first push (pre-push lint needs `dist/`).
- Apache 2.0 license header on every new `.ts` file (copy from any existing `src/` file).
- Conventional commits, GPG-signed; PR title matches `<type>(<scope>): <subject>`.
- `yarn lint` clean; **no `any` casts, no `as unknown`** (NFR2 — CI-enforced from the first PR).
- **Import gate (new in #1218):** a *runtime* import of `@midnight-ntwrk/midnight-js-protocol/v8` **or** `/engine` is an ESLint error outside `packages/protocol/src` — enforced over package sources, package tests and `testkit-js` alike, for static and dynamic imports, with type-only imports exempt. This package reaches the retained era only through `loadLedgerEra()` and `loadLedger8Engine()` on the barrel.
- TDD: test first, watch it fail, implement, watch it pass, commit. Arrange-Act-Assert. Every `expect()` has a matcher. Strict equality on export surfaces (`expect(actual.sort()).toEqual(expected.sort())`).
- Errors: never swallow; re-throw with `{ cause }`; every typed error carries a stable `code` and remediation text; cause chains sanitized before the logger seam (spec §6.2).
- Coverage: `packages/protocol` vitest thresholds are 100/100/100/100 and **coverage is always enabled** — every protocol task must keep 100% or add the glob-scoped carve-outs from Task 1.6. `packages/utils` thresholds: lines 97, functions 94, branches 93, statements 97.
- Exact versions (spec OQ2, re-confirm at implementation): v8 = `@midnightntwrk/ledger-v8@8.1.1` (implemented pin, PR #1156; `ledger-v8` is dual-published — org-ownership check on BOTH scopes per OQ2) + `@midnight-ntwrk/onchain-runtime-v3@3.1.0` and the retained glue under the alias key **`compact-runtime-ledger8`** (`npm:@midnight-ntwrk/compact-runtime@0.16.0`) — all three are `protocol`'s dependencies, none are `contracts`'; retained dApp stack compact `0.31.1` / compact-runtime `0.16.0` (only under `@midnight-ntwrk`); v9 = `ledger-v9@1.0.0-rc.3` / `onchain-runtime-v4@4.0.0-rc.3`.
- The spec's §6.2 privacy constraint applies to all error messages and breadcrumbs: version ints/sets and key identifiers allowed; key bytes, decoded state, raw payloads forbidden.

## Phase 3 — #1005 MJS-02: `contracts` unified entries & dispatch

Branch: `feat/1005-contracts-unified-entries`. **Task 3.1 (baselines) lands before any other change in this package.**

### Task 3.0: resolve the three blocking decisions #1194 left open (NO CODE)

None of these can be discovered in review — each is consumer-visible or changes what Tasks 3.5/3.7 build. Produce a short written ruling per item, land it in the spec, then start coding.

- [ ] **Step 1 — OQ21 (NARROWED by #1204): confirm option (a).** `LedgerEra.composeCallTx` returns serialized bytes on **both** eras (D18 — no live WASM handle crosses the seam), but `types` already shipped the seam union with a **live** v9 arm: `V9Tx<T> = { version: 'v9'; tx: T }`, consumed by `unwrapV9(payload, seam)`. That eliminates option (b) — both arms as `{ version, txBytes }` — unless `types` is changed again, which would be consumer-breaking beyond the documented D14 set and needs an AC7 allowlist entry plus an AC9 recipe. What is left is **(a)** deserialize the v9 bytes back with `ledger-v9` right after composing, or **(c)** keep `ledger-utils.ts` as a second v9 composition path. **(a) is what the delivered types point at.** Record the cost honestly: one serialize/deserialize round trip per operation on the hot v9 path, and it re-creates the dual-instantiation exposure the v8 byte rule exists to avoid — so state which single `protocol` instance the argument rests on. Blocks Task 3.5.
- [ ] **Step 2 — OQ20: scoped transactions on a v8 head.** As delivered there is **no composition path** for them: v5.2 §4.3(c) deferred serialization so `merge()` could run on live objects, and there are no live objects left. Options in spec §4.3(c). Note the coupling: option (ii) (one facade call composes a whole scope, via the multi-entry `calls` array) is blocked on the v8 arm by its one-call limit, so rule this **with** OQ19. Blocks Task 3.7.
- [x] ~~**Step 3 — OQ19: coin-moving circuits.**~~ **CLOSED by #1194 — no ruling needed, and no code decision here.** `TranscriptPojo` carries `zswapLocalState` (the post-call Zswap local state, decoded through the injected 0.16 glue) and **both** compose arms take `guaranteedZswapOffer` / `fallibleZswapOffer` as serialized bytes. `Ledger8ZswapUnsupportedError` and `MIDNIGHT_JS_P_LEDGER8_ZSWAP_UNSUPPORTED` do not exist. **What replaces this step is ordinary Task 3.5 work:** turn `zswapLocalState` into the segmented offer with `zswapStateToSegmentedOffer` (`packages/contracts/src/utils/zswap-utils.ts`, which already owns the per-recipient encryption-key resolver) and pass the bytes to `composeCallTx`. Two things still deserve a *measurement* on the way, neither of them a scope question: the **keep-state** coin-moving path (composes on v9 from a retained-era transcript) has no end-to-end coverage yet, and the offer must be built from the post-call state rather than re-derived.
- [ ] **Step 3a — OQ22 (NEW in spec v5.4): decide whether to leave the C2C-callee limit as a limit.** `PreTranscript`'s third argument (`comm_comm`) is unwired on both arms, so an **unpartitioned** cross-contract callee has no composition path. Masked today by the v8 one-call limit and by the v9 production path receiving already-partitioned transcripts from compact-js. Either (a) leave it and state it in the migration guide beside the v8 one-call rule, or (b) wire it when this plan produces such a callee. Note the coupling: OQ20 option (ii) — a scope mapped onto the multi-entry `calls` array — is v9-only for the same reason, so rule OQ20 and OQ22 together.
- [ ] **Step 4 — repointing `utils/ledger-utils.ts`.** Follows from Step 1. Taking it collapses two v9 composition implementations into one covered by `era-parity.test.ts`; declining it keeps a second arm the parity table does not cover. Record the choice either way.
- [ ] **Step 5:** Commit the spec update — `docs: record the MJS-02 rulings on OQ19/OQ20/OQ21`. **Do not commit specs without explicit approval.**

### Task 3.1: non-regression baselines (FR7/AC4 — capture BEFORE first change)

- [ ] **Step 1:** On the integration tip you branch from (not on `main` — #1218 already rewrote `submit-tx.test.ts`, `find-deployed-contract.test.ts` and `test-mocks.ts`, so `main` hashes are the wrong baseline), record the diff-gate file list: every `packages/contracts/src/test/**` behavioural test file, split into `d14-touching` (imports `FinalizedTxData`/provider mocks) and `untouched` (must remain byte-identical — enforce with a checked-in sha256 manifest + a CI script comparing hashes).
- [ ] **Step 2:** Capture golden fixtures on that same tip for the deterministic stages **enumerated** (QA-11): decoded state, transcript POJO, unproven-call prototype pre-binding; structural-equality assertions for post-binding stages (randomness — no injection seam exists today).
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
- Consumes (**all shipped — extend, do not re-create**): `networkHeadVersion`, `loadLedgerEra`, `parseSerializedTag` (`packages/utils/src/serialized-tag.ts` — note the real grammar is `namespace:type-descriptor:` with `[vN]`/nested lists and tags over 64 bytes, **not** "parse to the second `:`"), `CONTRACTS_ERROR_CODES` (today one member, `MIDNIGHT_JS_C_ERA_INVARIANT_VIOLATION`), `PROVIDER_ERROR_CODES`, `PROTOCOL_ERROR_CODES` (for the pass-through cases), and `packages/contracts/src/internal/era.ts`, which already holds `requireV9` / `requireV9Record` / `EraInvariantViolationError` / `UntaggedPayloadError`. Task 0.1 era-tag discriminators (resolved — spec v5.2 §4.3: compact-js `Symbol.for('compact-js/CompiledContract')` brand ⇒ v9native; raw sync `Contract` instance ⇒ ledger8; async raw instance ⇒ typed era/artifact-mismatch error, never silent).
- Produces:
  ```ts
  export type PipelineEra = 'ledger8' | 'v9native';
  export const pipelineEraOf: (compiledContract: unknown) => PipelineEra;                    // spec v5.2 §4.3 discriminators
  export const resolveOperationEra: (pdp: PublicDataProvider) => Promise<{ head: LedgerVersion; headProtocolVersion: number; era: LedgerEra }>; // memoised per operation; `era` = await loadLedgerEra(head), acquired once at the async start and threaded down as a value
  export const assertEraCompatible: (pipeline: PipelineEra, head: LedgerVersion, kind: 'call' | 'deploy') => void;
  export const assertHeadStateEraAgreement: (head: LedgerVersion, state: RawContractState, pdp: PublicDataProvider) => Promise<void>;
  ```
  `hf-errors.ts` — **the registry rule as actually shipped (#1204), which is not what the 2026-08-31 text said:** `protocol` keeps its codes locally in `packages/protocol/src/errors.ts` because it sits *below* `utils`, **and** `packages/utils/src/error-codes.ts` holds a repo-level aggregate that *imports* `PROTOCOL_ERROR_CODES` from the `protocol/errors` **leaf** subpath (no cycle; the leaf keeps the ledger/compact-js/onchain-runtime namespaces out of `utils` consumers). New contracts codes therefore go into `CONTRACTS_ERROR_CODES` in `utils`, next to the existing `ERA_INVARIANT_VIOLATION`, and the aggregate picks them up automatically. **Known hazard:** the registry test's expectation list is hand-spelled and has already gone stale once when protocol grew 6 → 12 codes — derive it, do not spell it: `EraArtifactMismatchError`, `Ledger8DeployOnV9Error` (remediation → guide runtime-deploy chapter), `HeadStateEraMismatchError` (QA-3-family, two-step re-run text), `IndexerInconsistencyError` (retry-later text) — each `code` from `CONTRACTS_ERROR_CODES`, each message = what/why/one-next-step.
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
- Consumes: **`loadLedgerEra(head)`** (reads + composition, both eras) and **`loadLedger8Engine()`** (down-convert, execute, wrap) — two independent acquisitions, both at the operation's async start, both threaded down as values; Tasks 3.3/3.4 dispatch; Task 2.4 payload unions; the Task 3.0 Step 1 ruling.
- Produces: the working FR4/FR8 paths behind the existing entry names; single-snapshot invariant (one `queryRawContractState` per operation feeds routing + SEC-5 + execution).
- **The two pipelines differ only in which era object they call.** Keep-state: `era = loadLedgerEra('v9')`, `era.extractState` -> `engine.downConvertForExecution` -> `engine.executeCircuit` -> `engine.wrapKeepStateCall` -> `era.composeCallTx`. V8-native: `era = loadLedgerEra('v8')`, the same chain **minus** the wrap. There is no second composition branch to write.
- **Facade contract to code against** (spec §4.3 — these are the shapes, do not guess them):
  - `ComposeCallOptions.calls` is in **execution-trace order** — cross-contract callees first, root call last; the root omits `communicationCommitmentRandomness` and gets fresh randomness. **The v8 arm composes exactly one call.**
  - `ComposeCallEntry.contractState` is the raw serialized state **as read from chain** — it carries the registered operation and its verifier key. A constructor-built state will not do: its entry points have blank keys.
  - `transcript` is a two-shape union: `{ kind: 'unpartitioned', preState, publicTranscript, partitionContext }` from the retained execution leg, `{ kind: 'partitioned', guaranteed?, fallible? }` from compact-js. Both arms accept both shapes. Pick by where the transcript came from, not by era. A `'partitioned'` value carrying **neither** half now throws (`stage: 'call-transcript-empty'`).
  - **`partitionContext` is REQUIRED on the unpartitioned arm** (#1194 review round) and its sourcing is not symmetric: `block` and `effects` come from the **pre-call** query context — the partitioner recomputes both from the program it replays, so post-call values are counted twice — and `comIndices` from the **post-call** one, because the runtime registers a received coin's commitment as the circuit produces it. Read them off the retained runtime's own context; the 0.16 glue swaps `currentQueryContext` on every coin it registers, so read `block`/`effects` *before* the circuit runs. **Do not re-derive the commitment index** from `zswapLocalState`: `insertCommitment` accepts `-1n` and `2^70` silently, so a re-derived rule fails quietly. Drop it and a coin-receiving circuit is refused with `stage: 'call-partition'`; hand the era something it rejects and you get `stage: 'call-partition-context'`.
  - **Zswap offers are ordinary options on both arms** (OQ19 closed). Build them from `TranscriptPojo.zswapLocalState` via `zswapStateToSegmentedOffer`; undecodable bytes raise `ComposeOptionError` with `option: 'zswapOffer'`.
  - **The three real asymmetries** — the whole delta to code around: (1) the v8 arm composes exactly **one** call, `calls.length > 1` ⇒ `ComposeOptionError` with `option: 'calls'`; (2) `verifierKeys` is **required** on the v8 deploy, and on v9 omissible only for a state that already carries its keys — a still-blank-keyed entry point raises `ComposeOptionError` with `option: 'verifierKeys'`; (3) the two eras emit different serialization tags, so parity is asserted on shape, not bytes.
  - **`ComposeStage` is a closed 14-member union** — read it off `packages/protocol/src/errors.ts` rather than guessing which failures are distinguishable.
  - `composeDeployTx` returns `{ transaction, contractAddress, initialState }`. **Do not derive the deploy address** — a fresh nonce is minted per construction, so the same state deploys to a different address every time and the address cannot be recomputed. Read it off the record.
  - `ComposeDeployOptions.verifierKeys` must name **exactly** the entry points the state declares. Omitting it for a constructor-built state deploys a contract with unregistered entry points.
  - `decodeContractState().entryPoints` is an **array**, not a map (two byte entry points can decode to the same name); `verifierKey`/`verifierKeyHash` are `undefined` for a blank slot, never zero-length.
- [ ] **Step 1: Failing positives:** keep-state — the 0.16 fixture contract completes a post-fork call through the **same unchanged call site** (mock providers; head v9; migrated fixture; proof spy receives V2 selected by key tag; wallet/midnight spies receive whatever the Task 3.0 Step 1 ruling selected -- assert against the ruling, not against v5.2's live-object assumption). v8-native — same contract completes call **and deploy** with a v8 head; wallet/proof/midnight spies receive `{ version: 'v8', txBytes }` and `parseSerializedTag(txBytes).tag` matches the v8 tag at every seam. **The read surface is not the same union:** `VersionedTx<T>` carries `{ version: 'v8', txBytes }` and is narrowed with `unwrapV9(payload, seam)`, but `VersionedFinalizedTxData` (`watchForTxData`, `watchForDeployTxData`) carries `tx` on its v8 arm, not `txBytes`, and is narrowed with a plain `switch (record.version)` — assert the right shape per seam. Build the wallet and midnight doubles with `createWalletProvider` / `createMidnightProvider` from `types` (ADR 0006) rather than tagging payloads by hand. **Note the current state of those seams:** `types` already takes `VersionedTx<T>`, but every v8 arm is **refused** today with `MIDNIGHT_JS_PR_V8_PAYLOAD_UNSUPPORTED` (`unwrapV9`), and `contracts` mirrors that with `requireV9`. Lifting those refusals for the v8 arm is part of this task and of MJS-03 Task 4.4 — coordinate, because a half-lifted seam fails in the middle of a submit. Single-snapshot spy: exactly one `queryRawContractState` per operation, both eras. Era-invariant assert: mocked pipeline emitting a v8-tagged result into the 0.18 return → `ERA_INVARIANT_VIOLATION` typed throw.
- [ ] **Step 2–4:** red → implement (`ledger8-pipeline.ts` orchestrates: fetch snapshot → tag/era check → `era.extractState` → key-set → SEC-5 → `engine.downConvertForExecution` → `engine.executeCircuit` → keep-state only: `engine.wrapKeepStateCall` → `era.composeCallTx`/`composeDeployTx` → prove/balance/submit through the configured providers) → green. **Positive required (replaces the deleted Zswap negative — OQ19 closed):** a coin-moving circuit completes on the v8-native path with the offer built from `TranscriptPojo.zswapLocalState`, and the composed transaction carries the movement in both segments. **Negatives required:** `calls.length > 1` on the v8 arm ⇒ `ComposeOptionError` with `option: 'calls'`; a v8 deploy with no `verifierKeys` ⇒ `ComposeOptionError` with `option: 'verifierKeys'`; a coin-receiving circuit whose `partitionContext.comIndices` are dropped ⇒ `ComposeFailedError` with `stage: 'call-partition'`.
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

> **BLOCKED on the Task 3.0 Step 2 ruling (spec OQ20).** v5.2's rule — "per-call composition stays live `protocol/v8` objects, serialization moves to scope-submit time" — is **not implementable as delivered**: composition returns bytes and `contracts` holds no v8 objects to merge. Write the tests against the ruling, not against the sentence below.

- [ ] **Step 1: Failing tests (spec §4.3 scoped rules):** era resolved **once per scope** at context creation (spy: one head query per scope, not per merged call); mixed 0.16/0.18 calls merged into one scope → `MIXED_ERA_SCOPE` typed error; the v8-head composition behaviour **per the OQ20 ruling** — if the ruling is "out of scope on a v8 head", the test is a typed fail-fast with remediation, and §3 of the spec plus the migration guide must say so; fork mid-scope surfaces as the Task 3.6 stale-head at submit.
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
| — | 3.0 | the OQ19/OQ20/OQ21 rulings, as a spec update on the docs branch (no code, not a PR against `main`) | MJS-01 merged |
| 1005-A | 3.1 | non-regression baselines: sha256 manifest of untouched test files + golden fixtures (dedicated no-production-change PR) | — |
| 1005-B | 3.2 | compile-assertion harness + 0.16 overload typing prototype (closes OQ13 typing item) | 1005-A (era-tag anchors delivered by Plan-1 Task 0.1 — spec v5.2 §4.3) |
| 1005-C | 3.3, 3.4 | era dispatch + fail-fasts; key-set truth table + SEC-5 | 1005-B, cross-plan provider-members PR |
| 1005-D | 3.5 | keep-state + v8-native orchestration through unified entries, driving `loadLedgerEra` + `loadLedger8Engine` | 1005-C, **Task 3.0 Step 1** |
| 1005-E | 3.6, 3.7 | stale-head two-step remediation + deploy branch; scoped-transaction era rules | 1005-D, **Task 3.0 Step 2** |
| 1005-F | 3.8 | breadcrumbs + AC2 error-code meta-test | 1005-E |
