# Contracts Governance Separation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Co-locate all governance / maintenance code under `packages/contracts/src/governance/` (and `src/test/governance/`) without changing the package's public API or behaviour.

**Architecture:** In-package refactor only. Five sequential commits, each compiles + tests + lints green on its own. Public surface preserved by re-exporting every moved symbol from the root `src/index.ts`. Governance unproven-tx helpers stay package-private.

**Tech Stack:** TypeScript 6.0, Vitest 4, Rollup (via `rollup-plugin-dts`), Turbo, Yarn 4 workspaces, ESLint.

**Spec:** `docs/superpowers/specs/2026-05-21-contracts-governance-separation-design.md`

**Commands engineer will use (run from monorepo root):**
- Per-package test: `yarn workspace @midnight-ntwrk/midnight-js-contracts test`
- Per-package build: `yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts` (turbo manages binary resolution; `yarn workspace ... build` directly does NOT work because rollup isn't in the workspace's PATH)
- Lint (whole repo): `yarn lint`
- Faster combined check: `yarn workspace @midnight-ntwrk/midnight-js-contracts test && yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts && yarn lint`

---

## Task 0 — Baseline & worktree

**Goal:** Capture the public-surface baseline before any change; confirm green starting state.

**Files:**
- Read: `packages/contracts/src/index.ts`
- Write: `/tmp/main-syms.txt` (temp baseline)

- [ ] **Step 0.1: Confirm clean working tree on `main`**

Run from monorepo root:
```bash
git status
git rev-parse --abbrev-ref HEAD
```
Expected: clean tree, branch is `main` (or a feature branch off `main`).

- [ ] **Step 0.2: Run the existing test + build to confirm green baseline**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
```
Expected: all three succeed. If anything fails, STOP and fix before continuing — the refactor depends on a green baseline.

- [ ] **Step 0.3: Capture the public-surface baseline**

```bash
grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\b' packages/contracts/dist/index.d.ts | sort -u > /tmp/main-syms.txt
wc -l /tmp/main-syms.txt
```
Expected: a few hundred unique tokens. Keep this file — Task 5 will diff against it.

- [ ] **Step 0.4: Create a feature branch (skip if already on one)**

```bash
git checkout -b refactor/contracts-governance-separation
```

---

## Task 1 — Move governance errors

**Goal:** Move the 3 governance error classes into `src/governance/errors.ts` while preserving the public-export surface. Update every internal consumer in lockstep so the build never breaks.

**Files:**
- Create: `packages/contracts/src/governance/errors.ts`
- Modify: `packages/contracts/src/errors.ts` (remove 3 classes)
- Modify: `packages/contracts/src/submit-insert-vk-tx.ts` (line 26)
- Modify: `packages/contracts/src/submit-remove-vk-tx.ts` (line 23)
- Modify: `packages/contracts/src/submit-replace-authority-tx.ts` (line 23)
- Modify: `packages/contracts/src/test/submit-insert-vk-tx.test.ts` (line 100)
- Modify: `packages/contracts/src/test/submit-remove-vk-tx.test.ts` (line 96)
- Modify: `packages/contracts/src/test/submit-replace-authority-tx.test.ts` (line 92)
- Modify: `packages/contracts/src/index.ts` (lines 49–51)

- [ ] **Step 1.1: Create the `governance/` directory and `governance/errors.ts`**

```bash
mkdir -p packages/contracts/src/governance
```

Then write `packages/contracts/src/governance/errors.ts` with this exact content:

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';

import { TxFailedError } from '../errors';

/**
 * An error indicating that a contract maintenance authority replacement transaction failed.
 */
export class ReplaceMaintenanceAuthorityTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'ReplaceMaintenanceAuthorityTxFailedError';
  }
}

/**
 * An error indicating that a verifier key removal transaction failed.
 */
export class RemoveVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'RemoveVerifierKeyTxFailedError';
  }
}

/**
 * An error indicating that a verifier key insertion transaction failed.
 */
export class InsertVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'InsertVerifierKeyTxFailedError';
  }
}
```

- [ ] **Step 1.2: Update `src/submit-insert-vk-tx.ts` line 26**

Find:
```ts
import { InsertVerifierKeyTxFailedError } from './errors';
```
Replace with:
```ts
import { InsertVerifierKeyTxFailedError } from './governance/errors';
```

- [ ] **Step 1.3: Update `src/submit-remove-vk-tx.ts` line 23**

Find:
```ts
import { RemoveVerifierKeyTxFailedError } from './errors';
```
Replace with:
```ts
import { RemoveVerifierKeyTxFailedError } from './governance/errors';
```

- [ ] **Step 1.4: Update `src/submit-replace-authority-tx.ts` line 23**

Find:
```ts
import { ReplaceMaintenanceAuthorityTxFailedError } from './errors';
```
Replace with:
```ts
import { ReplaceMaintenanceAuthorityTxFailedError } from './governance/errors';
```

- [ ] **Step 1.5: Update dynamic imports in 3 test files**

In `packages/contracts/src/test/submit-insert-vk-tx.test.ts` line 100, find:
```ts
const { InsertVerifierKeyTxFailedError } = await import('../errors');
```
Replace with:
```ts
const { InsertVerifierKeyTxFailedError } = await import('../governance/errors');
```

In `packages/contracts/src/test/submit-remove-vk-tx.test.ts` line 96, find:
```ts
const { RemoveVerifierKeyTxFailedError } = await import('../errors');
```
Replace with:
```ts
const { RemoveVerifierKeyTxFailedError } = await import('../governance/errors');
```

In `packages/contracts/src/test/submit-replace-authority-tx.test.ts` line 92, find:
```ts
const { ReplaceMaintenanceAuthorityTxFailedError } = await import('../errors');
```
Replace with:
```ts
const { ReplaceMaintenanceAuthorityTxFailedError } = await import('../governance/errors');
```

- [ ] **Step 1.6: Delete the 3 classes from `src/errors.ts`**

Remove lines 122–150 of `packages/contracts/src/errors.ts` (the three blocks `ReplaceMaintenanceAuthorityTxFailedError`, `RemoveVerifierKeyTxFailedError`, `InsertVerifierKeyTxFailedError` including their JSDoc comments). After the edit, the file should end with `ContractTypeError` followed directly by `IncompleteCallTxPrivateStateConfig` then `IncompleteFindContractPrivateStateConfig` then `ScopedTransactionIdentityMismatchError`.

Use Read first to confirm line range, then Edit.

- [ ] **Step 1.7: Update `src/index.ts` re-exports**

Find lines 43–52:
```ts
export {
  CallTxFailedError,
  ContractTypeError,
  DeployTxFailedError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError,
  TxFailedError} from './errors';
```
Replace with:
```ts
export {
  CallTxFailedError,
  ContractTypeError,
  DeployTxFailedError,
  IncompleteCallTxPrivateStateConfig,
  IncompleteFindContractPrivateStateConfig,
  TxFailedError} from './errors';
export {
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError} from './governance/errors';
```

- [ ] **Step 1.8: Verify no remaining `./errors` import targets the moved classes**

```bash
rg "from '\\./errors'" packages/contracts/src
```
Expected: no remaining lines that mention any of the three moved class names. Existing imports of `TxFailedError`, `CallTxFailedError`, `DeployTxFailedError`, `ContractTypeError`, `IncompleteCallTxPrivateStateConfig`, `IncompleteFindContractPrivateStateConfig`, `ScopedTransactionIdentityMismatchError`, `isEffectContractError` may remain.

- [ ] **Step 1.9: Run tests, build, lint**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
```
Expected: all green.

- [ ] **Step 1.10: Commit**

```bash
git add packages/contracts/src/governance/errors.ts \
        packages/contracts/src/errors.ts \
        packages/contracts/src/submit-insert-vk-tx.ts \
        packages/contracts/src/submit-remove-vk-tx.ts \
        packages/contracts/src/submit-replace-authority-tx.ts \
        packages/contracts/src/test/submit-insert-vk-tx.test.ts \
        packages/contracts/src/test/submit-remove-vk-tx.test.ts \
        packages/contracts/src/test/submit-replace-authority-tx.test.ts \
        packages/contracts/src/index.ts

git commit -m "$(cat <<'EOF'
refactor(contracts): move governance error classes to governance/errors.ts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Move governance unproven-tx builders

**Goal:** Extract `unprovenTxFromContractUpdates` and the 3 `createUnproven{Insert,Remove,Replace}…Tx` helpers from `utils/ledger-utils.ts` into `src/governance/unproven-tx.ts`. Update every consumer plus tests.

**Files:**
- Create: `packages/contracts/src/governance/unproven-tx.ts`
- Modify: `packages/contracts/src/utils/ledger-utils.ts` (remove lines ~163–255)
- Modify: `packages/contracts/src/utils/index.ts` (drop 4 re-exports — confirmed it is `export * from './ledger-utils'` so this is automatic, no edit needed if the source file is the only export point)
- Modify: `packages/contracts/src/submit-insert-vk-tx.ts` (line 28)
- Modify: `packages/contracts/src/submit-remove-vk-tx.ts` (line 25)
- Modify: `packages/contracts/src/submit-replace-authority-tx.ts` (line 25)
- Modify: `packages/contracts/src/test/submit-insert-vk-tx.test.ts` (lines 21, 34)
- Modify: `packages/contracts/src/test/submit-remove-vk-tx.test.ts` (lines 20, 33)
- Modify: `packages/contracts/src/test/submit-replace-authority-tx.test.ts` (lines 20, 33)
- Modify: `packages/contracts/src/test/utils/ledger-utils.test.ts` (remove 3 names from import, delete 3 `it(...)` blocks)
- Create: `packages/contracts/src/test/governance/unproven-tx.test.ts`

- [ ] **Step 2.1: Create `src/governance/unproven-tx.ts`**

Write the file with this content (copied verbatim from `src/utils/ledger-utils.ts` lines 163–255, with license header):

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { type Contract, ProvableCircuitId, VerifierKey as ContractVerifierKey } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type {
  CoinPublicKey,
  ContractAddress,
  ContractState,
  SigningKey
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Intent,
  type MaintenanceUpdate,
  type UnprovenTransaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  asContractAddress,
  asEffectOption,
  makeContractExecutableRuntime,
  Transaction,
  type VerifierKey,
  type ZKConfigProvider
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';

export const unprovenTxFromContractUpdates = async (
  updateAndSignFn: () => Promise<MaintenanceUpdate>
): Promise<UnprovenTransaction> => {
  return Transaction.fromParts(
    getNetworkId(),
    undefined,
    undefined,
    Intent.new(ttlOneHour()).addMaintenanceUpdate(await updateAndSignFn())
  );
};

export const createUnprovenReplaceAuthorityTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  newAuthority: SigningKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.replaceContractMaintenanceAuthority(
      asEffectOption(newAuthority),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};

export const createUnprovenRemoveVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.removeContractOperation(
      ProvableCircuitId(operation),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};

export const createUnprovenInsertVerifierKeyTx = <C extends Contract.Any>(
  zkConfigProvider: ZKConfigProvider<string>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress,
  operation: string,
  newVk: VerifierKey,
  contractState: ContractState,
  currentAuthority: SigningKey,
  coinPublicKey: CoinPublicKey,
): Promise<UnprovenTransaction> => {
  const contractExec = ContractExecutable.make(compiledContract);
  const contractRuntime = makeContractExecutableRuntime(zkConfigProvider, {
    coinPublicKey,
    signingKey: currentAuthority
  });

  return unprovenTxFromContractUpdates(async () => {
    return (await contractRuntime.runPromise(contractExec.addOrReplaceContractOperation(
      ProvableCircuitId(operation),
      ContractVerifierKey(newVk),
      {
        address: asContractAddress(contractAddress),
        contractState
      }
    ))).public.maintenanceUpdate
  });
};
```

Note: this differs from `ledger-utils.ts` only in import surface (drops unused imports for `LedgerContractState`, `ZswapLocalState`, etc. that the deploy/call helpers needed). Verify after step 2.3 that nothing else imports those.

- [ ] **Step 2.2: Remove the 4 governance helpers from `src/utils/ledger-utils.ts`**

Open the file. Delete the trailing region from line 164 (`// Utilities for unproven transactions for the single contract updates above.`) through line 255 — i.e. the comment line, `unprovenTxFromContractUpdates`, `createUnprovenReplaceAuthorityTx`, `createUnprovenRemoveVerifierKeyTx`, `createUnprovenInsertVerifierKeyTx`.

After the edit, also remove any now-unused imports at the top of the file: `MaintenanceUpdate`, `SigningKey` (from compact-runtime), `ContractExecutable` (if no longer used), `asContractAddress`, `asEffectOption`, `makeContractExecutableRuntime`, `Transaction`, `VerifierKey`, `ZKConfigProvider`, `ProvableCircuitId`, `ContractVerifierKey`, `Intent`, `ttlOneHour`, `getNetworkId` — but ONLY those that no other function in `ledger-utils.ts` still needs. Use `Read` to verify; the file keeps `toLedger*`, `fromLedger*`, `extractUserAddressedOutputs`, `createUnprovenLedgerDeployTx`, `createUnprovenLedgerCallTx`, which still need many of these (e.g., `Intent`, `Transaction`, `ttlOneHour`, `getNetworkId`).

Conservative approach: run `yarn lint` after the edit — `eslint-plugin-unused-imports` will flag any unused import for removal.

- [ ] **Step 2.3: Update `src/submit-insert-vk-tx.ts` line 28**

Find:
```ts
import { createUnprovenInsertVerifierKeyTx } from './utils';
```
Replace with:
```ts
import { createUnprovenInsertVerifierKeyTx } from './governance/unproven-tx';
```

- [ ] **Step 2.4: Update `src/submit-remove-vk-tx.ts` line 25**

Find:
```ts
import { createUnprovenRemoveVerifierKeyTx } from './utils';
```
Replace with:
```ts
import { createUnprovenRemoveVerifierKeyTx } from './governance/unproven-tx';
```

- [ ] **Step 2.5: Update `src/submit-replace-authority-tx.ts` line 25**

Find:
```ts
import { createUnprovenReplaceAuthorityTx } from './utils';
```
Replace with:
```ts
import { createUnprovenReplaceAuthorityTx } from './governance/unproven-tx';
```

- [ ] **Step 2.6: Update `src/test/submit-insert-vk-tx.test.ts`**

Find line 21:
```ts
import { createUnprovenInsertVerifierKeyTx } from '../utils';
```
Replace with:
```ts
import { createUnprovenInsertVerifierKeyTx } from '../governance/unproven-tx';
```

Find line 34:
```ts
vi.mock('../utils');
```
Replace with:
```ts
vi.mock('../governance/unproven-tx');
```

- [ ] **Step 2.7: Update `src/test/submit-remove-vk-tx.test.ts`**

Find line 20:
```ts
import { createUnprovenRemoveVerifierKeyTx } from '../utils';
```
Replace with:
```ts
import { createUnprovenRemoveVerifierKeyTx } from '../governance/unproven-tx';
```

Find line 33:
```ts
vi.mock('../utils');
```
Replace with:
```ts
vi.mock('../governance/unproven-tx');
```

- [ ] **Step 2.8: Update `src/test/submit-replace-authority-tx.test.ts`**

Find line 20:
```ts
import { createUnprovenReplaceAuthorityTx } from '../utils';
```
Replace with:
```ts
import { createUnprovenReplaceAuthorityTx } from '../governance/unproven-tx';
```

Find line 33:
```ts
vi.mock('../utils');
```
Replace with:
```ts
vi.mock('../governance/unproven-tx');
```

- [ ] **Step 2.9: Split `src/test/utils/ledger-utils.test.ts`**

Open the file. In the import block at lines 59–69, remove these three names:
- `createUnprovenRemoveVerifierKeyTx`
- `createUnprovenReplaceAuthorityTx`
- `unprovenTxFromContractUpdates`

The block should keep:
```ts
import {
  createUnprovenLedgerCallTx,
  createZswapOutput,
  type EncryptionPublicKeyResolver,
  extractUserAddressedOutputs,
  fromLedgerContractState,
  toLedgerContractState,
  toLedgerQueryContext} from '../../utils';
```

Then delete the three `it(...)` blocks (use Read to find exact line ranges):
- `unprovenTxFromContractUpdates returns an UnprovenTransaction` (around line 105)
- `createUnprovenReplaceAuthorityTx returns an UnprovenTransaction` (around line 512)
- `createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction` (around line 525)

Also remove any imports of `MaintenanceUpdate` if it's no longer referenced after deleting the blocks.

- [ ] **Step 2.10: Create `src/test/governance/` directory**

```bash
mkdir -p packages/contracts/src/test/governance
```

- [ ] **Step 2.11: Create `src/test/governance/unproven-tx.test.ts`**

Write the extracted assertions. Use this content as a starting point (copy the 3 deleted `it(...)` blocks from `ledger-utils.test.ts` into this skeleton, adjusting the import path):

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ContractState as CompactContractState, sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ContractAddress,
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  Transaction
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  unprovenTxFromContractUpdates
} from '../../governance/unproven-tx';
import { createMockCompiledContract, createMockZKConfigProvider } from '../test-mocks';

describe('governance/unproven-tx', () => {
  beforeAll(() => {
    setNetworkId('undeployed');
  });

  const mockZKProvider = createMockZKConfigProvider();
  const mockCompiledContract = createMockCompiledContract();
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyCPK = sampleCoinPublicKey();

  it('unprovenTxFromContractUpdates returns an UnprovenTransaction', async () => {
    const tx = await unprovenTxFromContractUpdates(
      () => Promise.resolve(new MaintenanceUpdate(dummyContractAddress as unknown as ContractAddress, [], 1n))
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenReplaceAuthorityTx returns an UnprovenTransaction', async () => {
    const tx = await createUnprovenReplaceAuthorityTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      dummySigningKey2,
      dummyContractState,
      dummySigningKey,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction', async () => {
    dummyContractState.setOperation('unProvenLedgerTx', new (await import('@midnight-ntwrk/midnight-js-protocol/compact-runtime')).ContractOperation());
    const tx = await createUnprovenRemoveVerifierKeyTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      'unProvenLedgerTx',
      dummyContractState,
      dummySigningKey,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });
});
```

⚠️ The exact body of each `it` block must match what was in `ledger-utils.test.ts` — Read that file first and **copy the original bodies verbatim**, only adjusting the `from '../../utils'` → `from '../../governance/unproven-tx'`. Don't recreate from this skeleton if the original has additional setup/assertions.

- [ ] **Step 2.12: Verify no remaining `./utils` (or `../utils`) governance-helper references**

```bash
rg "createUnproven(Insert|Remove|Replace)|unprovenTxFromContractUpdates" packages/contracts/src
```
Expected matches: only inside `src/governance/unproven-tx.ts`, the 3 `src/submit-*.ts` files, the 3 `src/test/submit-*.test.ts` files, and the new `src/test/governance/unproven-tx.test.ts`. **No matches in `utils/` or in `utils/ledger-utils.test.ts`.**

- [ ] **Step 2.13: Run tests, build, lint**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
```
Expected: all green. The lint pass also catches any unused imports left in `utils/ledger-utils.ts`.

- [ ] **Step 2.14: Commit**

```bash
git add packages/contracts/src/governance/unproven-tx.ts \
        packages/contracts/src/utils/ledger-utils.ts \
        packages/contracts/src/submit-insert-vk-tx.ts \
        packages/contracts/src/submit-remove-vk-tx.ts \
        packages/contracts/src/submit-replace-authority-tx.ts \
        packages/contracts/src/test/submit-insert-vk-tx.test.ts \
        packages/contracts/src/test/submit-remove-vk-tx.test.ts \
        packages/contracts/src/test/submit-replace-authority-tx.test.ts \
        packages/contracts/src/test/utils/ledger-utils.test.ts \
        packages/contracts/src/test/governance/unproven-tx.test.ts

git commit -m "$(cat <<'EOF'
refactor(contracts): move governance unproven-tx builders to governance/unproven-tx.ts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Move submit-* sources and their tests

**Goal:** Physically relocate the 3 `submit-*.ts` files and their tests into `src/governance/` and `src/test/governance/`. Fix every relative path.

**Files:**
- Move: `src/submit-insert-vk-tx.ts` → `src/governance/submit-insert-vk-tx.ts`
- Move: `src/submit-remove-vk-tx.ts` → `src/governance/submit-remove-vk-tx.ts`
- Move: `src/submit-replace-authority-tx.ts` → `src/governance/submit-replace-authority-tx.ts`
- Move: `src/test/submit-insert-vk-tx.test.ts` → `src/test/governance/submit-insert-vk-tx.test.ts`
- Move: `src/test/submit-remove-vk-tx.test.ts` → `src/test/governance/submit-remove-vk-tx.test.ts`
- Move: `src/test/submit-replace-authority-tx.test.ts` → `src/test/governance/submit-replace-authority-tx.test.ts`
- Modify: `src/index.ts` (3 lines)

- [ ] **Step 3.1: Move the 3 source files**

```bash
git mv packages/contracts/src/submit-insert-vk-tx.ts packages/contracts/src/governance/submit-insert-vk-tx.ts
git mv packages/contracts/src/submit-remove-vk-tx.ts packages/contracts/src/governance/submit-remove-vk-tx.ts
git mv packages/contracts/src/submit-replace-authority-tx.ts packages/contracts/src/governance/submit-replace-authority-tx.ts
```

- [ ] **Step 3.2: Fix imports in `src/governance/submit-insert-vk-tx.ts`**

The file now sits one level deeper. Update its relative imports:

| Old | New |
|---|---|
| `from './contract-providers'` | `from '../contract-providers'` |
| `from './governance/errors'` | `from './errors'` |
| `from './submit-tx'` | `from '../submit-tx'` |
| `from './governance/unproven-tx'` | `from './unproven-tx'` |

Edit each `import` line accordingly.

- [ ] **Step 3.3: Fix imports in `src/governance/submit-remove-vk-tx.ts`**

Same pattern as 3.2:

| Old | New |
|---|---|
| `from './contract-providers'` | `from '../contract-providers'` |
| `from './governance/errors'` | `from './errors'` |
| `from './submit-tx'` | `from '../submit-tx'` |
| `from './governance/unproven-tx'` | `from './unproven-tx'` |

- [ ] **Step 3.4: Fix imports in `src/governance/submit-replace-authority-tx.ts`**

Same pattern:

| Old | New |
|---|---|
| `from './contract-providers'` | `from '../contract-providers'` |
| `from './governance/errors'` | `from './errors'` |
| `from './submit-tx'` | `from '../submit-tx'` |
| `from './governance/unproven-tx'` | `from './unproven-tx'` |

- [ ] **Step 3.5: Update `src/index.ts` re-exports for the 3 submit functions**

Find these lines (around lines 66–68):
```ts
export { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
export { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
export { submitReplaceAuthorityTx } from './submit-replace-authority-tx';
```
Replace with:
```ts
export { submitInsertVerifierKeyTx } from './governance/submit-insert-vk-tx';
export { submitRemoveVerifierKeyTx } from './governance/submit-remove-vk-tx';
export { submitReplaceAuthorityTx } from './governance/submit-replace-authority-tx';
```

- [ ] **Step 3.6: Verify `src/tx-interfaces.ts` import paths still resolve**

`tx-interfaces.ts:28-31` imports the 3 submit functions:
```ts
import { submitCallTx } from './submit-call-tx';
import { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from './submit-replace-authority-tx';
```
These now point at moved files. Update the 3 governance ones:
```ts
import { submitCallTx } from './submit-call-tx';
import { submitInsertVerifierKeyTx } from './governance/submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from './governance/submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from './governance/submit-replace-authority-tx';
```

- [ ] **Step 3.7: Move the 3 test files**

```bash
git mv packages/contracts/src/test/submit-insert-vk-tx.test.ts packages/contracts/src/test/governance/submit-insert-vk-tx.test.ts
git mv packages/contracts/src/test/submit-remove-vk-tx.test.ts packages/contracts/src/test/governance/submit-remove-vk-tx.test.ts
git mv packages/contracts/src/test/submit-replace-authority-tx.test.ts packages/contracts/src/test/governance/submit-replace-authority-tx.test.ts
```

- [ ] **Step 3.8: Fix imports in `src/test/governance/submit-insert-vk-tx.test.ts`**

The test now sits one level deeper. Update every `../` to `../../` for paths that go to `src/`, and adjust paths to governance siblings:

| Old | New |
|---|---|
| `from '../submit-insert-vk-tx'` | `from '../../governance/submit-insert-vk-tx'` |
| `from '../submit-tx'` | `from '../../submit-tx'` |
| `from '../governance/unproven-tx'` | `from '../../governance/unproven-tx'` |
| `from './test-mocks'` | `from '../test-mocks'` |
| `vi.mock('../submit-tx')` | `vi.mock('../../submit-tx')` |
| `vi.mock('../governance/unproven-tx')` | `vi.mock('../../governance/unproven-tx')` |
| `await import('../governance/errors')` | `await import('../../governance/errors')` |

- [ ] **Step 3.9: Fix imports in `src/test/governance/submit-remove-vk-tx.test.ts`**

Same table as 3.8 (with the obvious file-name swap).

- [ ] **Step 3.10: Fix imports in `src/test/governance/submit-replace-authority-tx.test.ts`**

Same table as 3.8 (with the obvious file-name swap).

- [ ] **Step 3.11: Verify no orphaned reference to the old src/ paths**

```bash
rg "from '\\./submit-(insert-vk|remove-vk|replace-authority)-tx'" packages/contracts/src
```
Expected: zero matches. (All imports should now go through `./governance/...`.)

```bash
rg "from '\\.\\./submit-(insert-vk|remove-vk|replace-authority)-tx'" packages/contracts/src
```
Expected: zero matches (no test imports the old relative path).

- [ ] **Step 3.12: Run tests, build, lint**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
```
Expected: all green.

- [ ] **Step 3.13: Commit**

```bash
git add -A packages/contracts/src
git commit -m "$(cat <<'EOF'
refactor(contracts): move governance submit-tx files to governance/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Split `tx-interfaces.ts`

**Goal:** Separate maintenance interfaces from call interfaces. Update 2 source consumers and 3 test files (one move + 2 mock-factory splits).

**Files:**
- Create: `packages/contracts/src/governance/tx-interfaces.ts`
- Modify: `packages/contracts/src/tx-interfaces.ts` (keep only call interface)
- Modify: `packages/contracts/src/deploy-contract.ts` (line 25-29)
- Modify: `packages/contracts/src/find-deployed-contract.ts` (line 32-39)
- Modify: `packages/contracts/src/test/deploy-contract.test.ts` (lines 38-42)
- Modify: `packages/contracts/src/test/find-deployed-contract.test.ts` (lines 31-35)
- Modify: `packages/contracts/src/index.ts` (governance interface re-exports)
- Create: `packages/contracts/src/test/governance/tx-interfaces.test.ts`
- Modify: `packages/contracts/src/test/tx-interfaces.test.ts` (trim to call-only)

- [ ] **Step 4.1: Create `src/governance/tx-interfaces.ts`**

Write the file with content extracted from `src/tx-interfaces.ts` lines 108–209 (the maintenance interfaces + their factories), plus a fresh import block. Exact content:

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { Contract } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import type { SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type FinalizedTxData, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';

import { type ContractProviders } from '../contract-providers';
import { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from './submit-replace-authority-tx';

/**
 * An interface for creating maintenance transactions for a specific circuit defined in a
 * given contract.
 */
export type CircuitMaintenanceTxInterface = {
  /**
   * Constructs and submits a transaction that removes the current verifier key stored
   * on the blockchain for this circuit at this contract's address.
   */
  removeVerifierKey(): Promise<FinalizedTxData>;
  /**
   * Constructs and submits a transaction that adds a new verifier key to the
   * blockchain for this circuit at this contract's address.
   *
   * @param newVk The new verifier key to add for this circuit.
   */
  insertVerifierKey(newVk: VerifierKey): Promise<FinalizedTxData>;
};

/**
 * Creates a {@link CircuitMaintenanceTxInterface}.
 */
export const createCircuitMaintenanceTxInterface = <C extends Contract.Any, PCK extends Contract.ProvableCircuitId<C>>(
  providers: ContractProviders<C, PCK>,
  circuitId: PCK,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress
): CircuitMaintenanceTxInterface => {
  assertIsContractAddress(contractAddress);
  return {
    removeVerifierKey(): Promise<FinalizedTxData> {
      return submitRemoveVerifierKeyTx(providers, compiledContract, contractAddress, circuitId);
    },
    insertVerifierKey(newVk: VerifierKey): Promise<FinalizedTxData> {
      return submitInsertVerifierKeyTx(providers, compiledContract, contractAddress, circuitId, newVk);
    }
  };
};

/**
 * A set of maintenance transaction creation interfaces, one for each circuit defined in
 * a given contract, keyed by the circuit name.
 */
export type CircuitMaintenanceTxInterfaces<C extends Contract.Any> = Record<Contract.ProvableCircuitId<C>, CircuitMaintenanceTxInterface>;

/**
 * Creates a {@link CircuitMaintenanceTxInterfaces}.
 */
export const createCircuitMaintenanceTxInterfaces = <C extends Contract.Any>(
  providers: ContractProviders<C>,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress
): CircuitMaintenanceTxInterfaces<C> => {
  assertIsContractAddress(contractAddress);
  return ContractExecutable.make(compiledContract).getProvableCircuitIds().reduce(
    (acc, circuitId) => ({
      ...acc,
      [circuitId]: createCircuitMaintenanceTxInterface(providers, circuitId, compiledContract, contractAddress)
    }),
    {}
  ) as CircuitMaintenanceTxInterfaces<C>;
};

/**
 * Interface for creating maintenance transactions for a contract that was deployed.
 */
export interface ContractMaintenanceTxInterface {
  /**
   * Constructs and submits a transaction that replaces the maintenance
   * authority stored on the blockchain for this contract.
   *
   * @param newAuthority The new contract maintenance authority for this contract.
   */
  replaceAuthority(newAuthority: SigningKey): Promise<FinalizedTxData>;
}

/**
 * Creates a {@link ContractMaintenanceTxInterface}.
 */
export const createContractMaintenanceTxInterface = <C extends Contract.Any>(
  providers: ContractProviders,
  compiledContract: CompiledContract.CompiledContract<C, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  contractAddress: ContractAddress
): ContractMaintenanceTxInterface => {
  assertIsContractAddress(contractAddress);
  return {
    replaceAuthority: submitReplaceAuthorityTx(providers, compiledContract, contractAddress)
  };
};
```

- [ ] **Step 4.2: Trim `src/tx-interfaces.ts` to call-side only**

Read the current file. Delete:
- The 4 imports related to maintenance: `submitInsertVerifierKeyTx`, `submitRemoveVerifierKeyTx`, `submitReplaceAuthorityTx`, plus any now-unused (`SigningKey`, `VerifierKey`, `FinalizedTxData` if not otherwise used). Use lint to catch leftovers.
- The whole maintenance region (originally lines ~108–209): `CircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterface`, `CircuitMaintenanceTxInterfaces`, `createCircuitMaintenanceTxInterfaces`, `ContractMaintenanceTxInterface`, `createContractMaintenanceTxInterface`.

After the edit the file should contain only: imports, `CircuitCallTxInterface`, `createCallTxOptions`, `createCircuitCallTxInterface`. Re-run lint to verify no unused imports.

- [ ] **Step 4.3: Update `src/deploy-contract.ts` lines 25–29**

Find:
```ts
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
```
Replace with:
```ts
import { createCircuitCallTxInterface } from './tx-interfaces';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
```

- [ ] **Step 4.4: Update `src/find-deployed-contract.ts` lines 32–39**

Find:
```ts
import {
  type CircuitCallTxInterface,
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
```
Replace with:
```ts
import {
  type CircuitCallTxInterface,
  createCircuitCallTxInterface
} from './tx-interfaces';
import {
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './governance/tx-interfaces';
```

- [ ] **Step 4.5: Split `vi.mock` in `src/test/deploy-contract.test.ts`**

Find lines 38–42:
```ts
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```
Replace with:
```ts
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' })
}));

vi.mock('../governance/tx-interfaces', () => ({
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```

- [ ] **Step 4.6: Split `vi.mock` in `src/test/find-deployed-contract.test.ts`**

Find lines 31–35:
```ts
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```
Replace with the same two-`vi.mock` block as 4.5.

- [ ] **Step 4.7: Update `src/index.ts` re-exports for the maintenance interfaces**

Find this block (currently around lines 71–80):
```ts
export {
  CircuitCallTxInterface,
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCallTxOptions,
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface} from './tx-interfaces';
```
Replace with:
```ts
export {
  CircuitCallTxInterface,
  createCallTxOptions,
  createCircuitCallTxInterface} from './tx-interfaces';
export {
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface} from './governance/tx-interfaces';
```

- [ ] **Step 4.8: Create `src/test/governance/tx-interfaces.test.ts` with maintenance describe-blocks**

Open the current `src/test/tx-interfaces.test.ts` for reference. Extract the three describe-blocks (around lines 248–338):
- `createCircuitMaintenanceTxInterface`
- `createCircuitMaintenanceTxInterfaces`
- `createContractMaintenanceTxInterface`

Write `src/test/governance/tx-interfaces.test.ts` with this skeleton, then paste the bodies of the three describe-blocks from the original verbatim:

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from '../../governance/tx-interfaces';
import {
  createMockCompiledContract,
  createMockContractAddress,
  createMockFinalizedTxData,
  createMockProviders
} from '../test-mocks';

vi.mock('../../governance/submit-insert-vk-tx');
vi.mock('../../governance/submit-remove-vk-tx');
vi.mock('../../governance/submit-replace-authority-tx');

describe('governance/tx-interfaces', () => {
  let mockCompiledContract: ReturnType<typeof createMockCompiledContract>;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockFinalizedTxData: ReturnType<typeof createMockFinalizedTxData>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompiledContract = createMockCompiledContract();
    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockFinalizedTxData = createMockFinalizedTxData();
  });

  // PASTE here verbatim the three describe-blocks from
  // src/test/tx-interfaces.test.ts (lines ~248-338):
  //   describe('createCircuitMaintenanceTxInterface', () => { ... });
  //   describe('createCircuitMaintenanceTxInterfaces', () => { ... });
  //   describe('createContractMaintenanceTxInterface', () => { ... });
  // The bodies reference `submitRemoveVerifierKeyTx` and `submitInsertVerifierKeyTx`
  // dynamically via `await import('../submit-remove-vk-tx')` etc. — rewrite those
  // to `await import('../../governance/submit-remove-vk-tx')` and
  // `await import('../../governance/submit-insert-vk-tx')` respectively.
});
```

Important: only paste the maintenance describe-blocks. The dynamic `await import('../submit-…')` paths inside them must be updated to `await import('../../governance/submit-…')`.

- [ ] **Step 4.9: Trim `src/test/tx-interfaces.test.ts` to call-only**

Open the file. Remove:
1. Lines 35–37 (the 3 governance mocks): `vi.mock('../submit-insert-vk-tx')`, `vi.mock('../submit-remove-vk-tx')`, `vi.mock('../submit-replace-authority-tx')`. Keep `vi.mock('../submit-call-tx')`.
2. The 3 maintenance describe-blocks (lines ~248–338): `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface`.
3. The 4 unused imports at the top: `createCircuitMaintenanceTxInterface`, `createCircuitMaintenanceTxInterfaces`, `createContractMaintenanceTxInterface` (line 22–24), and the `VerifierKey` type import on line 16 (only used by the maintenance test).

After the edit, the file tests only `createCallTxOptions` and `createCircuitCallTxInterface`. Re-run lint to catch unused imports.

- [ ] **Step 4.10: Verify import shape**

```bash
rg "from '\\./tx-interfaces'" packages/contracts/src
```
Expected: `index.ts`, `deploy-contract.ts`, `find-deployed-contract.ts` (and possibly `tx-interfaces.ts` itself via re-exports — but it shouldn't have any).

```bash
rg "from '\\./governance/tx-interfaces'" packages/contracts/src
```
Expected: `index.ts`, `deploy-contract.ts`, `find-deployed-contract.ts`.

- [ ] **Step 4.11: Run tests, build, lint**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
```
Expected: all green.

- [ ] **Step 4.12: Commit**

```bash
git add -A packages/contracts/src
git commit -m "$(cat <<'EOF'
refactor(contracts): split tx-interfaces into call (kept) and governance/tx-interfaces

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Governance barrel + final cleanup

**Goal:** Add `src/governance/index.ts` and simplify the root `src/index.ts` re-exports to a single explicit import block from the governance barrel. Verify the public surface is byte-equivalent to `main`.

**Files:**
- Create: `packages/contracts/src/governance/index.ts`
- Modify: `packages/contracts/src/index.ts` (consolidate governance re-exports)

- [ ] **Step 5.1: Create `src/governance/index.ts`**

Write the file:

```ts
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export {
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError
} from './errors';
export { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
export { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
export { submitReplaceAuthorityTx } from './submit-replace-authority-tx';
export {
  type CircuitMaintenanceTxInterface,
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
// Note: ./unproven-tx is intentionally NOT re-exported.
// Its helpers are package-private (only consumed by the submit-*.ts files in this directory).
```

- [ ] **Step 5.2: Consolidate `src/index.ts` governance re-exports**

The root `src/index.ts` should now route all governance symbols through the new barrel. Find the three governance re-export blocks added in earlier tasks:

```ts
export {
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError} from './governance/errors';
```
and
```ts
export { submitInsertVerifierKeyTx } from './governance/submit-insert-vk-tx';
export { submitRemoveVerifierKeyTx } from './governance/submit-remove-vk-tx';
export { submitReplaceAuthorityTx } from './governance/submit-replace-authority-tx';
```
and
```ts
export {
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface} from './governance/tx-interfaces';
```

Replace all three with one consolidated block:

```ts
export {
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
  InsertVerifierKeyTxFailedError,
  RemoveVerifierKeyTxFailedError,
  ReplaceMaintenanceAuthorityTxFailedError,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx} from './governance';
```

Note: **explicit list, not `export * from './governance';`**, to keep `dist/index.d.ts` deterministic and the symbol-diff check stable.

- [ ] **Step 5.3: Build and run the public-surface diff against `main`**

```bash
# Build current branch
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts

# Build main in an isolated worktree
git worktree add /tmp/contracts-main main
( cd /tmp/contracts-main && yarn install --immutable )
( cd /tmp/contracts-main && yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts )

# Tokenized diff
grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\b' packages/contracts/dist/index.d.ts | sort -u > /tmp/branch-syms.txt
grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\b' /tmp/contracts-main/packages/contracts/dist/index.d.ts | sort -u > /tmp/main-syms.txt

comm -3 /tmp/main-syms.txt /tmp/branch-syms.txt

# Clean up
git worktree remove /tmp/contracts-main
```

Expected: `comm -3` prints **no output** (no symbol added, none removed).

If output is non-empty:
- Lines without leading tab → only in `main` (i.e., missing from branch — usually an unexported moved symbol)
- Lines with leading tab → only on branch (i.e., accidentally added — usually a private helper exposed)
Fix whichever side has the diff before proceeding.

- [ ] **Step 5.4: Sweep for stale `../utils` mocks targeting governance helpers**

```bash
rg "vi.mock\('\\.\\./utils'\)" packages/contracts/src
```
Expected: only matches in `src/test/unproven-call-tx.test.ts:43` and `src/test/unproven-deploy-tx.test.ts:33` — both legitimately mock `'../utils'` for call/deploy ledger helpers with their own explicit factories. If any other test still mocks `'../utils'` for a governance helper, fix it.

- [ ] **Step 5.5: Verify the §11 success criteria from the spec**

Run these checks; all should pass:

```bash
# Criterion 3: governance/ contains exactly 7 source files
ls packages/contracts/src/governance/ | sort
# Expected: errors.ts  index.ts  submit-insert-vk-tx.ts  submit-remove-vk-tx.ts  submit-replace-authority-tx.ts  tx-interfaces.ts  unproven-tx.ts

# Criterion 4: test/governance/ contains exactly 5 test files
ls packages/contracts/src/test/governance/ | sort
# Expected: submit-insert-vk-tx.test.ts  submit-remove-vk-tx.test.ts  submit-replace-authority-tx.test.ts  tx-interfaces.test.ts  unproven-tx.test.ts

# Criterion 6: non-governance source files importing from ./governance/
rg --type ts -g '!**/test/**' "from '\\./governance/" packages/contracts/src
# Expected: src/index.ts (one line), src/deploy-contract.ts (one line), src/find-deployed-contract.ts (one line),
#           src/tx-interfaces.ts (zero — verify), and may include src/governance/index.ts (which re-exports siblings via './errors' etc., not './governance/' — so should NOT appear).
```

- [ ] **Step 5.6: Run full monorepo check from the root**

```bash
yarn workspace @midnight-ntwrk/midnight-js-contracts test
yarn turbo run build --filter=@midnight-ntwrk/midnight-js-contracts
yarn lint
yarn check:core
```
Expected: all green. `yarn check:core` runs turbo's `check` across non-testkit packages plus lint, exercising downstream `midnight-js` namespace re-exports.

- [ ] **Step 5.7: Verify testkit-js-e2e still typechecks against the refactored package (best-effort)**

```bash
yarn workspace @midnight-ntwrk/midnight-js-testkit-js-e2e run build
```
Expected: succeeds. If it fails on a governance symbol, the consumer test is now misaligned and indicates a public-surface regression that the §6 diff missed.

(If the e2e workspace name differs from `@midnight-ntwrk/midnight-js-testkit-js-e2e`, run `cat testkit-js/testkit-js-e2e/package.json | grep '"name"'` first and use the actual name.)

- [ ] **Step 5.8: Commit**

```bash
git add packages/contracts/src/governance/index.ts \
        packages/contracts/src/index.ts

git commit -m "$(cat <<'EOF'
refactor(contracts): add governance barrel and finalize index.ts re-exports

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Self-review checklist

**Goal:** Confirm the refactor matches every spec requirement before declaring done.

- [ ] **Step 6.1: Spec coverage cross-check**

Re-read `docs/superpowers/specs/2026-05-21-contracts-governance-separation-design.md` §11 (Success criteria). For each numbered criterion, verify by running the relevant command:

1. ✅ All 5 commits green — confirmed at end of each task
2. ✅ `dist/index.d.ts` symbol set matches main — Step 5.3
3. ✅ governance/ has exactly 7 files — Step 5.5
4. ✅ test/governance/ has exactly 5 files — Step 5.5
5. ✅ no stale `vi.mock('../utils')` targeting governance helpers — Step 5.4
6. ✅ governance/ imports only from expected files — Step 5.5
7. ✅ testkit-js-e2e governance tests compile and run — Step 5.7 (build-only check; runtime e2e tests gated by `[skip_it]` and Docker setup, not part of this verification)

- [ ] **Step 6.2: Inspect git log for clean commit history**

```bash
git log --oneline main..HEAD
```
Expected: exactly 5 commits, each with a `refactor(contracts):` subject line corresponding to Tasks 1-5.

- [ ] **Step 6.3: Inspect diff size sanity check**

```bash
git diff main..HEAD --stat | tail -20
```
Expected: changes are concentrated in `packages/contracts/src/` and `packages/contracts/src/test/`. The largest moves should be the 6 `git mv` operations (3 sources + 3 tests).

- [ ] **Step 6.4: Push to remote (only if instructed)**

The user has not authorized a push. Stop here unless explicitly asked. If asked:

```bash
git push -u origin refactor/contracts-governance-separation
```

---

## Notes for the executing engineer

- **Edit order within each task matters.** Each step is bite-sized so that if any one step breaks the build, the previous step's commit point still passes. Don't merge steps.
- **Use `Read` before `Edit`** on every modify operation — the spec gives line numbers from a snapshot, but exact ranges may shift if earlier tasks rewrote the file. The harness will refuse `Edit` calls that didn't `Read` first.
- **Lint is the safety net for unused imports.** After removing code, always re-run `yarn lint` — `eslint-plugin-unused-imports` catches imports orphaned by the deletion.
- **Test factories paths are case-sensitive on Linux CI.** `governance/` with lowercase `g` everywhere.
- **`vi.mock` factories are hoisted** by vitest, so the order of `vi.mock('...')` lines vs. `import` lines in source doesn't matter for runtime, but ESLint's import-order rule expects mocks AFTER imports. Keep them grouped together after the imports block, as they are today.

## Spec gap noted during plan-write

The spec's §8 step 1 didn't list the 3 source-import updates (in `submit-*.ts`) or the 3 dynamic test-import updates (`await import('../errors')`). The plan's Task 1.2–1.5 covers them explicitly. Consider folding this back into the spec for completeness, but the plan as written is self-sufficient.
