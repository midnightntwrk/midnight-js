# Ledger v8/v9 Dual Support — Implementation Plan Index

**Spec:** `docs/superpowers/specs/2026-07-09-ledger-v8-v9-dual-support-design.md` (v5.2 — OQ13 spike results applied 2026-08-17).
The work is split into four per-ticket plans so each produces working, testable software and small PRs. Each plan repeats the Global Constraints and states the interfaces it consumes from earlier plans; executors read their plan + the spec.

| # | Plan | Ticket | Branch prefix |
|---|------|--------|---------------|
| 1 | [MJS-01 `protocol` dual-ledger seam](./2026-08-17-hf-mjs01-protocol-plan.md) (incl. Phase 0 discovery + `utils` error foundation) | [#1004](https://github.com/midnightntwrk/midnight-js/issues/1004) | `feat/1004-protocol-dual-ledger` |
| 2 | [`types` + `utils` D14 foundation](./2026-08-17-hf-types-d14-foundation-plan.md) | checklist on [#1006](https://github.com/midnightntwrk/midnight-js/issues/1006) | `feat/1006-types-d14-foundation` |
| 3 | [MJS-02 `contracts` unified entries & dispatch](./2026-08-17-hf-mjs02-contracts-plan.md) | [#1005](https://github.com/midnightntwrk/midnight-js/issues/1005) | `feat/1005-contracts-unified-entries` |
| 4 | [MJS-03 providers + integration & hardening](./2026-08-17-hf-mjs03-providers-plan.md) | [#1006](https://github.com/midnightntwrk/midnight-js/issues/1006) | `feat/1006-provider-dual-decode` |

## Dependency graph (PR level)

```
Plan 1 (protocol)                Plan 2 (types/utils)            Plan 3 (contracts)         Plan 4 (providers)
1004-A fixtures ──────────────┐
1004-B version+utils+gates ─┐ │  D14-A api-report gate
1004-C v8 subpath + loadV8 ─┼─┼──D14-B unions+tx-flow ──┐
1004-D engine core ◄────────┘ │                          │
1004-E engine legs (OQ13) ◄───┘        cross-plan PR: 2.3 + 4.1 + 4.2 + mocks (spec §4.4: ONE PR)
                                                         │              │
                              1005-A baselines ──► 1005-B typing ──► 1005-C dispatch ◄──────┘
                              1005-D pipelines (needs 1004-E) ──► 1005-E stale-head/scoped ──► 1005-F breadcrumbs
                                                                        1006-A decode ──► 1006-B seams ──► 1006-D barrel+gates
                                                                        1006-C private-state (needs 1004-E)
                              release-gating: 1006-E integration ──► 1006-F docs (AC9) ──► 1006-G AC0 e2e + harness negatives
```

**The one deliberate cross-plan PR:** spec §4.4 requires the `PublicDataProvider` interface change (plan-2 Task 2.3), every in-repo implementation (plan-4 Tasks 4.1/4.2) and the testkit mocks to land in a single PR. It is listed in both plans and must merge before Plan 3's dispatch work starts.

**OQ-gated (updated 2026-08-17 — Plan-1 Task 0.1 spike RUN):** the blocking OQ13 discovery inputs are delivered (0.16-runtime acquisition mechanism resolved; era-tag discriminators pinned; engine leg + v8 deploy construction confirmed — spec v5.2 §4.1(4)/§4.3). Plan-1 Tasks 1.7/1.8 now wait only on the **D11 engine-placement owner decision** (Task 0.1 Step 2); Plan-3 Task 3.2 has its era-tag/overload anchors and can start once 1005-A lands. A4/A5 remain open upstream (#1005 questions drafted) but gate the dispatch fallback wording, not these tasks. Everything else can start immediately in the plan order above.

**Supersedes:** `docs/plans/2026-08-07-protocol-version-utils.md` + `docs/specs/2026-08-07-protocol-version-utils-design.md` (untracked, main worktree, pre-v5 architecture) — absorbed by Plan 1 Task 1.1.

## Self-review record (ran against spec v5.1; still valid for v5.2 — the OQ13-spike update changed no task/AC mapping, only resolved discovery inputs)

- **Spec coverage:** FR0→plan4/5.3, FR1→1.1, FR2→1.1, FR3→3.3+4.1, FR4→3.5, FR5→1.3+1.4, FR6→4.2+4.3, FR7→3.1+2.2, FR8→1.8+3.5; NFR1→typed errors per task, NFR2→1.3+compile tests, NFR3→two-case switches only, NFR4→registry layering in 1.2, NFR5→dual tests per task, NFR6→1.4+4.3+4.6; AC0→5.3, AC1→1.1/1.4, AC2→3.8, AC3→3.5+4.5, AC4→3.1, AC5→3.2+5.2, AC6→1.3/1.4/4.6, AC7→2.1, AC8→3.8, AC9→5.2. Every §6.2 error path has a creating task and a negative test.
- **Not planned as code (correctly):** OQ7 `migrateState` (Wallet SDK), OQ8 cross-check implementation (lands with its OQ resolution), OQ18 ruling (PO decision).
- **Type consistency:** `LedgerVersion`/`PROTOCOL_ERROR_CODES` (1.1) → 1.2/2.2/3.3/4.1; `parseSerializedTag` (1.2) → 1.8/3.5/3.7/4.2/4.4; `RawContractState` + `queryLatestProtocolVersion(options?)` (2.3) → 3.3/3.6/4.1/4.2; `V8TxBytes` unions (2.4) → 3.5/4.4; `PipelineEra` (3.3) → 3.4/3.5 — names verified consistent across the four files.
