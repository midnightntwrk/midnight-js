/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { describe, expect, it, type MockInstance, vi } from 'vitest';

import { EraMismatchError } from '../errors';
import { createLedger8UnprovenCallTx } from '../unproven-call-tx';
import { createMockCompiledContract, createMockContractAddress, createMockProviders } from './test-mocks';

type Providers = ReturnType<typeof createMockProviders>;

const providerMocks = (providers: Providers): MockInstance[] =>
  Object.values(providers).flatMap((provider: unknown) =>
    typeof provider === 'object' && provider !== null ? Object.values(provider).filter(vi.isMockFunction) : []
  );

const ledger9CallOptions = () => ({
  compiledContract: createMockCompiledContract(),
  contractAddress: createMockContractAddress(),
  circuitId: 'testCircuit'
});

const LEDGER8_FUNCTIONS: readonly (readonly [string, (providers: Providers) => Promise<unknown>])[] = [
  // @ts-expect-error a ledger 9 contract is not a ledger 8 contract
  ['createLedger8UnprovenCallTx', (providers) => createLedger8UnprovenCallTx(providers, ledger9CallOptions())]
];

describe('the Ledger8 low-level functions accept only a contract whose artifacts declare ledger 8', () => {
  it.each(LEDGER8_FUNCTIONS)('%s refuses a ledger 9 contract with a named error', async (name, run) => {
    const providers = createMockProviders();

    const rejection = await run(providers).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(EraMismatchError);
    expect(rejection).toMatchObject({ reason: 'contract-era-unsupported' });
    expect((rejection as EraMismatchError).message).toContain(`Function: ${name}. Contract era: 'v9'.`);
  });

  it.each(LEDGER8_FUNCTIONS)('%s refuses before any provider call', async (_name, run) => {
    const providers = createMockProviders();

    await run(providers).catch(() => undefined);

    const calledMocks = providerMocks(providers).filter((mock) => mock.mock.calls.length > 0);
    expect(calledMocks).toEqual([]);
  });
});
