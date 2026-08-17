# HF v8/v9 — Plan 2 of 4: `types` + `utils` D14 Foundation (prereq for #1005/#1006)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The consumer-breaking D14 type surface: `LedgerVersion`-discriminated read-surface unions, the two new `PublicDataProvider` members, version-tagged tx-flow payloads — guarded by the API-report gate that lands FIRST.

**Architecture:** Unions apply only where either era genuinely arrives (provider read surfaces + the 0.16 overload's return); the 0.18 return path keeps today's plain v9 shape (spec §4.5). The `.d.ts` API-report gate exists before the first breaking change so the breaking set is exactly the documented allowlist (AC7).

**Tech Stack:** TypeScript 6, @microsoft/api-extractor over rollup-dts output, vitest 4 + expectTypeOf compile tests.

**Spec:** `docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (v5.2) — §4.4 (types bullet), §4.5, AC7.

**Ticket:** tracked as a checklist on [#1006](https://github.com/midnightntwrk/midnight-js/issues/1006) (shared prereq of #1005 and #1006). Branch: `feat/1006-types-d14-foundation`.

**Order is mandatory:** Task 2.1 (gate) before Tasks 2.2–2.4. Task 2.3 ships in a **cross-plan PR** — see PR slicing.

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

## Phase 2 — `types` + `utils` D14 foundation (prereq for #1005/#1006; tracked on #1006)

Branch: `feat/1006-types-d14-foundation`. **Order inside the phase is mandatory: the API-report gate lands before the first breaking type change.**

### Task 2.1: AC7 API-report gate (tooling first — TDD at the CI level)

**Files:**
- Create: `build-tools/api-report/` (extractor config + checked-in baseline reports for `types` and the `midnight-js` barrel), CI job in `.github/workflows/` alongside build+lint+test
- Modify: `packages/types/package.json`, `packages/midnight-js/package.json` (report scripts)

- [ ] **Step 1:** Choose the tool: `@microsoft/api-extractor` over the existing rollup-dts output (`dist/index.d.ts` — already single-file, extractor-friendly).
- [ ] **Step 2:** Generate and **commit the baseline on current `main` types** (before any D14 edit — the gate must exist before the breaking change).
- [ ] **Step 3:** CI job: regenerate report, `git diff --exit-code` against the checked-in baseline; a documented-breaking-set allowlist file `build-tools/api-report/allowed-breaking.md` — any diff entry not listed there fails CI.
- [ ] **Step 4:** Verify the gate fires: locally add a dummy export to `types`, watch CI-equivalent script fail, revert. **Step 5: Commit** — `ci: add .d.ts API-report gate for types and barrel (AC7)`.

### Task 2.2: D14 unions + version-truth invariant in `types`

**Files:**
- Create: `packages/types/src/versioned.ts`, `packages/types/src/test/versioned.test.ts`
- Modify: `packages/types/src/midnight-types.ts` (FinalizedTxData gains `version: 'v9'`), `packages/types/src/index.ts`

**Interfaces:**
- Produces (the documented D14 breaking set — mirrored in the Task 2.1 allowlist):
  ```ts
  import type { LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
  import type { Transaction as V8Transaction } from '@midnight-ntwrk/midnight-js-protocol/v8'; // type-only — erased

  export interface FinalizedTxData { readonly version: 'v9'; /* + every existing field, unchanged */ }
  export interface FinalizedTxDataV8 {
    readonly version: 'v8';
    readonly tx: V8Transaction;            // read-path arms carry live protocol/v8 objects (§4.5)
    /* + the same metadata fields: status, txId, txHash, blockHash, blockHeight,
       blockTimestamp, blockAuthor, indexerId, protocolVersion, fees, segmentStatusMap, unshielded, identifiers */
  }
  export type VersionedFinalizedTxData = FinalizedTxDataV8 | FinalizedTxData;

  export const versionOf: (protocolVersion: number) => LedgerVersion;  // re-export of versionOfRecord shape — single construction point helper
  ```
- **Version-truth invariant:** on every arm `version === protocolVersionToLedger(protocolVersion, 'read')`; `version` is set at exactly one construction point per provider; testkit mocks assert it (Task 4.6).

- [ ] **Step 1: Failing compile-level tests** (vitest + `expectTypeOf`): exhaustive `switch` over `VersionedFinalizedTxData` with `assertNever` compiles; wrong-arm access (`data.tx` before narrowing when arm types differ) is a compile error (`@ts-expect-error`); `FinalizedTxData` (v9) is assignable where it was before (FR7 — the 0.18 return path keeps today's shape plus the literal field).
- [ ] **Step 2–4:** red → implement → green; update the Task 2.1 allowlist with exactly these entries; API-report diff must show nothing else.
- [ ] **Step 5: Commit** — `feat(midnight-js)!: add LedgerVersion-discriminated read-surface unions (D14)`.

### Task 2.3: `PublicDataProvider` — the two new members

**Files:**
- Modify: `packages/types/src/public-data-provider.ts`
- Create: `packages/types/src/raw-contract-state.ts`

**Interfaces:**
- Produces (implementer-facing breaking — all in-repo implementations + testkit mocks update in the same PR as Task 4.1/4.2):
  ```ts
  export interface RawContractState {
    readonly version: LedgerVersion;        // derived: protocolVersionToLedger(protocolVersion, 'read')
    readonly protocolVersion: number;
    readonly raw: Uint8Array;               // serialized state, either envelope, pre-parse
  }
  export interface PublicDataProvider {
    /* ...all 13 existing members unchanged... */
    /** Head query (FR3). Implementer contract (D16): MAY cache once v9 is corroborated
     *  (route 1: same-composed-snapshot v9 envelope; route 2: self-decoded v9-era finalized record);
     *  MUST NOT cache pre-v9; `{ fresh: true }` MUST bypass any cache (QA-3 + mismatch re-read). */
    queryLatestProtocolVersion(options?: { readonly fresh?: boolean }): Promise<number>;
    /** Raw single-snapshot state (both envelopes) — the execution paths' only state input. */
    queryRawContractState(contractAddress: ContractAddress, config?: BlockHeightConfig | BlockHashConfig): Promise<RawContractState | null>;
  }
  ```
- [ ] **Steps:** failing compile test (an object implementing the old interface no longer satisfies it — `@ts-expect-error`), implement, allowlist the two members in the API report, commit `feat(midnight-js)!: add head-version and raw-state queries to PublicDataProvider (FR3/FR6)`.

### Task 2.4: version-tagged tx-flow payloads

**Files:**
- Modify: `packages/types/src/proof-provider.ts`, `packages/types/src/wallet-provider.ts`, `packages/types/src/midnight-provider.ts`

**Interfaces:**
- Produces (v8 arm = tag-prefixed bytes request AND response, §4.5; v9 arm = today's live objects):
  ```ts
  export interface V8TxBytes { readonly version: 'v8'; readonly txBytes: Uint8Array; }
  export type VersionedUnprovenTransaction  = V8TxBytes | { readonly version: 'v9'; readonly tx: UnprovenTransaction };
  export type VersionedUnboundTransaction   = V8TxBytes | { readonly version: 'v9'; readonly tx: UnboundTransaction };
  export type VersionedFinalizedTransaction = V8TxBytes | { readonly version: 'v9'; readonly tx: FinalizedTransaction };

  export interface ProofProvider   { proveTx(tx: VersionedUnprovenTransaction, config?: ProveTxConfig): Promise<VersionedUnboundTransaction>; }
  export interface WalletProvider  { balanceTx(tx: VersionedUnboundTransaction, ttl?: Date): Promise<VersionedFinalizedTransaction>; getCoinPublicKey(): CoinPublicKey; getEncryptionPublicKey(): EncPublicKey; }
  export interface MidnightProvider { submitTx(tx: VersionedFinalizedTransaction): Promise<TransactionId>; }
  ```
- [ ] **Steps:** compile tests (exhaustive switch + `assertNever` on each union; naked `Uint8Array` is not assignable — always the union object), implement, allowlist, commit `feat(midnight-js)!: version-tag the proveTx/balanceTx/submitTx payloads (D14)`.

---


---

## PR slicing

| PR | Tasks | Contents | Depends on |
|----|-------|----------|-----------|
| D14-A | 2.1 | API-report tooling + committed baseline on current `main` types (gate before breaking change) | — |
| D14-B | 2.2, 2.4 | read-surface unions + version-tagged tx-flow payloads; in-repo compile fixes; allowlist entries | D14-A, plan-1 PR 1004-B (`LedgerVersion`) |
| **cross-plan** | 2.3 + MJS-03 Tasks 4.1, 4.2 + testkit mocks | the `PublicDataProvider` member additions — spec §4.4 requires the interface change, every in-repo implementation and the testkit mocks in ONE PR | D14-B |

The cross-plan PR is listed in both this plan and the MJS-03 plan; implement it from the MJS-03 plan's task bodies (4.1/4.2), with this plan's Task 2.3 as the interface contract. It must merge BEFORE the MJS-02 plan starts (contracts tests consume the updated mocks).
