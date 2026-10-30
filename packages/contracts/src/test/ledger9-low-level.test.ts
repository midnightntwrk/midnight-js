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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { sampleCoinPublicKey, sampleEncryptionPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expect, it, type MockInstance, vi } from 'vitest';

import { EraMismatchError } from '../errors';
import { submitLedger9DeployTx } from '../submit-deploy-tx';
import {
  createLedger9UnprovenCallTx,
  createLedger9UnprovenCallTxFromInitialStates,
  createUnprovenCallTx
} from '../unproven-call-tx';
import {
  createLedger9UnprovenDeployTx,
  createLedger9UnprovenDeployTxFromVerifierKeys,
  createUnprovenDeployTx
} from '../unproven-deploy-tx';
import { createMockContractAddress, createMockProviders } from './test-mocks';

type Providers = ReturnType<typeof createMockProviders>;

const ledger8Contract = {
  impureCircuits: { increment: (): void => undefined },
  initialState: (): Record<string, never> => ({})
};

const ledger8Providers = (): Providers => {
  const providers = createMockProviders();
  vi.mocked(providers.zkConfigProvider.getArtifactRuntimeVersion).mockResolvedValue('0.16.0');
  return providers;
};

const providerMocks = (providers: Providers): MockInstance[] =>
  Object.values(providers).flatMap((provider: unknown) =>
    typeof provider === 'object' && provider !== null ? Object.values(provider).filter(vi.isMockFunction) : []
  );

const callOptions = { compiledContract: ledger8Contract, contractAddress: createMockContractAddress(), circuitId: 'increment' };
const deployOptions = { compiledContract: ledger8Contract };

const LEDGER9_FUNCTIONS: readonly (readonly [string, (providers: Providers) => Promise<unknown>])[] = [
  // @ts-expect-error a ledger 8 contract matches no overload; a JavaScript caller can still pass one
  ['createLedger9UnprovenCallTx', (providers) => createLedger9UnprovenCallTx(providers, callOptions)],
  [
    'createLedger9UnprovenCallTxFromInitialStates',
    (providers) =>
      // @ts-expect-error a ledger 8 contract matches no overload; a JavaScript caller can still pass one
      createLedger9UnprovenCallTxFromInitialStates(providers.zkConfigProvider, callOptions, sampleEncryptionPublicKey())
  ],
  // @ts-expect-error a ledger 8 contract matches no overload; a JavaScript caller can still pass one
  ['createLedger9UnprovenDeployTx', (providers) => createLedger9UnprovenDeployTx(providers, deployOptions)],
  [
    'createLedger9UnprovenDeployTxFromVerifierKeys',
    (providers) =>
      createLedger9UnprovenDeployTxFromVerifierKeys(
        providers.zkConfigProvider,
        sampleCoinPublicKey(),
        // @ts-expect-error a ledger 8 contract matches no overload; a JavaScript caller can still pass one
        deployOptions,
        sampleEncryptionPublicKey(),
        providers.config
      )
  ],
  // @ts-expect-error a ledger 8 contract matches no overload; a JavaScript caller can still pass one
  ['submitLedger9DeployTx', (providers) => submitLedger9DeployTx(providers, deployOptions)]
];

const ROUTERS_NEEDING_TRANSACTION_PROVIDERS: readonly (readonly [string, (providers: Providers) => Promise<unknown>])[] = [
  // @ts-expect-error - an untyped ledger 8 contract, as a JavaScript caller passes one
  ['createUnprovenCallTx', (providers) => createUnprovenCallTx(providers, callOptions)],
  // @ts-expect-error - an untyped ledger 8 contract, as a JavaScript caller passes one
  ['createUnprovenDeployTx', (providers) => createUnprovenDeployTx(providers, deployOptions)]
];

describe('the unprefixed low-level routers', () => {
  it.each(ROUTERS_NEEDING_TRANSACTION_PROVIDERS)(
    '%s refuses a ledger 8 contract without the transaction providers, before reading the network',
    async (name, route) => {
      const full = ledger8Providers();
      const { proofProvider: _proof, midnightProvider: _midnight, ...ledger9Set } = full;

      // @ts-expect-error - a JavaScript caller can pass the narrower ledger 9 provider set
      const rejection = await route(ledger9Set).catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(InvalidArgumentError);
      expect((rejection as InvalidArgumentError).message).toContain(`${name} was given a ledger 8 contract without 'proofProvider', 'midnightProvider'`);
      expect(full.publicDataProvider.queryLatestProtocolVersion).not.toHaveBeenCalled();
    }
  );
});

describe('the Ledger9 low-level functions accept only a contract whose artifacts declare ledger 9', () => {
  it.each(LEDGER9_FUNCTIONS)('%s refuses a ledger 8 contract with a named error', async (name, run) => {
    const providers = ledger8Providers();

    const rejection = await run(providers).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(EraMismatchError);
    expect(rejection).toMatchObject({ reason: 'contract-era-unsupported' });
    expect((rejection as EraMismatchError).message).toContain(`Function: ${name}. Contract era: 'v8'.`);
  });

  it.each(LEDGER9_FUNCTIONS)('%s refuses after the era read and before any other provider call', async (_name, run) => {
    const providers = ledger8Providers();

    await run(providers).catch(() => undefined);

    const calledMocks = providerMocks(providers).filter((mock) => mock.mock.calls.length > 0);
    expect(calledMocks).toEqual([providers.zkConfigProvider.getArtifactRuntimeVersion]);
  });
});
