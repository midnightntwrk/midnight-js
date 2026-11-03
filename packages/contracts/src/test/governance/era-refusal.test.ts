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

import type { VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { ZkArtifactContractInfoError } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it, vi } from 'vitest';

import { EraMismatchError } from '../../errors';
import { submitInsertVerifierKeyTx } from '../../governance/submit-insert-vk-tx';
import { submitRemoveVerifierKeyTx } from '../../governance/submit-remove-vk-tx';
import { submitReplaceAuthorityTx } from '../../governance/submit-replace-authority-tx';
import {
  createMockCompiledContract,
  createMockContractAddress,
  createMockProviders,
  createMockSigningKey
} from '../test-mocks';

type GovernanceCall = (
  providers: ReturnType<typeof createMockProviders>,
  compiledContract: ReturnType<typeof createMockCompiledContract>,
  contractAddress: ReturnType<typeof createMockContractAddress>
) => Promise<unknown>;

const governanceCalls: [string, GovernanceCall][] = [
  [
    'submitInsertVerifierKeyTx',
    (providers, compiledContract, contractAddress) =>
      submitInsertVerifierKeyTx(providers, compiledContract, contractAddress, 'testCircuit', new Uint8Array(32) as VerifierKey)
  ],
  [
    'submitRemoveVerifierKeyTx',
    (providers, compiledContract, contractAddress) =>
      submitRemoveVerifierKeyTx(providers, compiledContract, contractAddress, 'testCircuit')
  ],
  [
    'submitReplaceAuthorityTx',
    (providers, compiledContract, contractAddress) =>
      submitReplaceAuthorityTx(providers, compiledContract, contractAddress)(createMockSigningKey())
  ]
];

describe('governance routers: an artifact era refusal', () => {
  it.each(governanceCalls)('%s refuses artifacts that declare no era before reading contract state', async (_name, call) => {
    const unavailable = new ZkArtifactContractInfoError('no contract-info.json at https://cdn.example/compiler/');
    const providers = createMockProviders();
    providers.zkConfigProvider.getArtifactRuntimeVersion = vi.fn().mockRejectedValue(unavailable);

    const error = await call(providers, createMockCompiledContract(), createMockContractAddress()).catch(
      (thrown: unknown) => thrown
    );

    expect(error).toBeInstanceOf(EraMismatchError);
    expect(error).toMatchObject({ reason: 'artifact-era-undeclared', cause: unavailable });
    expect(providers.publicDataProvider.queryContractState).not.toHaveBeenCalled();
  });
});
