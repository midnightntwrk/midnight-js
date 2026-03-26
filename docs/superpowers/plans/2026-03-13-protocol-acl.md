# Protocol Anti-Corruption Layer (ACL) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a `packages/protocol` adapter package that re-exports all types from `@midnight-ntwrk/ledger-v7`, `@midnight-ntwrk/compact-runtime`, and `@midnight-ntwrk/onchain-runtime-v2`, so the rest of the monorepo never imports these directly. Migrating between protocol versions becomes a one-file change.

**Architecture:** Create `@midnight-ntwrk/midnight-js-protocol` — a thin re-export barrel that owns the entire Midnight protocol type surface. All ~80 source files currently importing from these three packages are rewritten to import from `@midnight-ntwrk/midnight-js-protocol`. No logic, no wrappers — pure re-exports.

**Tech Stack:** TypeScript, Rollup (same build config as other packages), Yarn workspaces

**Base branch:** `main`

---

## Why

These three external packages are highly coupled — they upgrade together on every Midnight network release. Currently:
- `@midnight-ntwrk/compact-runtime` is imported in **~41 source files** across 8 packages
- `@midnight-ntwrk/ledger-v7` is imported in **~51 source files** across 6 packages
- `@midnight-ntwrk/onchain-runtime-v2` is imported in **1 file** in 1 package
- Many files import from **both** compact-runtime and ledger-v7

With a unified ACL:
- Future protocol upgrades touch **1 barrel file** (`packages/protocol/src/index.ts`) + **1 `package.json`**
- The SDK owns its public type surface — protocol packages are implementation details
- No ambiguity about which ACL to import from (e.g., `ContractAddress` exists in both compact-runtime and ledger-v7)
- Easier to unit-test with mocks if needed

---

## Jira Ticket

**Title:** Introduce Protocol ACL package to decouple SDK from direct Midnight protocol imports

**Type:** Tech Debt / Refactoring

**Priority:** Medium

**Description:**

Currently, the midnight-js SDK imports types and values directly from three Midnight protocol packages (`@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/ledger-v7`, `@midnight-ntwrk/onchain-runtime-v2`) across ~80 source files in 9 internal packages. Every protocol version upgrade requires a mechanical find-and-replace across all of them.

**Proposal:** Create a new internal package `@midnight-ntwrk/midnight-js-protocol` that acts as a thin re-export barrel for all protocol types. All internal SDK packages import from this single ACL instead of directly from protocol packages. An ESLint rule enforces this boundary.

**Impact:**
- Future protocol migrations (e.g., `ledger-v7` → `ledger-v8`, `compact-runtime` 0.14 → 0.15) go from ~80-file changes to a 2-file change (barrel + package.json)
- Zero logic changes — pure import path refactoring
- Zero runtime behavior changes
- Fully backward-compatible (no public API changes)

**Acceptance Criteria:**
- [ ] `@midnight-ntwrk/midnight-js-protocol` package exists with barrel re-exports from all 3 protocol packages
- [ ] No internal package imports directly from `@midnight-ntwrk/ledger-v*`, `@midnight-ntwrk/compact-runtime`, or `@midnight-ntwrk/onchain-runtime-v*` (except auto-generated `.d.ts` files from Compact compiler)
- [ ] ESLint rule enforces the import boundary
- [ ] All existing tests pass
- [ ] Full monorepo builds successfully

---

## Inventory

### External packages wrapped

| Package | Version | Files importing | Unique symbols |
|---------|---------|----------------|----------------|
| `@midnight-ntwrk/compact-runtime` | 0.14.0 | ~41 | ~10 |
| `@midnight-ntwrk/ledger-v7` | 7.0.0 | ~51 | ~35 |
| `@midnight-ntwrk/onchain-runtime-v2` | 2.0.1 | 1 | 1 |

### Symbols from `compact-runtime` (re-export as type)
```
AlignedValue, CoinPublicKey, ContractAddress, ContractState, Op,
Recipient, SigningKey, StateValue, WitnessContext, ZswapLocalState
```

### Symbols from `compact-runtime` (re-export as value)
```
ContractState, sampleContractAddress, sampleSigningKey, StateValue
```

### Symbols from `ledger-v7` (re-export as type)
```
AlignedValue, Binding, Bindingish, CoinPublicKey, ContractAddress,
ContractState, CostModel, DustSecretKey, EncPublicKey, FinalizedTransaction,
IntentHash, LedgerParameters, LedgerState, PartitionedTranscript, Proof,
Proofish, ProvingProvider, RawTokenType, ShieldedCoinInfo, SignatureEnabled,
SigningKey, Signaturish, TokenType, TransactionHash, TransactionId,
UnprovenTransaction, ZswapChainState, ZswapOffer, ZswapSecretKeys,
ZswapTransient
```

### Symbols from `ledger-v7` (re-export as value)
```
CostModel, DustSecretKey, LedgerParameters, LedgerState, ContractState,
sampleContractAddress, shieldedToken, Transaction, ZswapChainState,
ZswapSecretKeys
```

### Symbols from `onchain-runtime-v2` (re-export as value)
```
ChargedState
```

### Consumers by package

| Package | compact-runtime files | ledger-v7 files | onchain-runtime files | Total |
|---------|----------------------|-----------------|----------------------|-------|
| `packages/types` | 2 | 6 | 0 | 8 |
| `packages/contracts` | 18 | 20 | 1 | 39 |
| `packages/http-client-proof-provider` | 1 | 4 | 0 | 5 |
| `packages/indexer-public-data-provider` | 1 | 2 | 0 | 3 |
| `packages/level-private-state-provider` | 2 | 0 | 0 | 2 |
| `packages/utils` | 1 | 0 | 0 | 1 |
| `testkit-js/testkit-js` | 3 | 7 | 0 | 10 |
| `testkit-js/testkit-js-e2e` | 13 | 12 | 0 | 25 |

> **Note:** Auto-generated `.d.ts` files from Compact compiler (e.g., `testkit-js/testkit-js-e2e/src/contract/compiled/*/contract/index.d.ts`) import `compact-runtime` directly and are **excluded** — these are generated code, not hand-written source.

---

## Task 1: Scaffold `packages/protocol` package

**Files:**
- Create: `packages/protocol/package.json`
- Create: `packages/protocol/tsconfig.json`
- Create: `packages/protocol/tsconfig.build.json`
- Create: `packages/protocol/rollup.config.mjs`

**Step 1: Create `package.json`**

```json
{
  "name": "@midnight-ntwrk/midnight-js-protocol",
  "version": "0.1.0",
  "description": "Protocol type re-exports for midnight-js SDK",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.cts",
        "default": "./dist/cjs/index.cjs"
      }
    }
  },
  "files": [
    "dist/"
  ],
  "scripts": {
    "build": "rollup -c rollup.config.mjs",
    "lint": "eslint src/",
    "deploy": "yarn npm publish"
  },
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "0.14.0",
    "@midnight-ntwrk/ledger-v7": "7.0.0",
    "@midnight-ntwrk/onchain-runtime-v2": "2.0.1"
  }
}
```

> **Note:** Copy `tsconfig.json`, `tsconfig.build.json`, and `rollup.config.mjs` from an existing simple package like `packages/utils`. Adjust `input` path to `src/index.ts`.

**Step 2: Register in turbo pipeline**

Verify `turbo.json` auto-discovers workspace packages (it should — no changes needed if using standard `"packages/*"` glob in root `package.json` workspaces).

Check root `package.json` workspaces field includes `packages/*`.

**Step 3: Commit**

```bash
git add packages/protocol/
git commit -m "chore: scaffold @midnight-ntwrk/midnight-js-protocol package"
```

---

## Task 2: Create the barrel re-export file

**Files:**
- Create: `packages/protocol/src/index.ts`

**Step 1: Write the re-export barrel**

The barrel has three sections — one per wrapped package. Symbol collisions between packages (e.g., `ContractAddress` exists in both compact-runtime and ledger-v7) must be resolved: pick one canonical source and comment the decision.

```typescript
// =============================================================================
// @midnight-ntwrk/compact-runtime re-exports
// =============================================================================

export type {
  Op,
  Recipient,
  WitnessContext,
  ZswapLocalState,
} from '@midnight-ntwrk/compact-runtime';

export {
  StateValue,
} from '@midnight-ntwrk/compact-runtime';

// =============================================================================
// @midnight-ntwrk/ledger-v7 re-exports
// =============================================================================

export type {
  AlignedValue,
  Binding,
  Bindingish,
  CoinPublicKey,
  ContractAddress,
  ContractState,
  DustSecretKey,
  EncPublicKey,
  FinalizedTransaction,
  IntentHash,
  LedgerParameters,
  LedgerState,
  PartitionedTranscript,
  Proof,
  Proofish,
  ProvingProvider,
  RawTokenType,
  ShieldedCoinInfo,
  SignatureEnabled,
  SigningKey,
  Signaturish,
  TokenType,
  TransactionHash,
  TransactionId,
  UnprovenTransaction,
  ZswapOffer,
  ZswapSecretKeys,
  ZswapTransient,
} from '@midnight-ntwrk/ledger-v7';

export {
  CostModel,
  sampleContractAddress,
  sampleCoinPublicKey,
  sampleDustSecretKey,
  sampleEncryptionPublicKey,
  sampleSigningKey,
  shieldedToken,
  Transaction,
  ZswapChainState,
} from '@midnight-ntwrk/ledger-v7';

// =============================================================================
// @midnight-ntwrk/onchain-runtime-v2 re-exports
// =============================================================================

export { ChargedState } from '@midnight-ntwrk/onchain-runtime-v2';
```

> **Important:** This is the ONLY file in the entire monorepo that should import from `@midnight-ntwrk/ledger-v7`, `@midnight-ntwrk/compact-runtime`, or `@midnight-ntwrk/onchain-runtime-v2` after migration. If a symbol is missing, add it here — never import from protocol packages directly.

> **Symbol collision note:** Types like `ContractAddress`, `ContractState`, `SigningKey`, `CoinPublicKey`, `AlignedValue` exist in both `compact-runtime` and `ledger-v7`. During implementation, verify which source each consumer actually needs (they may be the same underlying type re-exported by both). Pick one canonical source per symbol and ensure all consumers compile. If the types differ, use aliased re-exports (e.g., `export type { ContractAddress as CompactContractAddress } from compact-runtime`).

**Step 2: Build and verify**

Run: `cd packages/protocol && yarn build`
Expected: Successful build with `dist/` output

**Step 3: Commit**

```bash
git add packages/protocol/src/
git commit -m "feat: add protocol re-export barrel"
```

---

## Task 3: Add `@midnight-ntwrk/midnight-js-protocol` as dependency to consumer packages

**Files:**
- Modify: `packages/types/package.json`
- Modify: `packages/contracts/package.json`
- Modify: `packages/http-client-proof-provider/package.json`
- Modify: `packages/indexer-public-data-provider/package.json`
- Modify: `packages/level-private-state-provider/package.json`
- Modify: `packages/utils/package.json`
- Modify: `testkit-js/testkit-js/package.json`
- Modify: `testkit-js/testkit-js-e2e/package.json`

**Step 1: Add workspace dependency to each package**

In each `package.json` above, add to `dependencies`:
```json
"@midnight-ntwrk/midnight-js-protocol": "workspace:*"
```

Do NOT remove direct protocol deps yet — that happens in Task 10 after migration is verified.

**Step 2: Run yarn install**

Run: `yarn install`
Expected: Clean install, no resolution errors

**Step 3: Commit**

```bash
git add packages/*/package.json testkit-js/*/package.json yarn.lock
git commit -m "chore: add midnight-js-protocol dependency to consumer packages"
```

---

## Task 4: Migrate `packages/types` (8 files)

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `packages/types/src/midnight-types.ts`
- Modify: `packages/types/src/midnight-provider.ts`
- Modify: `packages/types/src/proof-provider.ts`
- Modify: `packages/types/src/public-data-provider.ts`
- Modify: `packages/types/src/wallet-provider.ts`
- Modify: `packages/types/src/private-state-provider.ts`

**Step 1: Replace all protocol imports with `@midnight-ntwrk/midnight-js-protocol`**

Replace:
- `from '@midnight-ntwrk/ledger-v7'` → `from '@midnight-ntwrk/midnight-js-protocol'`
- `from '@midnight-ntwrk/compact-runtime'` → `from '@midnight-ntwrk/midnight-js-protocol'`

Where a file imports from **both** packages, merge into a single import from `@midnight-ntwrk/midnight-js-protocol`.

**Step 2: Build**

Run: `yarn turbo run build --filter=@midnight-ntwrk/midnight-js-types`
Expected: Successful build

**Step 3: Run tests**

Run: `yarn turbo run test --filter=@midnight-ntwrk/midnight-js-types`
Expected: All tests pass

**Step 4: Lint**

Run: `yarn turbo run lint --filter=@midnight-ntwrk/midnight-js-types`
Expected: No lint errors

**Step 5: Commit**

```bash
git add packages/types/src/
git commit -m "refactor: migrate packages/types to midnight-js-protocol"
```

---

## Task 5: Migrate `packages/contracts` (39 files — heaviest consumer)

**Files:**
All `.ts` files in `packages/contracts/src/` and `packages/contracts/src/test/` that import from any of the three protocol packages.

Source files (imports from compact-runtime and/or ledger-v7):
```
packages/contracts/src/call.ts
packages/contracts/src/call-constructor.ts
packages/contracts/src/deploy-contract.ts
packages/contracts/src/errors.ts
packages/contracts/src/find-deployed-contract.ts
packages/contracts/src/get-states.ts
packages/contracts/src/get-unshielded-balances.ts
packages/contracts/src/submit-insert-vk-tx.ts
packages/contracts/src/submit-remove-vk-tx.ts
packages/contracts/src/submit-replace-authority-tx.ts
packages/contracts/src/submit-tx.ts
packages/contracts/src/tx-interfaces.ts
packages/contracts/src/tx-model.ts
packages/contracts/src/unproven-call-tx.ts
packages/contracts/src/unproven-deploy-tx.ts
packages/contracts/src/utils/ledger-utils.ts
packages/contracts/src/utils/zswap-utils.ts
packages/contracts/src/internal/transaction.ts  (onchain-runtime-v2)
```

Test files:
```
packages/contracts/src/test/deploy-contract.test.ts
packages/contracts/src/test/find-deployed-contract.test.ts
packages/contracts/src/test/get-states.test.ts
packages/contracts/src/test/get-unshielded-balances.test.ts
packages/contracts/src/test/submit-call-tx.test.ts
packages/contracts/src/test/submit-deploy-tx.test.ts
packages/contracts/src/test/test-mocks.ts
packages/contracts/src/test/unproven-call-tx.test.ts
packages/contracts/src/test/utils/ledger-utils.test.ts
packages/contracts/src/test/utils/zswap-utils.test.ts
```

**Step 1: Find-and-replace import source**

Replace:
- `from '@midnight-ntwrk/ledger-v7'` → `from '@midnight-ntwrk/midnight-js-protocol'`
- `from '@midnight-ntwrk/compact-runtime'` → `from '@midnight-ntwrk/midnight-js-protocol'`
- `from '@midnight-ntwrk/onchain-runtime-v2'` → `from '@midnight-ntwrk/midnight-js-protocol'`

Where a file imports from **multiple** protocol packages, merge into a single import.

Also replace:
- `vi.mock('@midnight-ntwrk/compact-runtime')` → `vi.mock('@midnight-ntwrk/midnight-js-protocol')`
- `vi.mock('@midnight-ntwrk/ledger-v7')` → `vi.mock('@midnight-ntwrk/midnight-js-protocol')`
- `vi.importActual('@midnight-ntwrk/ledger-v7')` → `vi.importActual('@midnight-ntwrk/midnight-js-protocol')`

> **Warning for vi.mock:** When two separate `vi.mock()` calls for compact-runtime and ledger-v7 exist in the same test file (e.g., `submit-deploy-tx.test.ts`), they must be merged into a single `vi.mock('@midnight-ntwrk/midnight-js-protocol')` with combined mock implementations. This requires careful manual review — do NOT blindly find-and-replace.

**Step 2: Build**

Run: `yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts`
Expected: Successful build

**Step 3: Run tests**

Run: `yarn turbo run test --filter=@midnight-ntwrk/midnight-js-contracts`
Expected: All tests pass

**Step 4: Lint**

Run: `yarn turbo run lint --filter=@midnight-ntwrk/midnight-js-contracts`
Expected: No lint errors

**Step 5: Commit**

```bash
git add packages/contracts/
git commit -m "refactor: migrate packages/contracts to midnight-js-protocol"
```

---

## Task 6: Migrate `packages/http-client-proof-provider` (5 files)

**Files:**
- Modify: `packages/http-client-proof-provider/src/http-client-proof-provider.ts` (ledger-v7)
- Modify: `packages/http-client-proof-provider/src/http-client-proving-provider.ts` (ledger-v7)
- Modify: `packages/http-client-proof-provider/src/test/commons.ts` (compact-runtime + ledger-v7)
- Modify: `packages/http-client-proof-provider/src/test/http-client-proving-provider.test.ts` (ledger-v7 + vi.mock + vi.importActual)

**Step 1: Replace imports (same pattern as Task 5)**

Special attention to `http-client-proving-provider.test.ts` which uses `vi.mock` and `vi.importActual` with ledger-v7 — update both to `@midnight-ntwrk/midnight-js-protocol`. Also update `import * as ledger from '@midnight-ntwrk/ledger-v7'` namespace import.

**Step 2: Build, test, lint**

Run: `yarn turbo run build test lint --filter=@midnight-ntwrk/midnight-js-http-client-proof-provider`

**Step 3: Commit**

```bash
git add packages/http-client-proof-provider/
git commit -m "refactor: migrate http-client-proof-provider to midnight-js-protocol"
```

---

## Task 7: Migrate `packages/indexer-public-data-provider` (2 files)

**Files:**
- Modify: `packages/indexer-public-data-provider/src/indexer-public-data-provider.ts` (compact-runtime + ledger-v7)
- Modify: `packages/indexer-public-data-provider/src/test/indexer-public-data-provider-unshielded-balances.test.ts` (ledger-v7)

**Step 1: Replace imports — merge dual imports into one**

**Step 2: Build, test, lint**

Run: `yarn turbo run build test lint --filter=@midnight-ntwrk/midnight-js-indexer-public-data-provider`

**Step 3: Commit**

```bash
git add packages/indexer-public-data-provider/
git commit -m "refactor: migrate indexer-public-data-provider to midnight-js-protocol"
```

---

## Task 8: Migrate `packages/level-private-state-provider` (2 files)

**Files:**
- Modify: `packages/level-private-state-provider/src/level-private-state-provider.ts` (compact-runtime)
- Modify: `packages/level-private-state-provider/src/test/level-private-state-provider.test.ts` (compact-runtime)

**Step 1: Replace imports**

**Step 2: Build, test, lint**

Run: `yarn turbo run build test lint --filter=@midnight-ntwrk/midnight-js-level-private-state-provider`

**Step 3: Commit**

```bash
git add packages/level-private-state-provider/
git commit -m "refactor: migrate level-private-state-provider to midnight-js-protocol"
```

---

## Task 9: Migrate `packages/utils` (1 file)

**Files:**
- Modify: `packages/utils/src/type-utils.ts` (compact-runtime)

**Step 1: Replace import**

**Step 2: Build, test, lint**

Run: `yarn turbo run build test lint --filter=@midnight-ntwrk/midnight-js-utils`

**Step 3: Commit**

```bash
git add packages/utils/
git commit -m "refactor: migrate packages/utils to midnight-js-protocol"
```

---

## Task 10: Migrate `testkit-js/testkit-js` (10 files)

**Files:**
- Modify: `testkit-js/testkit-js/src/assertions.ts` (compact-runtime + ledger-v7)
- Modify: `testkit-js/testkit-js/src/client/node-client.ts` (compact-runtime + ledger-v7)
- Modify: `testkit-js/testkit-js/src/contract/in-memory-private-state-provider.ts` (compact-runtime + ledger-v7)
- Modify: `testkit-js/testkit-js/src/wallet/midnight-wallet-provider.ts` (ledger-v7)
- Modify: `testkit-js/testkit-js/src/wallet/wallet-configuration-mapper.ts` (ledger-v7)
- Modify: `testkit-js/testkit-js/src/wallet/wallet-factory.ts` (ledger-v7)
- Modify: `testkit-js/testkit-js/src/wallet/wallet-utils.ts` (ledger-v7)

**Step 1: Replace imports — merge dual imports where both packages are used**

**Step 2: Build, test, lint**

Run: `yarn turbo run build test lint --filter=@midnight-ntwrk/testkit-js`

**Step 3: Commit**

```bash
git add testkit-js/testkit-js/
git commit -m "refactor: migrate testkit-js to midnight-js-protocol"
```

---

## Task 11: Migrate `testkit-js/testkit-js-e2e` (25 files)

**Files:**
Source files (compact-runtime + ledger-v7):
```
testkit-js/testkit-js-e2e/src/constants.ts
testkit-js/testkit-js-e2e/src/counter-api.ts
testkit-js/testkit-js-e2e/src/double-counter-api.ts
testkit-js/testkit-js-e2e/src/contract/witnesses.ts
testkit-js/testkit-js-e2e/src/contract/double-counter-witnesses.ts
```

Test files (compact-runtime + ledger-v7):
```
testkit-js/testkit-js-e2e/test/contracts.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.blocktime.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.blocktime2.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.singlecontract.nostate.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.scopedtx.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.snarkupgrade.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.snarkupgrade.singlecontract.it.test.ts
testkit-js/testkit-js-e2e/test/contracts.snarkupgrade.smoke.it.test.ts
testkit-js/testkit-js-e2e/test/level-private-state-provider.it.test.ts
testkit-js/testkit-js-e2e/test/proof-server.it.test.ts
testkit-js/testkit-js-e2e/test/unshielded.transfer.it.test.ts
testkit-js/testkit-js-e2e/test/unshielded.balance.it.test.ts
testkit-js/testkit-js-e2e/test/shielded.transfer.it.test.ts
testkit-js/testkit-js-e2e/test/indexer-public-data-provider.observable1.it.test.ts
testkit-js/testkit-js-e2e/test/indexer-public-data-provider.observable2.it.test.ts
```

> **Note:** Auto-generated compiled contract `.d.ts` files (e.g., `src/contract/compiled/*/contract/index.d.ts`) are **NOT migrated** — they are generated by the Compact compiler and will always import `compact-runtime` directly. The ESLint rule must exclude these.

**Step 1: Replace imports — merge dual imports**

**Step 2: Build and lint** (e2e tests require infrastructure, just verify compilation)

Run: `yarn turbo run build lint --filter=@midnight-ntwrk/testkit-js-e2e`

**Step 3: Commit**

```bash
git add testkit-js/testkit-js-e2e/
git commit -m "refactor: migrate testkit-js-e2e to midnight-js-protocol"
```

---

## Task 12: Remove direct protocol dependencies from consumer packages

**Files:**
- Modify: All consumer `package.json` files — remove `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/ledger-v7`, `@midnight-ntwrk/onchain-runtime-v2` if present
- Keep: `packages/protocol/package.json` — this is the ONLY package with direct protocol deps
- Keep: Root `package.json` — keep protocol packages in resolutions for version pinning

**Step 1: Remove direct deps**

Remove `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/ledger-v7`, and `@midnight-ntwrk/onchain-runtime-v2` from the `dependencies` of each consumer package.json (NOT from root resolutions, NOT from `packages/protocol`).

**Step 2: Yarn install**

Run: `yarn install`

**Step 3: Full build**

Run: `yarn build`
Expected: All packages build successfully

**Step 4: Full test**

Run: `yarn test`
Expected: Same test results as before (no regressions)

**Step 5: Commit**

```bash
git add packages/*/package.json testkit-js/*/package.json yarn.lock
git commit -m "chore: remove direct protocol deps from consumer packages"
```

---

## Task 13: Add ESLint rule to ban direct protocol imports

**Files:**
- Modify: `eslint.config.mjs` (or equivalent ESLint config)

**Step 1: Add restricted import rule**

Add to ESLint config (flat config format for ESLint 9):
```javascript
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@midnight-ntwrk/ledger-v*'],
          message: 'Import from @midnight-ntwrk/midnight-js-protocol instead. Only packages/protocol/src/index.ts may import from ledger directly.'
        },
        {
          group: ['@midnight-ntwrk/compact-runtime'],
          message: 'Import from @midnight-ntwrk/midnight-js-protocol instead. Only packages/protocol/src/index.ts may import from compact-runtime directly.'
        },
        {
          group: ['@midnight-ntwrk/onchain-runtime-v*'],
          message: 'Import from @midnight-ntwrk/midnight-js-protocol instead. Only packages/protocol/src/index.ts may import from onchain-runtime directly.'
        }
      ]
    }]
  }
}
```

Override for the ACL package itself:
```javascript
{
  files: ['packages/protocol/src/**/*.ts'],
  rules: {
    'no-restricted-imports': 'off'
  }
}
```

Override for auto-generated Compact compiler output:
```javascript
{
  files: ['**/compiled/*/contract/**/*.ts', '**/compiled/*/contract/**/*.d.ts'],
  rules: {
    'no-restricted-imports': 'off'
  }
}
```

> **Note:** Adapt to the exact ESLint 9 flat config format used in this repo.

**Step 2: Run lint**

Run: `yarn lint`
Expected: No violations (all imports already migrated)

**Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add ESLint rule to enforce protocol ACL imports"
```

---

## Task 14: Final verification

**Step 1: Verify no direct protocol imports remain**

```bash
grep -r "from '@midnight-ntwrk/ledger-v" --include='*.ts' packages/ testkit-js/ | grep -v 'packages/protocol/' | grep -v '/compiled/'
grep -r "from '@midnight-ntwrk/compact-runtime'" --include='*.ts' packages/ testkit-js/ | grep -v 'packages/protocol/' | grep -v '/compiled/'
grep -r "from '@midnight-ntwrk/onchain-runtime" --include='*.ts' packages/ testkit-js/ | grep -v 'packages/protocol/'
```
Expected: Zero results for all three

**Step 2: Full monorepo build**

Run: `yarn build --force`
Expected: All packages build

**Step 3: Full test suite**

Run: `yarn test`
Expected: Same results as pre-ACL (no new failures)

**Step 4: Lint**

Run: `yarn lint`
Expected: Clean

**Step 5: Final commit (if any cleanup needed)**

---

## Summary

| Task | Scope | Effort |
|------|-------|--------|
| 1-2 | Scaffold + barrel | Small — new package, one file |
| 3 | Add deps | Small — package.json edits |
| 4 | Migrate types | Small — 8 files, import-only change |
| 5 | Migrate contracts | Large — 39 files, vi.mock merges, dual-import merges |
| 6 | Migrate http-client-proof-provider | Small — 5 files, vi.mock + vi.importActual |
| 7 | Migrate indexer-public-data-provider | Small — 2 files |
| 8 | Migrate level-private-state-provider | Small — 2 files |
| 9 | Migrate utils | Trivial — 1 file |
| 10 | Migrate testkit-js | Medium — 10 files, dual-import merges |
| 11 | Migrate testkit-js-e2e | Medium — 25 files, dual-import merges |
| 12 | Remove old deps | Small — package.json cleanup |
| 13 | ESLint guard | Small — config change |
| 14 | Verification | Small — grep + full build |

**Total: ~80+ files changed, all mechanical find-and-replace. No logic changes.**

**Key risk:** Symbol collisions between compact-runtime and ledger-v7 (e.g., `ContractAddress`, `ContractState`, `SigningKey`). These must be resolved in Task 2 by picking one canonical source per symbol and verifying all consumers compile.

**Future protocol migration (e.g., ledger-v7 → v8, compact-runtime 0.14 → 0.15):**
1. Update `packages/protocol/package.json` dependencies
2. Update `packages/protocol/src/index.ts` import sources
3. Handle any renamed/removed/added symbols in the barrel
4. Done — no other files in the monorepo need to change.
