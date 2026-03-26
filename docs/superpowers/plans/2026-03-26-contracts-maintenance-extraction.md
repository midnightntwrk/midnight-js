# Contracts Maintenance Subdirectory Extraction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the `packages/contracts/src` package by extracting maintenance/governance code into an internal `src/maintenance/` subdirectory while preserving all public API exports.

**Architecture:** Pure internal restructuring — no new packages, no API changes, no behavior changes. Move 3 submit files, extract maintenance errors/utils/interfaces into `src/maintenance/`, update all internal imports, and re-export everything from the package barrel (`index.ts`) unchanged. This is a refactoring-only change verified by the existing test suite passing.

**Tech Stack:** TypeScript 5.8.x, Vitest, Yarn 4.x, Turbo

---

## File Structure

### New files to create

| File | Responsibility |
|------|---------------|
| `src/maintenance/errors.ts` | 3 maintenance-specific error classes (`ReplaceMaintenanceAuthorityTxFailedError`, `RemoveVerifierKeyTxFailedError`, `InsertVerifierKeyTxFailedError`) |
| `src/maintenance/utils.ts` | 4 unproven tx builders for maintenance operations + `unprovenTxFromContractUpdates` helper |
| `src/maintenance/submit-replace-authority-tx.ts` | Moved from `src/submit-replace-authority-tx.ts` with updated imports |
| `src/maintenance/submit-insert-vk-tx.ts` | Moved from `src/submit-insert-vk-tx.ts` with updated imports |
| `src/maintenance/submit-remove-vk-tx.ts` | Moved from `src/submit-remove-vk-tx.ts` with updated imports |
| `src/maintenance/tx-interfaces.ts` | Maintenance interface types and factories extracted from `src/tx-interfaces.ts` |
| `src/maintenance/index.ts` | Barrel export for the maintenance subdirectory |
| `src/test/maintenance/submit-replace-authority-tx.test.ts` | Moved test with updated import/mock paths |
| `src/test/maintenance/submit-insert-vk-tx.test.ts` | Moved test with updated import/mock paths |
| `src/test/maintenance/submit-remove-vk-tx.test.ts` | Moved test with updated import/mock paths |
| `src/test/maintenance/tx-interfaces.test.ts` | Extracted maintenance interface tests from `src/test/tx-interfaces.test.ts` |

### Files to modify

| File | Change |
|------|--------|
| `src/errors.ts` | Remove 3 maintenance error classes |
| `src/utils/ledger-utils.ts` | Remove 4 maintenance utility functions + `unprovenTxFromContractUpdates` |
| `src/tx-interfaces.ts` | Remove maintenance types/factories, keep call-related code |
| `src/index.ts` | Update import paths for maintenance exports |
| `src/deploy-contract.ts` | Update import from `./tx-interfaces` → `./maintenance/tx-interfaces` for maintenance factories |
| `src/find-deployed-contract.ts` | Update import from `./tx-interfaces` → `./maintenance/tx-interfaces` for maintenance types/factories |
| `src/test/tx-interfaces.test.ts` | Remove maintenance interface test blocks |
| `src/test/deploy-contract.test.ts` | Update `vi.mock('../tx-interfaces')` mock setup |
| `src/test/find-deployed-contract.test.ts` | Update `vi.mock('../tx-interfaces')` mock setup |

### Files to delete (after content moved)

| File | Replaced by |
|------|-------------|
| `src/submit-replace-authority-tx.ts` | `src/maintenance/submit-replace-authority-tx.ts` |
| `src/submit-insert-vk-tx.ts` | `src/maintenance/submit-insert-vk-tx.ts` |
| `src/submit-remove-vk-tx.ts` | `src/maintenance/submit-remove-vk-tx.ts` |
| `src/test/submit-replace-authority-tx.test.ts` | `src/test/maintenance/submit-replace-authority-tx.test.ts` |
| `src/test/submit-insert-vk-tx.test.ts` | `src/test/maintenance/submit-insert-vk-tx.test.ts` |
| `src/test/submit-remove-vk-tx.test.ts` | `src/test/maintenance/submit-remove-vk-tx.test.ts` |

---

## Constraints

- **Zero public API changes:** Every export from `packages/contracts/src/index.ts` must remain exported with the same name and type after the refactor.
- **All existing tests must pass** after each task completes.
- **No new dependencies:** The maintenance subdirectory uses only existing package dependencies.
- **E2E tests are untouched:** Files in `testkit-js/testkit-js-e2e/test/contracts.snarkupgrade*.test.ts` import from `@midnight-ntwrk/midnight-js-contracts` (the package barrel), not internal paths. Since the barrel doesn't change, these tests are unaffected.

---

## Task 1: Create `src/maintenance/errors.ts`

**Files:**
- Create: `packages/contracts/src/maintenance/errors.ts`

- [ ] **Step 1: Create the maintenance errors file**

Extract the 3 maintenance-specific error classes from `src/errors.ts`. These extend `TxFailedError` which remains in `src/errors.ts`:

```typescript
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

export class ReplaceMaintenanceAuthorityTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'ReplaceMaintenanceAuthorityTxFailedError';
  }
}

export class RemoveVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'RemoveVerifierKeyTxFailedError';
  }
}

export class InsertVerifierKeyTxFailedError extends TxFailedError {
  constructor(finalizedTxData: FinalizedTxData) {
    super(finalizedTxData);
    this.name = 'InsertVerifierKeyTxFailedError';
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd packages/contracts && npx tsc --noEmit src/maintenance/errors.ts`
Expected: No errors.

---

## Task 2: Create `src/maintenance/utils.ts`

**Files:**
- Create: `packages/contracts/src/maintenance/utils.ts`

- [ ] **Step 1: Create the maintenance utils file**

Extract from `src/utils/ledger-utils.ts` the 4 maintenance-specific functions. These have their own imports distinct from the core ledger utils:

```typescript
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

import { type CompiledContract, ContractExecutable } from '@midnight-ntwrk/compact-js';
import { type Contract, ProvableCircuitId, VerifierKey as ContractVerifierKey } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  type CoinPublicKey,
  type ContractAddress,
  ContractState,
  type SigningKey
} from '@midnight-ntwrk/compact-runtime';
import {
  Intent,
  type MaintenanceUpdate,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger-v8';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
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
}

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
}

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
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd packages/contracts && npx tsc --noEmit src/maintenance/utils.ts`
Expected: No errors.

---

## Task 3: Move submit tx files to `src/maintenance/`

**Files:**
- Create: `packages/contracts/src/maintenance/submit-replace-authority-tx.ts`
- Create: `packages/contracts/src/maintenance/submit-insert-vk-tx.ts`
- Create: `packages/contracts/src/maintenance/submit-remove-vk-tx.ts`

- [ ] **Step 1: Create `src/maintenance/submit-replace-authority-tx.ts`**

Copy `src/submit-replace-authority-tx.ts` content, updating imports:
- `'./errors'` → `'./errors'` (now references maintenance/errors)
- `'./submit-tx'` → `'../submit-tx'`
- `'./contract-providers'` → `'../contract-providers'`
- `'./utils'` → `'./utils'` (now references maintenance/utils)

Key import changes:
```typescript
import { type ContractProviders } from '../contract-providers';
import { ReplaceMaintenanceAuthorityTxFailedError } from './errors';
import { submitTx } from '../submit-tx';
import { createUnprovenReplaceAuthorityTx } from './utils';
```

- [ ] **Step 2: Create `src/maintenance/submit-insert-vk-tx.ts`**

Copy `src/submit-insert-vk-tx.ts` content, updating imports:
```typescript
import { type ContractProviders } from '../contract-providers';
import { InsertVerifierKeyTxFailedError } from './errors';
import { submitTx } from '../submit-tx';
import { createUnprovenInsertVerifierKeyTx } from './utils';
```

- [ ] **Step 3: Create `src/maintenance/submit-remove-vk-tx.ts`**

Copy `src/submit-remove-vk-tx.ts` content, updating imports:
```typescript
import { type ContractProviders } from '../contract-providers';
import { RemoveVerifierKeyTxFailedError } from './errors';
import { submitTx } from '../submit-tx';
import { createUnprovenRemoveVerifierKeyTx } from './utils';
```

- [ ] **Step 4: Verify all 3 files compile**

Run: `cd packages/contracts && npx tsc --noEmit src/maintenance/submit-replace-authority-tx.ts src/maintenance/submit-insert-vk-tx.ts src/maintenance/submit-remove-vk-tx.ts`
Expected: No errors.

---

## Task 4: Create `src/maintenance/tx-interfaces.ts`

**Files:**
- Create: `packages/contracts/src/maintenance/tx-interfaces.ts`

- [ ] **Step 1: Create maintenance tx-interfaces file**

Extract from `src/tx-interfaces.ts` the maintenance-specific types and factories:

```typescript
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * ... (same license header)
 */

import type { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { ContractAddress } from '@midnight-ntwrk/ledger-v8';
import { type FinalizedTxData, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { ContractExecutable } from '@midnight-ntwrk/compact-js';

import { type ContractProviders } from '../contract-providers';
import { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from './submit-replace-authority-tx';

export type CircuitMaintenanceTxInterface = {
  removeVerifierKey(): Promise<FinalizedTxData>;
  insertVerifierKey(newVk: VerifierKey): Promise<FinalizedTxData>;
}

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

export type CircuitMaintenanceTxInterfaces<C extends Contract.Any> = Record<Contract.ProvableCircuitId<C>, CircuitMaintenanceTxInterface>;

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

export interface ContractMaintenanceTxInterface {
  replaceAuthority(newAuthority: SigningKey): Promise<FinalizedTxData>;
}

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

- [ ] **Step 2: Verify the file compiles**

Run: `cd packages/contracts && npx tsc --noEmit src/maintenance/tx-interfaces.ts`
Expected: No errors.

---

## Task 5: Create `src/maintenance/index.ts` barrel export

**Files:**
- Create: `packages/contracts/src/maintenance/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
 * ... (same license header)
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
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
```

- [ ] **Step 2: Verify the barrel compiles**

Run: `cd packages/contracts && npx tsc --noEmit src/maintenance/index.ts`
Expected: No errors.

---

## Task 6: Update `src/index.ts` to import from maintenance

**Files:**
- Modify: `packages/contracts/src/index.ts:44-51,66-80`

- [ ] **Step 1: Update maintenance error imports**

Replace:
```typescript
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

With:
```typescript
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
  ReplaceMaintenanceAuthorityTxFailedError
} from './maintenance';
```

- [ ] **Step 2: Update maintenance submit tx imports**

Replace:
```typescript
export { submitInsertVerifierKeyTx } from './submit-insert-vk-tx';
export { submitRemoveVerifierKeyTx } from './submit-remove-vk-tx';
export { submitReplaceAuthorityTx } from './submit-replace-authority-tx';
```

With:
```typescript
export { submitInsertVerifierKeyTx } from './maintenance';
export { submitRemoveVerifierKeyTx } from './maintenance';
export { submitReplaceAuthorityTx } from './maintenance';
```

Or combined:
```typescript
export {
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from './maintenance';
```

- [ ] **Step 3: Update maintenance tx-interface imports**

Replace:
```typescript
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

With:
```typescript
export {
  CircuitCallTxInterface,
  createCallTxOptions,
  createCircuitCallTxInterface
} from './tx-interfaces';
export {
  CircuitMaintenanceTxInterface,
  CircuitMaintenanceTxInterfaces,
  ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './maintenance';
```

- [ ] **Step 4: Verify index compiles (will fail until source files updated in next tasks)**

Note: This step may show errors until Task 8 and 9 are complete. That's expected.

---

## Task 7: Update consumer source files

**Files:**
- Modify: `packages/contracts/src/deploy-contract.ts:24-28`
- Modify: `packages/contracts/src/find-deployed-contract.ts:32-39`

- [ ] **Step 1: Update `deploy-contract.ts` imports**

Replace:
```typescript
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
```

With:
```typescript
import { createCircuitCallTxInterface } from './tx-interfaces';
import {
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './maintenance/tx-interfaces';
```

- [ ] **Step 2: Update `find-deployed-contract.ts` imports**

Replace:
```typescript
import {
  type CircuitCallTxInterface,
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './tx-interfaces';
```

With:
```typescript
import {
  type CircuitCallTxInterface,
  createCircuitCallTxInterface
} from './tx-interfaces';
import {
  type CircuitMaintenanceTxInterfaces,
  type ContractMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface
} from './maintenance/tx-interfaces';
```

---

## Task 8: Clean up original source files

**Files:**
- Modify: `packages/contracts/src/errors.ts`
- Modify: `packages/contracts/src/utils/ledger-utils.ts`
- Modify: `packages/contracts/src/tx-interfaces.ts`
- Delete: `packages/contracts/src/submit-replace-authority-tx.ts`
- Delete: `packages/contracts/src/submit-insert-vk-tx.ts`
- Delete: `packages/contracts/src/submit-remove-vk-tx.ts`

- [ ] **Step 1: Remove maintenance errors from `src/errors.ts`**

Remove the 3 classes (lines 122-150 approximately):
- `ReplaceMaintenanceAuthorityTxFailedError`
- `RemoveVerifierKeyTxFailedError`
- `InsertVerifierKeyTxFailedError`

Keep all other error classes.

- [ ] **Step 2: Remove maintenance utils from `src/utils/ledger-utils.ts`**

Remove 4 functions (lines 160-251 approximately):
- `unprovenTxFromContractUpdates`
- `createUnprovenReplaceAuthorityTx`
- `createUnprovenRemoveVerifierKeyTx`
- `createUnprovenInsertVerifierKeyTx`

Also remove imports that are now unused after the removal:
- `ProvableCircuitId`, `VerifierKey as ContractVerifierKey` from `@midnight-ntwrk/compact-js/effect/Contract`
- `CoinPublicKey`, `SigningKey` from `@midnight-ntwrk/compact-runtime`
- `MaintenanceUpdate` from `@midnight-ntwrk/ledger-v8`
- `asContractAddress`, `asEffectOption`, `makeContractExecutableRuntime`, `VerifierKey`, `ZKConfigProvider` from `@midnight-ntwrk/midnight-js-types`
- `ttlOneHour` from `@midnight-ntwrk/midnight-js-utils`

Be careful: some imports may still be needed by the remaining code. Check each one. Specifically:
- `ContractExecutable` is still used by `createUnprovenLedgerCallTx` — **keep it**
- `ContractState` is still used — **keep it**
- `ContractAddress` is still used by `createUnprovenLedgerCallTx` — **keep it**
- `getNetworkId` is still used — **keep it**
- `Transaction` is still used — **keep it**

Run lint to catch unused imports: `cd packages/contracts && yarn lint`

- [ ] **Step 3: Remove maintenance types/factories from `src/tx-interfaces.ts`**

Remove (lines 105-206 approximately):
- `CircuitMaintenanceTxInterface` type
- `createCircuitMaintenanceTxInterface` factory
- `CircuitMaintenanceTxInterfaces` type
- `createCircuitMaintenanceTxInterfaces` factory
- `ContractMaintenanceTxInterface` interface
- `createContractMaintenanceTxInterface` factory

Also remove now-unused imports:
- `submitInsertVerifierKeyTx` from `'./submit-insert-vk-tx'` (file is deleted)
- `submitRemoveVerifierKeyTx` from `'./submit-remove-vk-tx'` (file is deleted)
- `submitReplaceAuthorityTx` from `'./submit-replace-authority-tx'` (file is deleted)
- `type SigningKey` from `'@midnight-ntwrk/compact-runtime'` → check if still used (it was only for `ContractMaintenanceTxInterface.replaceAuthority`)
- `type FinalizedTxData` from types → check if still used
- `type VerifierKey` from types → check if still used

Keep: `CompiledContract`, `ContractExecutable`, `Contract`, `ContractAddress`, `PrivateStateId`, `assertIsContractAddress`, `ContractProviders`, `submitCallTx`, `Transaction`, `FinalizedCallTxData`, `CallTxOptions`, `CallTxOptionsWithPrivateStateId`

- [ ] **Step 4: Delete old submit files**

```bash
rm packages/contracts/src/submit-replace-authority-tx.ts
rm packages/contracts/src/submit-insert-vk-tx.ts
rm packages/contracts/src/submit-remove-vk-tx.ts
```

- [ ] **Step 5: Verify the project compiles**

Run: `cd packages/contracts && yarn build`
Expected: Build succeeds.

---

## Task 9: Move and update test files

**Files:**
- Create: `packages/contracts/src/test/maintenance/submit-replace-authority-tx.test.ts`
- Create: `packages/contracts/src/test/maintenance/submit-insert-vk-tx.test.ts`
- Create: `packages/contracts/src/test/maintenance/submit-remove-vk-tx.test.ts`
- Create: `packages/contracts/src/test/maintenance/tx-interfaces.test.ts`
- Modify: `packages/contracts/src/test/tx-interfaces.test.ts`
- Modify: `packages/contracts/src/test/deploy-contract.test.ts`
- Modify: `packages/contracts/src/test/find-deployed-contract.test.ts`
- Delete: `packages/contracts/src/test/submit-replace-authority-tx.test.ts`
- Delete: `packages/contracts/src/test/submit-insert-vk-tx.test.ts`
- Delete: `packages/contracts/src/test/submit-remove-vk-tx.test.ts`

- [ ] **Step 1: Create `src/test/maintenance/submit-replace-authority-tx.test.ts`**

Copy from old test, update import and mock paths:
```typescript
// Imports change:
import { submitReplaceAuthorityTx } from '../../maintenance/submit-replace-authority-tx';
import { submitTx } from '../../submit-tx';
import { createUnprovenReplaceAuthorityTx } from '../../maintenance/utils';
import { ... } from '../test-mocks';

// Mocks change:
vi.mock('../../submit-tx');
vi.mock('../../maintenance/utils');

// Error import changes:
const { ReplaceMaintenanceAuthorityTxFailedError } = await import('../../maintenance/errors');
```

- [ ] **Step 2: Create `src/test/maintenance/submit-insert-vk-tx.test.ts`**

Same pattern — update paths:
```typescript
import { submitInsertVerifierKeyTx } from '../../maintenance/submit-insert-vk-tx';
import { submitTx } from '../../submit-tx';
import { createUnprovenInsertVerifierKeyTx } from '../../maintenance/utils';
import { ... } from '../test-mocks';

vi.mock('../../submit-tx');
vi.mock('../../maintenance/utils');

const { InsertVerifierKeyTxFailedError } = await import('../../maintenance/errors');
```

- [ ] **Step 3: Create `src/test/maintenance/submit-remove-vk-tx.test.ts`**

Same pattern:
```typescript
import { submitRemoveVerifierKeyTx } from '../../maintenance/submit-remove-vk-tx';
import { submitTx } from '../../submit-tx';
import { createUnprovenRemoveVerifierKeyTx } from '../../maintenance/utils';
import { ... } from '../test-mocks';

vi.mock('../../submit-tx');
vi.mock('../../maintenance/utils');

const { RemoveVerifierKeyTxFailedError } = await import('../../maintenance/errors');
```

- [ ] **Step 4: Create `src/test/maintenance/tx-interfaces.test.ts`**

Extract the 3 maintenance describe blocks from `src/test/tx-interfaces.test.ts`:
- `describe('createCircuitMaintenanceTxInterface', ...)`
- `describe('createCircuitMaintenanceTxInterfaces', ...)`
- `describe('createContractMaintenanceTxInterface', ...)`

Update imports:
```typescript
import {
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
} from '../../maintenance/tx-interfaces';
import { ... } from '../test-mocks';

vi.mock('../../maintenance/submit-insert-vk-tx');
vi.mock('../../maintenance/submit-remove-vk-tx');
vi.mock('../../maintenance/submit-replace-authority-tx');
```

Update dynamic imports in test bodies:
```typescript
// Old:
const { submitRemoveVerifierKeyTx } = await import('../submit-remove-vk-tx');
// New:
const { submitRemoveVerifierKeyTx } = await import('../../maintenance/submit-remove-vk-tx');

// Old:
const { submitInsertVerifierKeyTx } = await import('../submit-insert-vk-tx');
// New:
const { submitInsertVerifierKeyTx } = await import('../../maintenance/submit-insert-vk-tx');
```

- [ ] **Step 5: Update `src/test/tx-interfaces.test.ts`**

Remove the 3 maintenance describe blocks (they've been moved). Remove the now-unused imports:
- `createCircuitMaintenanceTxInterface`
- `createCircuitMaintenanceTxInterfaces`
- `createContractMaintenanceTxInterface`

Remove the now-unused mock declarations:
```typescript
// Remove these lines:
vi.mock('../submit-insert-vk-tx');
vi.mock('../submit-remove-vk-tx');
vi.mock('../submit-replace-authority-tx');
```

Keep:
- `createCallTxOptions` import
- `createCircuitCallTxInterface` import
- `vi.mock('../submit-call-tx')` mock
- The `describe('createCallTxOptions')` and `describe('createCircuitCallTxInterface')` blocks

- [ ] **Step 6: Update `src/test/deploy-contract.test.ts` mock**

The mock for `'../tx-interfaces'` currently mocks all 3 factories. Since `deploy-contract.ts` now imports call interfaces from `'../tx-interfaces'` and maintenance interfaces from `'../maintenance/tx-interfaces'`, update the mocks:

Replace:
```typescript
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```

With:
```typescript
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' })
}));

vi.mock('../maintenance/tx-interfaces', () => ({
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```

- [ ] **Step 7: Update `src/test/find-deployed-contract.test.ts` mock**

Same change as deploy-contract.test.ts:

Replace:
```typescript
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```

With:
```typescript
vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' })
}));

vi.mock('../maintenance/tx-interfaces', () => ({
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));
```

- [ ] **Step 8: Delete old test files**

```bash
rm packages/contracts/src/test/submit-replace-authority-tx.test.ts
rm packages/contracts/src/test/submit-insert-vk-tx.test.ts
rm packages/contracts/src/test/submit-remove-vk-tx.test.ts
```

---

## Task 10: Verify everything passes

**Files:** None (verification only)

- [ ] **Step 1: Run linter**

Run: `cd packages/contracts && yarn lint`
Expected: No errors. Fix any unused import warnings.

- [ ] **Step 2: Run lint fix if needed**

Run: `cd packages/contracts && yarn lint:fix`

- [ ] **Step 3: Run unit tests**

Run: `cd packages/contracts && yarn test`
Expected: All tests pass.

- [ ] **Step 4: Run build**

Run: `cd packages/contracts && yarn build`
Expected: Build succeeds. `dist/` output has all the same exports as before.

- [ ] **Step 5: Verify public API is unchanged**

Quick check: diff the type declarations before and after. The `dist/index.d.ts` (or `.d.mts`) should export the exact same set of symbols.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/maintenance/ packages/contracts/src/
git commit -m "refactor(contracts): extract maintenance code into src/maintenance subdirectory

Move governance/maintenance-related code (submit-replace-authority-tx,
submit-insert-vk-tx, submit-remove-vk-tx, maintenance errors, utils,
and tx-interfaces) into a dedicated src/maintenance/ subdirectory.

No public API changes - all exports remain identical."
```
