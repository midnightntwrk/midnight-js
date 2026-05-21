# Contracts Package — Governance Separation

**Date:** 2026-05-21
**Status:** Draft — awaiting user review
**Scope:** `packages/contracts/` only

---

## 1. Motivation

`packages/contracts/src/` is a flat directory of 20 top-level `.ts` files mixing three concerns:

1. **Call/deploy operations** — the everyday contract API (`submitCallTx`, `submitDeployTx`, `deployContract`, `findDeployedContract`, etc.).
2. **Governance / maintenance operations** — verifier-key insert/remove and maintenance-authority replacement. These all build an `Intent.addMaintenanceUpdate(...)` and share a distinct mechanism (signing-key flow via `unprovenTxFromContractUpdates`).
3. **Shared infrastructure** — providers, errors, low-level ledger and zswap helpers.

The governance pieces form a real domain boundary (one `Intent` variant, one helper layer, three submit functions, three error classes, two interface families) but are physically scattered across `submit-*.ts`, `tx-interfaces.ts`, `utils/ledger-utils.ts`, and `errors.ts`. The mix obscures the package shape, complicates onboarding, and makes it harder to evolve governance independently.

This refactor co-locates governance under `src/governance/` without changing the public API or behaviour.

## 2. Goals & Non-Goals

### Goals
- Physically group every governance file (sources + tests) under `src/governance/` and `src/test/governance/`.
- Split `tx-interfaces.ts` so call-side and maintenance-side interfaces live apart.
- Move the governance unproven-tx builders out of `utils/ledger-utils.ts`.
- Preserve `@midnight-ntwrk/midnight-js-contracts` public surface byte-for-byte.
- Each step compiles, lints, and tests green in isolation (5 commits, 5 independently-reviewable diffs).

### Non-Goals
- No new package, no new sub-path export, no `package.json` changes.
- No behavioural change. No type signature change. No public symbol renamed.
- No README rewrite (no governance code samples today).
- No fix for the pre-existing gap that `createUnprovenInsertVerifierKeyTx` lacks a direct unit test in `ledger-utils.test.ts` (out of scope; flagged for follow-up).

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Boundary strength | In-package subdirectory only | Lowest risk; no breaking change; leaves room to escalate later |
| Public API | Identical flat re-exports from root `index.ts` | Zero impact on testkit-js-e2e and downstream `midnight-js` namespace consumer |
| Move scope | Full cohesion — submit + interfaces + errors + unproven-tx builders | Verified via grep that builders are only consumed inside this package |

## 4. Target layout

```
packages/contracts/src/
├── governance/
│   ├── index.ts                        # internal barrel for governance/
│   ├── errors.ts                       # InsertVerifierKeyTxFailedError,
│   │                                   # RemoveVerifierKeyTxFailedError,
│   │                                   # ReplaceMaintenanceAuthorityTxFailedError
│   ├── tx-interfaces.ts                # CircuitMaintenanceTxInterface(s),
│   │                                   # ContractMaintenanceTxInterface,
│   │                                   # createCircuit/Contract... factories
│   ├── unproven-tx.ts                  # createUnproven{Insert,Remove}VerifierKeyTx,
│   │                                   # createUnprovenReplaceAuthorityTx,
│   │                                   # unprovenTxFromContractUpdates
│   ├── submit-insert-vk-tx.ts
│   ├── submit-remove-vk-tx.ts
│   └── submit-replace-authority-tx.ts
├── tx-interfaces.ts                    # ONLY CircuitCallTxInterface,
│                                       # createCircuitCallTxInterface,
│                                       # createCallTxOptions
├── errors.ts                           # Non-governance errors: TxFailedError,
│                                       # DeployTxFailedError, CallTxFailedError,
│                                       # ContractTypeError, IncompleteCallTxPrivateStateConfig,
│                                       # IncompleteFindContractPrivateStateConfig,
│                                       # ScopedTransactionIdentityMismatchError,
│                                       # isEffectContractError
├── utils/
│   ├── ledger-utils.ts                 # Keeps toLedger*, fromLedger*,
│   │                                   # extractUserAddressedOutputs,
│   │                                   # createUnprovenLedgerDeployTx,
│   │                                   # createUnprovenLedgerCallTx
│   ├── zswap-utils.ts                  # unchanged
│   └── index.ts                        # drops 4 governance re-exports
├── index.ts                            # re-exports governance flatly
└── (call.ts, call-constructor.ts, deploy-contract.ts, find-deployed-contract.ts,
    submit-call-tx.ts, submit-deploy-tx.ts, submit-tx.ts, transaction.ts,
    unproven-call-tx.ts, unproven-deploy-tx.ts, contract-providers.ts,
    tx-model.ts, get-states.ts, get-unshielded-balances.ts, internal/)

packages/contracts/src/test/
├── governance/
│   ├── submit-insert-vk-tx.test.ts
│   ├── submit-remove-vk-tx.test.ts
│   ├── submit-replace-authority-tx.test.ts
│   ├── tx-interfaces.test.ts           # only maintenance-side assertions
│   └── unproven-tx.test.ts             # 3 governance builder assertions
│                                       # extracted from utils/ledger-utils.test.ts
├── tx-interfaces.test.ts               # only call-side assertions
├── utils/ledger-utils.test.ts          # governance assertions removed
└── (deploy-contract, find-deployed-contract, get-states,
    get-unshielded-balances, submit-call-tx, submit-deploy-tx, submit-tx,
    unproven-call-tx, unproven-deploy-tx, errors, scoped-transaction,
    transaction-identity, enc-pub-key-resolver, test-mocks.ts, resources/)
```

## 5. File-by-file move sheet

### Source moves

| From | To | Import updates inside the file |
|---|---|---|
| `src/submit-insert-vk-tx.ts` | `src/governance/submit-insert-vk-tx.ts` | `./errors` → `./errors` (new file in governance/); `./submit-tx` → `../submit-tx`; `./contract-providers` → `../contract-providers`; `./utils` → `./unproven-tx` |
| `src/submit-remove-vk-tx.ts` | `src/governance/submit-remove-vk-tx.ts` | same pattern |
| `src/submit-replace-authority-tx.ts` | `src/governance/submit-replace-authority-tx.ts` | same pattern |
| Maintenance half of `src/tx-interfaces.ts` (`CircuitMaintenanceTxInterface`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`) | `src/governance/tx-interfaces.ts` (new file) | Imports from `./submit-insert-vk-tx`, `./submit-remove-vk-tx`, `./submit-replace-authority-tx` (sibling in `governance/`); `../contract-providers` |
| `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`, `ReplaceMaintenanceAuthorityTxFailedError` in `src/errors.ts` | `src/governance/errors.ts` (new file) | `import { TxFailedError } from '../errors';` |
| `unprovenTxFromContractUpdates`, `createUnprovenReplaceAuthorityTx`, `createUnprovenRemoveVerifierKeyTx`, `createUnprovenInsertVerifierKeyTx` in `src/utils/ledger-utils.ts` | `src/governance/unproven-tx.ts` (new file) | All shared imports kept (`network-id`, `protocol`, `types`, `utils`) — relative paths inside the package: none referenced |

### Files edited but not moved

| File | Edit |
|---|---|
| `src/tx-interfaces.ts` | Drop maintenance-side types and factories; keep `CircuitCallTxInterface`, `createCircuitCallTxInterface`, `createCallTxOptions` |
| `src/errors.ts` | Drop the 3 governance error classes; keep everything else |
| `src/utils/ledger-utils.ts` | Drop `unprovenTxFromContractUpdates` and the 3 governance unproven-tx builders; keep deploy/call ledger helpers |
| `src/utils/index.ts` | Drop the 4 governance re-exports |
| `src/index.ts` | Replace the governance per-file re-exports with `export * from './governance';` (or explicit symbol list — see §6) |
| `src/deploy-contract.ts` | Imports **factories only**, no types (verified at `deploy-contract.ts:25-29`). After split: `createCircuitCallTxInterface` stays from `./tx-interfaces`; `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` come from `./governance/tx-interfaces` |
| `src/find-deployed-contract.ts` | Imports **types and factories** (verified at `find-deployed-contract.ts:32-39`). After split: `CircuitCallTxInterface`, `createCircuitCallTxInterface` stay from `./tx-interfaces`; `CircuitMaintenanceTxInterfaces`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` come from `./governance/tx-interfaces` |

### Test moves

| From | To |
|---|---|
| `src/test/submit-insert-vk-tx.test.ts` | `src/test/governance/submit-insert-vk-tx.test.ts` |
| `src/test/submit-remove-vk-tx.test.ts` | `src/test/governance/submit-remove-vk-tx.test.ts` |
| `src/test/submit-replace-authority-tx.test.ts` | `src/test/governance/submit-replace-authority-tx.test.ts` |
| Maintenance describe-blocks in `src/test/tx-interfaces.test.ts` (`createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`) | `src/test/governance/tx-interfaces.test.ts` (new file) |
| 3 governance `it(...)` blocks in `src/test/utils/ledger-utils.test.ts` (`unprovenTxFromContractUpdates`, `createUnprovenReplaceAuthorityTx`, `createUnprovenRemoveVerifierKeyTx`) | `src/test/governance/unproven-tx.test.ts` (new file) |

## 6. Public surface preservation

Root `src/index.ts` after the refactor must continue to export, by name and shape:

- From governance/submit-*: `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx`
- From governance/errors: `InsertVerifierKeyTxFailedError`, `RemoveVerifierKeyTxFailedError`, `ReplaceMaintenanceAuthorityTxFailedError`
- From governance/tx-interfaces: `CircuitMaintenanceTxInterface`, `CircuitMaintenanceTxInterfaces`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`

The `createUnproven{Insert,Remove,Replace}…Tx` and `unprovenTxFromContractUpdates` helpers are **not** exported from the package root today (only re-exported from `utils/index.ts` package-internally). Recommendation: keep them package-private — `src/governance/index.ts` exports them so other governance files use them, but root `src/index.ts` does **not** re-export them. The contracts package's public surface stays byte-equivalent.

### Verification approach (tokenized symbol-set diff)

`rollup-plugin-dts` emits the entire public surface on two lines in `dist/index.d.ts`: one `export { ... }` and one `export type { ... }`. Line-level `grep | sort | diff` cannot resolve symbol-level changes inside the braces (verified: the two lines are 871 and 1586 chars respectively, and AST traversal order may shift between branches even when the symbol set is identical). The check must tokenize symbol names.

After step 5:

```bash
# Build the branch dist
yarn build  # from packages/contracts

# Extract a tokenized symbol set from the branch dist
grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\b' dist/index.d.ts | sort -u > /tmp/branch-syms.txt

# Build main in an isolated worktree (dist/ is gitignored)
git worktree add /tmp/contracts-main main
( cd /tmp/contracts-main/packages/contracts && yarn build )
grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\b' /tmp/contracts-main/packages/contracts/dist/index.d.ts | sort -u > /tmp/main-syms.txt
git worktree remove /tmp/contracts-main

# Symbol-level set diff: -3 hides matches, prints only added/removed names
comm -3 /tmp/main-syms.txt /tmp/branch-syms.txt
# expected: empty output (no symbol added, none removed)
```

The tokenizer over-captures (it grabs identifiers from JSDoc comments, type references, parameter names) but that is harmless — the same noise appears on both sides and cancels. Any added/removed *public* name will appear in `comm -3` output.

Simpler day-to-day check during the steps: `yarn build && yarn typecheck:tests` from the monorepo root — TypeScript catches any missing public symbol because the namespace barrel in `packages/midnight-js/src/index.ts` (`export * as contracts from '@midnight-ntwrk/midnight-js-contracts';`) propagates the full surface.

## 7. Test-mock path rewrite table

| File (after move/edit) | Mock change |
|---|---|
| `src/test/governance/submit-insert-vk-tx.test.ts` | `vi.mock('../submit-tx')` → `vi.mock('../../submit-tx')`; `vi.mock('../utils')` → `vi.mock('../../governance/unproven-tx')` |
| `src/test/governance/submit-remove-vk-tx.test.ts` | same |
| `src/test/governance/submit-replace-authority-tx.test.ts` | same |
| `src/test/governance/tx-interfaces.test.ts` (new) | `vi.mock('../../governance/submit-insert-vk-tx')`, `vi.mock('../../governance/submit-remove-vk-tx')`, `vi.mock('../../governance/submit-replace-authority-tx')` |
| `src/test/tx-interfaces.test.ts` (kept, call-only) | Keep only `vi.mock('../submit-call-tx')`. Delete `vi.mock('../submit-insert-vk-tx')`, `vi.mock('../submit-remove-vk-tx')`, `vi.mock('../submit-replace-authority-tx')` — call tests don't touch them |
| `src/test/deploy-contract.test.ts` | Currently mocks `'../tx-interfaces'` with factory exporting `createCircuitCallTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` (line 38). After step 4: split into two `vi.mock` calls — keep `vi.mock('../tx-interfaces', () => ({ createCircuitCallTxInterface }))` and add `vi.mock('../governance/tx-interfaces', () => ({ createCircuitMaintenanceTxInterfaces, createContractMaintenanceTxInterface }))` |
| `src/test/find-deployed-contract.test.ts` | Same factory shape as `deploy-contract.test.ts` (line 31). Apply the same split in step 4. |
| `src/test/utils/ledger-utils.test.ts` | Remove `createUnprovenRemoveVerifierKeyTx`, `createUnprovenReplaceAuthorityTx`, `unprovenTxFromContractUpdates` from the `'../../utils'` import block; delete the 3 corresponding `it(...)` blocks |
| `src/test/governance/unproven-tx.test.ts` (new) | `import { createUnprovenRemoveVerifierKeyTx, createUnprovenReplaceAuthorityTx, unprovenTxFromContractUpdates } from '../../governance/unproven-tx'` |

Side-benefit: the existing `vi.mock('../utils')` was over-broad — it accidentally stubbed `zswap-utils.ts` exports too. The new `vi.mock('../../governance/unproven-tx')` is strictly narrower and more honest.

## 8. Execution sequence (5 commits)

Each step compiles, lints, and tests green before moving to the next.

### Step 1 — Move governance errors

1. Create `src/governance/errors.ts` containing the 3 governance error classes; `import { TxFailedError } from '../errors';`.
2. Delete those 3 classes from `src/errors.ts`.
3. Update `src/index.ts` to re-export them from `./governance/errors` (intermediate; final barrel comes in step 5).
4. Verify no circular import: no file in `src/` outside `governance/` may import from `src/governance/` yet, except `src/index.ts` (which re-exports the moved errors). The compiler enforces this; this is a manual sanity check before relying on it.
5. `yarn build && yarn test && yarn lint`.

**Commit:** `refactor(contracts): move governance error classes to governance/errors.ts`

### Step 2 — Move unproven-tx builders

1. Create `src/governance/unproven-tx.ts` containing `unprovenTxFromContractUpdates`, `createUnprovenReplaceAuthorityTx`, `createUnprovenRemoveVerifierKeyTx`, `createUnprovenInsertVerifierKeyTx` (copy verbatim from `src/utils/ledger-utils.ts`).
2. Delete those 4 functions from `src/utils/ledger-utils.ts`.
3. Update `src/utils/index.ts` re-exports (drop the 4 names).
4. Update `src/submit-insert-vk-tx.ts`, `src/submit-remove-vk-tx.ts`, `src/submit-replace-authority-tx.ts` (still in `src/`): `import … from './utils'` → `import … from './governance/unproven-tx'`.
5. Update the 3 governance submit test files **in place** at `src/test/`:
   - `import … from '../utils'` → `import … from '../governance/unproven-tx'`
   - `vi.mock('../utils')` → `vi.mock('../governance/unproven-tx')`
6. Split `src/test/utils/ledger-utils.test.ts`:
   - Remove the 3 governance helpers from the `'../../utils'` import block.
   - Delete the `unprovenTxFromContractUpdates`, `createUnprovenRemoveVerifierKeyTx`, `createUnprovenReplaceAuthorityTx` `it(...)` blocks.
   - Create `src/test/governance/unproven-tx.test.ts` with the extracted assertions, importing from `'../../governance/unproven-tx'`.
7. `yarn build && yarn test && yarn lint`.

**Commit:** `refactor(contracts): move governance unproven-tx builders to governance/unproven-tx.ts`

### Step 3 — Move submit-* sources and their tests

1. Move `src/submit-insert-vk-tx.ts`, `src/submit-remove-vk-tx.ts`, `src/submit-replace-authority-tx.ts` into `src/governance/`.
2. Fix relative imports inside the moved files: `./submit-tx` → `../submit-tx`; `./contract-providers` → `../contract-providers`; `./errors` → `./errors` (new sibling in `governance/`); `./governance/unproven-tx` → `./unproven-tx`.
3. Update `src/index.ts` re-exports to point at `./governance/submit-*` (still intermediate; final barrel in step 5).
4. Move `src/test/submit-{insert-vk,remove-vk,replace-authority}-tx.test.ts` into `src/test/governance/`.
5. In each moved test file: every relative path gains one extra `../`; per §7 table.
6. `yarn build && yarn test && yarn lint`.

**Commit:** `refactor(contracts): move governance submit-tx files to governance/`

### Step 4 — Split `tx-interfaces.ts`

1. Create `src/governance/tx-interfaces.ts` containing `CircuitMaintenanceTxInterface`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`. Imports from sibling `./submit-insert-vk-tx`, `./submit-remove-vk-tx`, `./submit-replace-authority-tx`, and `../contract-providers`.
2. Delete those symbols from `src/tx-interfaces.ts`; verify only `CircuitCallTxInterface`, `createCircuitCallTxInterface`, `createCallTxOptions` remain.
3. Update `src/deploy-contract.ts`: split its `./tx-interfaces` import into two — `createCircuitCallTxInterface` from `./tx-interfaces`; `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` from `./governance/tx-interfaces`.
4. Update `src/find-deployed-contract.ts`: split its `./tx-interfaces` import into two — `CircuitCallTxInterface`, `createCircuitCallTxInterface` from `./tx-interfaces`; `CircuitMaintenanceTxInterfaces`, `ContractMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` from `./governance/tx-interfaces`.
5. **Update `src/test/deploy-contract.test.ts`**: replace the single `vi.mock('../tx-interfaces', () => ({ createCircuitCallTxInterface, createCircuitMaintenanceTxInterfaces, createContractMaintenanceTxInterface }))` with two `vi.mock` calls — one for `'../tx-interfaces'` (call factory only), one for `'../governance/tx-interfaces'` (maintenance factories). Without this, the source's new import path bypasses the mock and the real module loads.
6. **Update `src/test/find-deployed-contract.test.ts`**: same split as step 4.5.
7. Update `src/index.ts` re-exports to surface the maintenance symbols from `./governance/tx-interfaces`.
8. Create `src/test/governance/tx-interfaces.test.ts` with the maintenance describe-blocks extracted from `src/test/tx-interfaces.test.ts` (`createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`).
9. In the new test, mocks become `vi.mock('../../governance/submit-{insert,remove,replace…}-tx')`. Relative imports become `'../../governance/tx-interfaces'`, `'../test-mocks'` → `'../../test-mocks'`.
10. In the kept `src/test/tx-interfaces.test.ts` (call-only): delete the 3 maintenance describe-blocks and the corresponding 3 `vi.mock(...)` calls. Keep `vi.mock('../submit-call-tx')`.
11. `yarn build && yarn test && yarn lint`.

**Commit:** `refactor(contracts): split tx-interfaces into call (kept) and governance/tx-interfaces`

### Step 5 — Final barrel cleanup

1. Create `src/governance/index.ts` with `export *` for: `./errors`, `./submit-insert-vk-tx`, `./submit-remove-vk-tx`, `./submit-replace-authority-tx`, `./tx-interfaces`. **Do not** export `./unproven-tx` (kept package-private).
2. Replace the per-file governance re-exports in `src/index.ts` with an **explicit list** of the 12 public governance symbols (3 submit functions, 3 errors, 6 interface types/factories), all sourced from `./governance`. Explicit list — not `export * from './governance'` — to keep `dist/index.d.ts` deterministic across builds and to make the public-surface diff in §6 stable.
3. Run the public-surface diff in §6; expect no output.
4. Sweep the repo: `rg "vi.mock\('\.\./utils'\)"` — confirm zero matches that previously relied on governance auto-mocking.
5. `yarn build && yarn test && yarn lint`. Run `yarn check:core` from the monorepo root.

**Commit:** `refactor(contracts): add governance barrel and finalize index.ts re-exports`

## 9. Risks & mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| `vi.mock(path)` strings rot during move | High | Mock-path rewrite table in §7 is exhaustive; sweep at step 5 catches stragglers |
| Circular import: `governance/errors.ts` ↔ `src/errors.ts` | Low | One-way only: `governance/errors.ts` imports `TxFailedError` from `../errors`. Verified no reverse import exists today. |
| `dist/index.*` symbol set drifts | Medium | Step-5 diff check against `main` (command in §6). CI also catches via downstream package tests. |
| Rollup config breaks on new directory | Very low | Confirmed `rollup.config.mjs` uses the shared factory `createRollupConfig(packageJson)` with no file globbing |
| Typedoc grouping changes | Low | Public surface preserved; typedoc renders the same root exports. Verify after step 5 build. |
| `find-deployed-contract.ts` / `deploy-contract.ts` consumer break | Medium | Explicitly addressed in step 4. Tests for both files exist and will catch a wrong import split. |
| `createUnprovenInsertVerifierKeyTx` has no direct unit test today | n/a (pre-existing) | Not introduced by this refactor. Flag for a separate ticket. |

## 10. Out of scope

- No package boundary changes (no new workspace, no new sub-path export).
- `utils/zswap-utils.ts` stays put.
- `internal/transaction.ts` stays put.
- No public-API rename. No deprecation. No type signature change.
- No new tests beyond the extractions described above.

## 11. Success criteria

1. All 5 commits land green: build + lint + unit tests + `yarn check:core` pass at every step.
2. `dist/index.d.ts` exported-name set on the branch matches `main` (diff per §6 produces no output).
3. `packages/contracts/src/governance/` contains exactly: `index.ts`, `errors.ts`, `tx-interfaces.ts`, `unproven-tx.ts`, `submit-insert-vk-tx.ts`, `submit-remove-vk-tx.ts`, `submit-replace-authority-tx.ts`.
4. `packages/contracts/src/test/governance/` contains exactly: `submit-insert-vk-tx.test.ts`, `submit-remove-vk-tx.test.ts`, `submit-replace-authority-tx.test.ts`, `tx-interfaces.test.ts`, `unproven-tx.test.ts`.
5. `rg "vi.mock\('\.\./utils'\)" packages/contracts/src` returns no matches that target the moved governance helpers (deploy/call helpers may legitimately remain mocked there).
6. No source file in `packages/contracts/src/` outside `governance/` imports a governance internal via a sibling-relative path. Verifiable with an anchored regex that excludes test paths (which legitimately use `'../../governance/...'`):

   ```bash
   rg --type ts -g '!**/test/**' "from '\./governance/" packages/contracts/src
   ```

   Expected matches only in `src/index.ts`, `src/deploy-contract.ts`, `src/find-deployed-contract.ts`.
7. Testkit-js-e2e governance tests (`contracts.snarkupgrade.*.it.test.ts`) compile and run unchanged.
