# Wallet Adapter Extraction to midnight-js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the `ConnectedAPI` → `WalletProvider` + `MidnightProvider` bridge into a reusable `@midnight-ntwrk/midnight-js-wallet-adapter` package in midnight-js, then update midnight-wallet-dapp to consume it.

**Architecture:** A new package in `packages/wallet-adapter` provides a factory function `createWalletAndMidnightProvider(connectedAPI)` that returns `{ walletProvider, midnightProvider, shieldedAddress }`. It handles hex serialization, address resolution, and transaction lifecycle. The dapp replaces its local `walletAdapter.ts` with an import from this package.

**Tech Stack:** TypeScript, vitest, rollup (shared factory), yarn 4 workspaces, turbo

---

## Scope

**Two repos involved:**
1. `midnight-js` — new package creation (Tasks 1–5)
2. `midnight-wallet-dapp` — consumer migration (Task 6)

These are independent Git repos. Task 6 depends on Tasks 1–5 being published.

## File Structure

### New files in midnight-js

```
packages/wallet-adapter/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── rollup.config.mjs
├── vitest.config.ts
├── typedoc.json
├── src/
│   ├── index.ts                          # barrel export
│   ├── hex-utils.ts                      # uint8ArrayToHex, hexToUint8Array
│   ├── wallet-adapter.ts                 # createWalletAndMidnightProvider factory
│   └── test/
│       ├── hex-utils.test.ts
│       └── wallet-adapter.test.ts
```

### Modified files in midnight-wallet-dapp

```
src/lib/walletAdapter.ts     → DELETE (replaced by package import)
src/lib/providers.ts          → MODIFY (import from new package instead of local walletAdapter)
```

---

## Task 1: Scaffold the package

**Files:**
- Create: `packages/wallet-adapter/package.json`
- Create: `packages/wallet-adapter/tsconfig.json`
- Create: `packages/wallet-adapter/tsconfig.build.json`
- Create: `packages/wallet-adapter/rollup.config.mjs`
- Create: `packages/wallet-adapter/vitest.config.ts`
- Create: `packages/wallet-adapter/typedoc.json`
- Create: `packages/wallet-adapter/src/index.ts`

**Working directory:** `/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-js`

- [ ] **Step 1: Create package.json**

> **Important:** Before creating, verify the current monorepo version by checking `packages/types/package.json`. The versions below assume `4.0.2` — adjust if the monorepo is at a different version.

```json
{
  "name": "@midnight-ntwrk/midnight-js-wallet-adapter",
  "version": "4.0.2",
  "description": "Wallet adapter bridging dapp-connector-api ConnectedAPI to MidnightProviders wallet and midnight providers",
  "license": "Apache-2.0",
  "author": "IOHK",
  "repository": "git@github.com:midnight-ntwrk/artifacts",
  "packageManager": "yarn@4.12.0",
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
  "files": [
    "dist/"
  ],
  "scripts": {
    "clean": "rm -rf dist coverage reports tsconfig.build.tsbuildinfo .rollup.cache",
    "build": "rollup -c rollup.config.mjs",
    "test": "vitest run",
    "deploy": "yarn npm publish --tolerate-republish"
  },
  "dependencies": {
    "@midnight-ntwrk/midnight-js-types": "workspace:*"
  },
  "peerDependencies": {
    "@midnight-ntwrk/dapp-connector-api": ">=4.0.1",
    "@midnight-ntwrk/ledger-v8": ">=8.0.0"
  },
  "devDependencies": {
    "@midnight-ntwrk/dapp-connector-api": "4.0.1",
    "@midnight-ntwrk/ledger-v8": "8.0.3"
  }
}
```

> **Design decisions:**
> - `midnight-js-types` uses `workspace:*` — follows existing package pattern for intra-monorepo deps.
> - `dapp-connector-api` and `ledger-v8` are `peerDependencies` — this is a bridge package, both sides should be provided by the consumer. They're also in `devDependencies` for testing.
> - No `vitest` in devDependencies — provided by monorepo root.

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["./src/**/*.ts"]
}
```

- [ ] **Step 3: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["./src/test/**/*.ts"]
}
```

- [ ] **Step 4: Create rollup.config.mjs**

```javascript
import { createRollupConfig } from '../../build-tools/rollup.config.factory.mjs';
import packageJson from './package.json' with { type: 'json' };

export default createRollupConfig(packageJson);
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      enabled: true,
      clean: true,
      include: ['src/**/*.ts'],
      exclude: ['**/test/**'],
      reporter: ['clover', 'json', 'json-summary', 'lcov', 'text'],
      reportsDirectory: './coverage',
    },
    reporters: [
      'default',
      ['junit', { outputFile: 'reports/report/test-report.xml' }],
    ],
  },
});
```

- [ ] **Step 6: Create typedoc.json**

```json
{
  "extends": ["../../typedoc.base.json"],
  "readme": "none",
  "entryPoints": ["src/index.ts"]
}
```

- [ ] **Step 7: Create empty barrel export**

File: `packages/wallet-adapter/src/index.ts`

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

export {};
```

- [ ] **Step 8: Register workspace and verify scaffold builds**

```bash
cd /Users/paluchs/iohk/dev/github/midnightntwrk/midnight-js
yarn install
cd packages/wallet-adapter && yarn build
```

Expected: `yarn install` registers the new workspace, build succeeds with empty output.

- [ ] **Step 9: Commit**

```bash
git add packages/wallet-adapter/
git commit -m "chore: scaffold wallet-adapter package"
```

---

## Task 2: Implement and test hex utilities

**Files:**
- Create: `packages/wallet-adapter/src/hex-utils.ts`
- Create: `packages/wallet-adapter/src/test/hex-utils.test.ts`
- Modify: `packages/wallet-adapter/src/index.ts`

**Working directory:** `/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-js`

- [ ] **Step 1: Write failing tests for hex utilities**

File: `packages/wallet-adapter/src/test/hex-utils.test.ts`

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

import { hexToUint8Array, uint8ArrayToHex } from '../hex-utils';

describe('hex-utils', () => {
  describe('uint8ArrayToHex', () => {
    it('converts empty array to empty string', () => {
      expect(uint8ArrayToHex(new Uint8Array([]))).toBe('');
    });

    it('converts single byte with zero-padding', () => {
      expect(uint8ArrayToHex(new Uint8Array([0x0a]))).toBe('0a');
    });

    it('converts multiple bytes', () => {
      expect(uint8ArrayToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef');
    });
  });

  describe('hexToUint8Array', () => {
    it('converts empty string to empty array', () => {
      expect(hexToUint8Array('')).toEqual(new Uint8Array([]));
    });

    it('strips 0x prefix', () => {
      expect(hexToUint8Array('0x0a')).toEqual(new Uint8Array([0x0a]));
    });

    it('converts multi-byte hex string', () => {
      expect(hexToUint8Array('deadbeef')).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    });
  });

  describe('roundtrip', () => {
    it('uint8Array -> hex -> uint8Array preserves data', () => {
      const original = new Uint8Array([0x00, 0xff, 0x42, 0x01]);
      expect(hexToUint8Array(uint8ArrayToHex(original))).toEqual(original);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/wallet-adapter && yarn vitest run`
Expected: FAIL — cannot resolve `../hex-utils`

- [ ] **Step 3: Implement hex utilities**

File: `packages/wallet-adapter/src/hex-utils.ts`

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

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
  const cleaned = hex.replace(/^0x/, '');
  if (cleaned.length === 0) return new Uint8Array([]);
  const matches = cleaned.match(/.{1,2}/g);
  if (!matches) return new Uint8Array([]);
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}
```

- [ ] **Step 4: Export from barrel**

Update `packages/wallet-adapter/src/index.ts`:

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

export { hexToUint8Array, uint8ArrayToHex } from './hex-utils';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/wallet-adapter && yarn vitest run`
Expected: 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/wallet-adapter/src/
git commit -m "feat(wallet-adapter): add hex serialization utilities"
```

---

## Task 3: Implement and test wallet adapter factory

**Files:**
- Create: `packages/wallet-adapter/src/wallet-adapter.ts`
- Create: `packages/wallet-adapter/src/test/wallet-adapter.test.ts`
- Modify: `packages/wallet-adapter/src/index.ts`

**Working directory:** `/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-js`

- [ ] **Step 1: Write failing tests for the wallet adapter factory**

File: `packages/wallet-adapter/src/test/wallet-adapter.test.ts`

These tests mock `ConnectedAPI` to verify the adapter correctly bridges to `WalletProvider` and `MidnightProvider`.

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

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { uint8ArrayToHex } from '../hex-utils';
import { createWalletAndMidnightProvider } from '../wallet-adapter';

const mockCoinPublicKey = 'coin-pub-key-hex';
const mockEncryptionPublicKey = 'enc-pub-key-hex';
const mockShieldedAddress = 'shielded-addr';

function createMockConnectedAPI(overrides: Partial<ConnectedAPI> = {}): ConnectedAPI {
  const base: Partial<ConnectedAPI> = {
    getShieldedAddresses: vi.fn().mockResolvedValue({
      shieldedAddress: mockShieldedAddress,
      shieldedCoinPublicKey: mockCoinPublicKey,
      shieldedEncryptionPublicKey: mockEncryptionPublicKey,
    }),
    balanceUnsealedTransaction: vi.fn(),
    submitTransaction: vi.fn(),
  };
  // ConnectedAPI has many methods; we only mock what the adapter uses.
  // This partial mock is acceptable for unit tests targeting adapter logic.
  return { ...base, ...overrides } as ConnectedAPI;
}

describe('createWalletAndMidnightProvider', () => {
  describe('walletProvider', () => {
    it('returns coin public key from shielded address', async () => {
      const connectedAPI = createMockConnectedAPI();
      const { walletProvider } = await createWalletAndMidnightProvider(connectedAPI);

      expect(walletProvider.getCoinPublicKey()).toBe(mockCoinPublicKey);
    });

    it('returns encryption public key from shielded address', async () => {
      const connectedAPI = createMockConnectedAPI();
      const { walletProvider } = await createWalletAndMidnightProvider(connectedAPI);

      expect(walletProvider.getEncryptionPublicKey()).toBe(mockEncryptionPublicKey);
    });

    it('serializes transaction to hex and calls balanceUnsealedTransaction', async () => {
      const mockSerializedBytes = new Uint8Array([0xde, 0xad]);
      const mockTx = {
        serialize: vi.fn().mockReturnValue(mockSerializedBytes),
      };

      const connectedAPI = createMockConnectedAPI({
        balanceUnsealedTransaction: vi.fn().mockResolvedValue({ tx: 'cafebabe' }),
      });

      const { walletProvider } = await createWalletAndMidnightProvider(connectedAPI);

      // Transaction.deserialize (static method from ledger-v8) will throw with mock data.
      // We verify the serialization + ConnectedAPI call path; deserialization is an integration concern.
      await expect(walletProvider.balanceTx(mockTx as Parameters<typeof walletProvider.balanceTx>[0])).rejects.toThrow();
      expect(connectedAPI.balanceUnsealedTransaction).toHaveBeenCalledWith(uint8ArrayToHex(mockSerializedBytes));
    });
  });

  describe('midnightProvider', () => {
    it('serializes transaction to hex and calls submitTransaction', async () => {
      const mockSerializedBytes = new Uint8Array([0xbe, 0xef]);
      const mockTxId = 'submitted-tx-id';
      const mockTx = {
        serialize: vi.fn().mockReturnValue(mockSerializedBytes),
        identifiers: vi.fn().mockReturnValue([mockTxId]),
      };

      const connectedAPI = createMockConnectedAPI({
        submitTransaction: vi.fn().mockResolvedValue(undefined),
      });

      const { midnightProvider } = await createWalletAndMidnightProvider(connectedAPI);
      const txId = await midnightProvider.submitTx(mockTx as Parameters<typeof midnightProvider.submitTx>[0]);

      expect(connectedAPI.submitTransaction).toHaveBeenCalledWith(uint8ArrayToHex(mockSerializedBytes));
      expect(txId).toBe(mockTxId);
    });
  });

  describe('shieldedAddress', () => {
    it('returns the resolved shielded address for consumer use', async () => {
      const connectedAPI = createMockConnectedAPI();
      const result = await createWalletAndMidnightProvider(connectedAPI);

      expect(result.shieldedAddress).toEqual({
        shieldedAddress: mockShieldedAddress,
        shieldedCoinPublicKey: mockCoinPublicKey,
        shieldedEncryptionPublicKey: mockEncryptionPublicKey,
      });
    });

    it('calls getShieldedAddresses on ConnectedAPI exactly once', async () => {
      const connectedAPI = createMockConnectedAPI();
      await createWalletAndMidnightProvider(connectedAPI);

      expect(connectedAPI.getShieldedAddresses).toHaveBeenCalledOnce();
    });
  });
});
```

> **Design note:** `balanceTx` calls `Transaction.deserialize()` (static method from ledger-v8). This is hard to mock in unit tests. The test verifies the serialization + API call path. The deserialization path is covered by integration/e2e tests with real ledger types. This is intentional — we don't mock what we don't own.
>
> **Mock pattern:** The `createMockConnectedAPI` helper uses `as ConnectedAPI` cast on a partial mock. This is an accepted trade-off in tests — constructing a full `ConnectedAPI` mock would add hundreds of lines of boilerplate for methods the adapter never calls. The comment documents the intent.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/wallet-adapter && yarn vitest run`
Expected: FAIL — cannot resolve `../wallet-adapter`

- [ ] **Step 3: Implement the wallet adapter factory**

File: `packages/wallet-adapter/src/wallet-adapter.ts`

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

import type {
  MidnightProvider,
  UnboundTransaction,
  WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import type {
  Binding,
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  TransactionId,
} from '@midnight-ntwrk/ledger-v8';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import { hexToUint8Array, uint8ArrayToHex } from './hex-utils';

export interface ShieldedAddress {
  readonly shieldedAddress: string;
  readonly shieldedCoinPublicKey: string;
  readonly shieldedEncryptionPublicKey: string;
}

export interface WalletAndMidnightProvider {
  readonly walletProvider: WalletProvider;
  readonly midnightProvider: MidnightProvider;
  readonly shieldedAddress: ShieldedAddress;
}

export async function createWalletAndMidnightProvider(
  connectedAPI: ConnectedAPI,
): Promise<WalletAndMidnightProvider> {
  const shieldedAddress: ShieldedAddress = await connectedAPI.getShieldedAddresses();

  const walletProvider: WalletProvider = {
    getCoinPublicKey(): CoinPublicKey {
      return shieldedAddress.shieldedCoinPublicKey;
    },
    getEncryptionPublicKey(): EncPublicKey {
      return shieldedAddress.shieldedEncryptionPublicKey;
    },
    async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
      const serializedHex = uint8ArrayToHex(tx.serialize());
      const result = await connectedAPI.balanceUnsealedTransaction(serializedHex);
      const resultBytes = hexToUint8Array(result.tx);
      return Transaction.deserialize(
        'signature',
        'proof',
        'binding',
        resultBytes,
      ) as Transaction<SignatureEnabled, Proof, Binding>;
    },
  };

  const midnightProvider: MidnightProvider = {
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      const serializedHex = uint8ArrayToHex(tx.serialize());
      await connectedAPI.submitTransaction(serializedHex);
      return tx.identifiers()[0];
    },
  };

  return { walletProvider, midnightProvider, shieldedAddress };
}
```

> **Key differences from dapp version:**
> - No console.log statements (library code should not log)
> - `async` factory — resolves shielded addresses internally instead of requiring caller to pass them
> - Returns `shieldedAddress` in result so consumers can use it (e.g., for `privateStateProvider.accountId`)
> - Returns typed `WalletAndMidnightProvider` interface
> - Removed unused parameters (`proofProvider`, `zkConfigProvider`, `unshieldedAddress`)
> - Uses `import type` for type-only imports (tree-shaking friendly, lint compliant)
> - `submitTx` returns `Promise<TransactionId>` (matches `MidnightProvider` interface exactly)

- [ ] **Step 4: Update barrel export**

File: `packages/wallet-adapter/src/index.ts`

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

export { hexToUint8Array, uint8ArrayToHex } from './hex-utils';
export {
  createWalletAndMidnightProvider,
  type ShieldedAddress,
  type WalletAndMidnightProvider,
} from './wallet-adapter';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/wallet-adapter && yarn vitest run`
Expected: All tests PASS

- [ ] **Step 6: Verify full build**

Run: `cd packages/wallet-adapter && yarn build`
Expected: Produces `dist/index.cjs`, `dist/index.mjs`, `dist/index.d.ts`

- [ ] **Step 7: Commit**

```bash
git add packages/wallet-adapter/src/
git commit -m "feat(wallet-adapter): add createWalletAndMidnightProvider factory"
```

---

## Task 4: Lint and build verification

**Files:** None new — validation only

**Working directory:** `/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-js`

- [ ] **Step 1: Run linter on new package**

Run: `yarn lint`
Expected: No lint errors in `packages/wallet-adapter/`

- [ ] **Step 2: Fix any lint issues**

Common issues to watch for:
- `simple-import-sort` may reorder imports
- `@typescript-eslint/consistent-type-imports` may require `type` keyword adjustments
- Fix and re-run until clean

- [ ] **Step 3: Run full monorepo build**

Run: `yarn build`
Expected: All packages build including wallet-adapter

- [ ] **Step 4: Run full test suite**

Run: `yarn test`
Expected: All tests pass including wallet-adapter

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -u
git commit -m "chore(wallet-adapter): fix lint issues"
```

---

## Task 5: Publish package (or prepare for local consumption)

**Files:** None — operational step

> **Decision point:** If midnight-js publishes via CI/CD pipeline, this task is "open PR and merge". If using local `yarn link` for development, use that workflow instead. Confirm with team which approach to use.

- [ ] **Step 1: Create PR in midnight-js**

Branch: `feat/wallet-adapter`
Title: `feat: add @midnight-ntwrk/midnight-js-wallet-adapter package`

- [ ] **Step 2: After merge, verify package is published**

Run: `npm view @midnight-ntwrk/midnight-js-wallet-adapter`
Expected: Package is available at version matching midnight-js release

---

## Task 6: Migrate midnight-wallet-dapp to use the new package

**Files:**
- Delete: `src/lib/walletAdapter.ts`
- Modify: `src/lib/providers.ts`
- Modify: `package.json`

**Working directory:** `/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-wallet-dapp`

- [ ] **Step 1: Add new dependency**

```bash
yarn add @midnight-ntwrk/midnight-js-wallet-adapter@4.0.2
```

- [ ] **Step 2: Check what uses ShieldedAddress, uint8ArrayToHex, hexToUint8Array**

Run:
```bash
grep -r "ShieldedAddress\|uint8ArrayToHex\|hexToUint8Array" src/ --include="*.ts" --include="*.tsx"
```

For each usage outside `walletAdapter.ts`:
- If importing from `./walletAdapter`, update to import from `@midnight-ntwrk/midnight-js-wallet-adapter`
- If `ShieldedAddress` is used in `App.tsx`, it now comes from the new package

- [ ] **Step 3: Update providers.ts**

Replace the import and usage of local `createWalletProvidersFromConnectedAPI` with the new package.

**Before (lines to remove/change):**
```typescript
import { createWalletProvidersFromConnectedAPI } from './walletAdapter';
// ...
export type ShieldedAddress = {
  shieldedAddress: string;
  shieldedCoinPublicKey: string;
  shieldedEncryptionPublicKey: string;
};
// ...
const shieldedAddress: ShieldedAddress = await connectedAPI.getShieldedAddresses();
const unshieldedAddress = await connectedAPI.getUnshieldedAddress();
const { walletProvider, midnightProvider } = createWalletProvidersFromConnectedAPI(
  connectedAPI,
  proofProvider,
  zkConfigProvider,
  shieldedAddress,
  unshieldedAddress.unshieldedAddress
);
```

**After:**
```typescript
import { createWalletAndMidnightProvider } from '@midnight-ntwrk/midnight-js-wallet-adapter';
// ...
// ShieldedAddress type removed — now exported from @midnight-ntwrk/midnight-js-wallet-adapter
// ...
const { walletProvider, midnightProvider, shieldedAddress } = await createWalletAndMidnightProvider(connectedAPI);
// shieldedAddress.shieldedAddress is used below for privateStateProvider accountId
```

> **Critical:** The `shieldedAddress` is still needed for `levelPrivateStateProvider({ accountId: shieldedAddress.shieldedAddress })`. The new factory returns it in the result, so no separate `getShieldedAddresses()` call is needed.

- [ ] **Step 4: Remove the unshieldedAddress call if unused**

The line `const unshieldedAddress = await connectedAPI.getUnshieldedAddress()` was only used as a parameter to the old factory. Delete it.

> **Check first:** grep for `unshieldedAddress` in `providers.ts` to confirm it's not used elsewhere in the function.

- [ ] **Step 5: Remove unused imports from providers.ts**

After the migration, check which imports are no longer needed:
- `import { createWalletProvidersFromConnectedAPI } from './walletAdapter'` — DELETE
- `ProofProvider` from `midnight-js-types` — check if still used (it's used by `createProofProvider`, keep if so)
- `UnboundTransaction` from `midnight-js-types` — check if still used (it's used by `createProofProvider`, keep if so)

- [ ] **Step 6: Delete local walletAdapter.ts**

```bash
rm src/lib/walletAdapter.ts
```

- [ ] **Step 7: Verify build**

Run: `yarn build`
Expected: Builds successfully

- [ ] **Step 8: Verify lint**

Run: `yarn lint`
Expected: No errors

- [ ] **Step 9: Run e2e tests**

Run: `yarn test:e2e`
Expected: All passing (if e2e environment is available)

- [ ] **Step 10: Commit**

```bash
git add -u && git add package.json yarn.lock
git commit -m "refactor: replace local walletAdapter with @midnight-ntwrk/midnight-js-wallet-adapter"
```

---

## Open Questions (Resolve Before Starting)

1. **Version alignment:** Verify the current midnight-js monorepo version. Plan assumes `4.0.2` based on review findings. Adjust all version references if different.

2. **crypto-shim.ts:** This is a Vite/browser concern, not a library concern. It stays in the dapp. Confirm this is correct.

3. **`createProofProvider` in providers.ts:** Currently unused (TODO comment). Leave as-is or extract to new package? Recommend leave as-is — it depends on `ProvingProvider` from dapp-connector-api which isn't implemented yet.

4. **Logging:** The current dapp code has extensive `console.log` statements. The library version has none. If structured logging is desired, the existing `LoggerProvider` from midnight-js-types could be accepted as an optional parameter. Recommend: defer until needed.

5. **`publicDataProvider` wrapper in providers.ts:** The `postBlockUpdate(new Date())` chainstate fix stays in the dapp. Confirm this is dapp-specific or a general concern that other dapps will also need.
