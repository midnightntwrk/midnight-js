# Barrel Package `@midnight-ntwrk/midnight-js` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a barrel package that re-exports all core (non-provider) midnight-js packages under namespaces, giving consumers a single import point.

**Architecture:** New `packages/midnight-js/` workspace package that uses `export * as <namespace>` to re-export `contracts`, `types`, `utils`, and `network-id`. Providers and the `compact` CLI tool are excluded. The root monorepo `package.json` is renamed to avoid the name collision.

**Tech Stack:** TypeScript 5.8.x, Rollup (via shared `rollup.config.factory.mjs`), Vitest, Yarn 4.x workspaces

**Convention:** All `.ts` and `.mjs` source files must include the standard Apache-2.0 license header used throughout the codebase (see any existing `src/index.ts` for the exact text). Code examples below omit the header for brevity.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `package.json` (root) | Rename from `@midnight-ntwrk/midnight-js` → `@midnight-ntwrk/midnight-js-monorepo` |
| Create | `packages/midnight-js/package.json` | Package manifest with `workspace:*` deps on 4 core packages |
| Create | `packages/midnight-js/src/index.ts` | Barrel file with namespaced re-exports |
| Create | `packages/midnight-js/rollup.config.mjs` | Standard rollup config using shared factory |
| Create | `packages/midnight-js/tsconfig.json` | TypeScript config extending `tsconfig.base.json` |
| Create | `packages/midnight-js/tsconfig.build.json` | Build config excluding tests |
| Create | `packages/midnight-js/vitest.config.ts` | Test runner config |
| Create | `packages/midnight-js/src/test/index.test.ts` | Unit tests verifying namespaced exports |

## Packages Included (namespaced exports)

| Namespace | Package | Why |
|-----------|---------|-----|
| `contracts` | `@midnight-ntwrk/midnight-js-contracts` | Core contract interaction (deploy, call, find) |
| `networkId` | `@midnight-ntwrk/midnight-js-network-id` | Global network configuration |
| `types` | `@midnight-ntwrk/midnight-js-types` | Shared types, interfaces, provider contracts |
| `utils` | `@midnight-ntwrk/midnight-js-utils` | Utility functions (assertion, date, hex, type) |

## Packages Excluded

| Package | Why excluded |
|---------|-------------|
| `http-client-proof-provider` | Provider — environment-specific implementation |
| `indexer-public-data-provider` | Provider — environment-specific implementation |
| `level-private-state-provider` | Provider — environment-specific implementation |
| `fetch-zk-config-provider` | Provider — environment-specific implementation |
| `node-zk-config-provider` | Provider — environment-specific implementation |
| `logger-provider` | Provider — environment-specific implementation |
| `compact` | CLI build tool, not a runtime library |

---

### Task 1: Rename root monorepo package

**Files:**
- Modify: `package.json` (root)

The root `package.json` uses `@midnight-ntwrk/midnight-js` which collides with the barrel package name. The root is a workspace orchestrator and is never published.

- [ ] **Step 1: Rename root package**

In `/package.json`, change:
```json
"name": "@midnight-ntwrk/midnight-js-monorepo",
```

- [ ] **Step 2: Verify yarn still resolves workspaces**

Run: `yarn install`
Expected: completes with no errors (warnings about peer deps are OK)

- [ ] **Step 3: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore: rename root workspace to midnight-js-monorepo"
```

---

### Task 2: Create barrel package scaffold

**Files:**
- Create: `packages/midnight-js/package.json`
- Create: `packages/midnight-js/rollup.config.mjs`
- Create: `packages/midnight-js/tsconfig.json`
- Create: `packages/midnight-js/tsconfig.build.json`
- Create: `packages/midnight-js/vitest.config.ts`

- [ ] **Step 1: Create `packages/midnight-js/package.json`**

```json
{
  "name": "@midnight-ntwrk/midnight-js",
  "version": "4.0.2",
  "description": "Barrel package for Midnight.js core SDK",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": {
        "import": "./dist/index.d.mts",
        "require": "./dist/index.d.cts"
      },
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "repository": "git@github.com:midnight-ntwrk/artifacts",
  "packageManager": "yarn@4.10.3",
  "author": "IOHK",
  "license": "Apache-2.0",
  "scripts": {
    "clean": "rm -rf dist tsconfig.build.tsbuildinfo .rollup.cache",
    "build": "rollup -c rollup.config.mjs",
    "test": "vitest run --passWithNoTests",
    "deploy": "yarn npm publish --tolerate-republish"
  },
  "dependencies": {
    "@midnight-ntwrk/midnight-js-contracts": "workspace:*",
    "@midnight-ntwrk/midnight-js-network-id": "workspace:*",
    "@midnight-ntwrk/midnight-js-types": "workspace:*",
    "@midnight-ntwrk/midnight-js-utils": "workspace:*"
  },
  "files": [
    "dist/"
  ]
}
```

- [ ] **Step 2: Create `packages/midnight-js/rollup.config.mjs`**

```javascript
import { createRollupConfig } from '../../build-tools/rollup.config.factory.mjs';
import packageJson from './package.json' with { type: 'json' };

export default createRollupConfig(packageJson);
```

- [ ] **Step 3: Create `packages/midnight-js/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": [
    "./src/**/*.ts"
  ]
}
```

- [ ] **Step 4: Create `packages/midnight-js/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "./src/test/**/*.ts"
  ]
}
```

- [ ] **Step 5: Create `packages/midnight-js/vitest.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    environment: 'node',
    globals: true,
    include: ['**/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
```

- [ ] **Step 6: Run `yarn install` to link the new workspace**

Run: `yarn install`
Expected: completes successfully, new package linked

- [ ] **Step 7: Commit**

```bash
git add packages/midnight-js/package.json packages/midnight-js/rollup.config.mjs packages/midnight-js/tsconfig.json packages/midnight-js/tsconfig.build.json packages/midnight-js/vitest.config.ts yarn.lock
git commit -m "chore: scaffold barrel package @midnight-ntwrk/midnight-js"
```

---

### Task 3: Write failing tests for barrel exports

**Files:**
- Create: `packages/midnight-js/src/test/index.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, expect, it } from 'vitest';

import * as midnightJs from '../index';

describe('barrel exports', () => {
  it('should export contracts namespace', () => {
    expect(midnightJs.contracts).toBeDefined();
    expect(typeof midnightJs.contracts).toBe('object');
  });

  it('should export networkId namespace', () => {
    expect(midnightJs.networkId).toBeDefined();
    expect(typeof midnightJs.networkId.setNetworkId).toBe('function');
    expect(typeof midnightJs.networkId.getNetworkId).toBe('function');
  });

  it('should export types namespace', () => {
    expect(midnightJs.types).toBeDefined();
    expect(typeof midnightJs.types).toBe('object');
  });

  it('should export utils namespace', () => {
    expect(midnightJs.utils).toBeDefined();
    expect(typeof midnightJs.utils).toBe('object');
  });

  it('should not export provider packages', () => {
    const exportedKeys = Object.keys(midnightJs);
    expect(exportedKeys).toEqual(expect.arrayContaining(['contracts', 'networkId', 'types', 'utils']));
    expect(exportedKeys).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/midnight-js && yarn test`
Expected: FAIL — `../index` module not found (no `src/index.ts` yet)

- [ ] **Step 3: Commit failing tests**

```bash
git add packages/midnight-js/src/test/index.test.ts
git commit -m "test: add barrel export tests (red)"
```

---

### Task 4: Implement barrel exports and make tests pass

**Files:**
- Create: `packages/midnight-js/src/index.ts`

- [ ] **Step 1: Create `packages/midnight-js/src/index.ts`**

```typescript
export * as contracts from '@midnight-ntwrk/midnight-js-contracts';
export * as networkId from '@midnight-ntwrk/midnight-js-network-id';
export * as types from '@midnight-ntwrk/midnight-js-types';
export * as utils from '@midnight-ntwrk/midnight-js-utils';
```

Exports are alphabetically sorted to satisfy `simple-import-sort/exports` lint rule.

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd packages/midnight-js && yarn test`
Expected: 5 tests PASS

- [ ] **Step 3: Run lint**

Run: `yarn lint --no-cache -- packages/midnight-js/`
Expected: no errors

- [ ] **Step 4: Build the package**

Run: `cd packages/midnight-js && yarn build`
Expected: generates `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.mts`, `dist/index.d.cts`

- [ ] **Step 5: Build via turbo to verify dependency ordering**

Run: `yarn build --filter='@midnight-ntwrk/midnight-js'`
Expected: builds all 4 dependencies first, then the barrel package (5 tasks total)

- [ ] **Step 6: Commit**

```bash
git add packages/midnight-js/src/index.ts
git commit -m "feat: add barrel package @midnight-ntwrk/midnight-js with namespaced exports"
```

---

## Consumer Usage

```typescript
import { contracts, types, utils, networkId } from '@midnight-ntwrk/midnight-js';

networkId.setNetworkId('testnet');
const deployed = await contracts.deployContract(/* ... */);
```

## Verification Checklist

- [ ] Root `package.json` renamed to `@midnight-ntwrk/midnight-js-monorepo`
- [ ] `yarn install` resolves all workspaces
- [ ] `yarn build --filter='@midnight-ntwrk/midnight-js'` succeeds with correct dependency order
- [ ] `yarn test` in `packages/midnight-js/` — 5 tests pass
- [ ] `yarn lint -- packages/midnight-js/` — no errors
- [ ] Only 4 namespaces exported: `contracts`, `networkId`, `types`, `utils`
- [ ] No provider packages included
