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

import * as Protocol from '@midnight-ntwrk/midnight-js-protocol';
import { sampleCoinPublicKey, sampleEncryptionPublicKey } from '@midnight-ntwrk/midnight-js-protocol/v9';
import { describe, expect, it, vi } from 'vitest';

import { submitDeployTx, submitLedger9DeployTx } from '../submit-deploy-tx';
import {
  createLedger9UnprovenCallTx,
  createLedger9UnprovenCallTxFromInitialStates,
  createUnprovenCallTx,
  createUnprovenCallTxFromInitialStates
} from '../unproven-call-tx';
import {
  createLedger9UnprovenDeployTx,
  createLedger9UnprovenDeployTxFromVerifierKeys,
  createUnprovenDeployTx,
  createUnprovenDeployTxFromVerifierKeys
} from '../unproven-deploy-tx';
import {
  createMockCallOptions,
  createMockCompiledContract,
  createMockContractAddress,
  createMockProviders,
  createMockSigningKey
} from './test-mocks';

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const original = await importOriginal<typeof Protocol>();
  return {
    ...original,
    loadLedger8Engine: vi.fn(original.loadLedger8Engine),
    loadLedger8Protocol: vi.fn(original.loadLedger8Protocol),
    loadLedgerEra: vi.fn(original.loadLedgerEra)
  };
});

type Providers = ReturnType<typeof createMockProviders>;

const callOptions = () => ({
  compiledContract: createMockCompiledContract(),
  contractAddress: createMockContractAddress(),
  circuitId: 'testCircuit',
  args: ['test-arg']
});
const deployOptions = () => ({
  compiledContract: createMockCompiledContract(),
  signingKey: createMockSigningKey(),
  args: ['deploy-arg']
});

const LEDGER9_RUNS: readonly (readonly [string, (providers: Providers) => Promise<unknown>])[] = [
  ['createLedger9UnprovenCallTx', (providers) => createLedger9UnprovenCallTx(providers, callOptions())],
  ['createUnprovenCallTx', (providers) => createUnprovenCallTx(providers, callOptions())],
  [
    'createLedger9UnprovenCallTxFromInitialStates',
    (providers) =>
      createLedger9UnprovenCallTxFromInitialStates(providers.zkConfigProvider, createMockCallOptions(), sampleEncryptionPublicKey())
  ],
  [
    'createUnprovenCallTxFromInitialStates',
    (providers) =>
      createUnprovenCallTxFromInitialStates(providers.zkConfigProvider, createMockCallOptions(), sampleEncryptionPublicKey())
  ],
  ['createLedger9UnprovenDeployTx', (providers) => createLedger9UnprovenDeployTx(providers, deployOptions())],
  ['createUnprovenDeployTx', (providers) => createUnprovenDeployTx(providers, deployOptions())],
  [
    'createLedger9UnprovenDeployTxFromVerifierKeys',
    (providers) =>
      createLedger9UnprovenDeployTxFromVerifierKeys(
        providers.zkConfigProvider,
        sampleCoinPublicKey(),
        deployOptions(),
        sampleEncryptionPublicKey(),
        providers.config
      )
  ],
  [
    'createUnprovenDeployTxFromVerifierKeys',
    (providers) =>
      createUnprovenDeployTxFromVerifierKeys(
        providers.zkConfigProvider,
        sampleCoinPublicKey(),
        deployOptions(),
        sampleEncryptionPublicKey(),
        providers.config
      )
  ],
  ['submitLedger9DeployTx', (providers) => submitLedger9DeployTx(providers, deployOptions())],
  ['submitDeployTx', (providers) => submitDeployTx(providers, deployOptions())]
];

describe('a session that only uses ledger 9 contracts', () => {
  it('sees a ledger 8 load when a ledger 8 contract is built (control)', async () => {
    vi.clearAllMocks();
    const providers = createMockProviders();
    vi.mocked(providers.zkConfigProvider.getArtifactRuntimeVersion).mockResolvedValue('0.16.0');
    const ledger8Contract = {
      witnesses: {},
      circuits: {},
      impureCircuits: {},
      provableCircuits: {},
      initialState: (): never => {
        throw new Error('not run');
      }
    };

    // @ts-expect-error - an untyped ledger 8 contract, as a JavaScript caller passes one
    await createUnprovenDeployTxFromVerifierKeys(
      providers.zkConfigProvider,
      sampleCoinPublicKey(),
      { compiledContract: ledger8Contract },
      sampleEncryptionPublicKey(),
      providers.config
    ).catch(() => undefined);

    expect(Protocol.loadLedger8Engine).toHaveBeenCalled();
  });

  it.each(LEDGER9_RUNS)('%s loads no ledger 8 runtime', async (_name, run) => {
    vi.clearAllMocks();

    await run(createMockProviders()).catch(() => undefined);

    expect(Protocol.loadLedger8Engine).not.toHaveBeenCalled();
    expect(Protocol.loadLedger8Protocol).not.toHaveBeenCalled();
    expect(Protocol.loadLedgerEra).not.toHaveBeenCalledWith('v8');
  });
});
