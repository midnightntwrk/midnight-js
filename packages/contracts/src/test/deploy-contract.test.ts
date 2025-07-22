/*
 * This file is part of midnight-js.
 * Copyright (C) 2025 Midnight Foundation
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployContract, type DeployContractOptionsBase, type DeployedContract } from '../deploy-contract';
import {
  createMockContract,
  createMockFinalizedTxData,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey
} from './test-mocks';
import { type UnsubmittedDeployTxData } from '../tx-model';
import { type Contract, type PrivateState } from '@midnight-ntwrk/midnight-js-types';
import { type ContractState, type UnprovenTransaction } from '@midnight-ntwrk/ledger';
import { type ZswapLocalState } from '@midnight-ntwrk/compact-runtime';
import { type ContractProviders } from '../contract-providers';

vi.mock('../submit-deploy-tx', () => ({
  submitDeployTx: vi.fn()
}));

vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));

describe('deployContract', () => {
  let mockSubmitDeployTx: ReturnType<typeof vi.fn>;
  let mockDeployTxData: UnsubmittedDeployTxData<Contract>;
  let providers: ContractProviders;
  let baseOptions: DeployContractOptionsBase<Contract>;

  const createMockDeployTxData = (initialPrivateState?: PrivateState<Contract>): UnsubmittedDeployTxData<Contract> => ({
    public: {
      ...createMockFinalizedTxData(),
      contractAddress: 'mock-contract-address',
      initialContractState: {} as ContractState
    },
    private: {
      signingKey: createMockSigningKey(),
      initialPrivateState,
      initialZswapState: {} as ZswapLocalState,
      unprovenTx: {} as UnprovenTransaction,
      newCoins: []
    }
  });

  const assertDeployResult = (result: DeployedContract<Contract>, deployTxData: UnsubmittedDeployTxData<Contract>) => {
    expect(result).toBeDefined();
    expect(result.deployTxData).toBe(deployTxData);
    expect(result.callTx).toBeDefined();
    expect(result.circuitMaintenanceTx).toBeDefined();
    expect(result.contractMaintenanceTx).toBeDefined();
  };

  beforeEach(async () => {
    const { submitDeployTx } = await import('../submit-deploy-tx');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSubmitDeployTx = submitDeployTx as any;
    vi.clearAllMocks();

    providers = createMockProviders();
    baseOptions = {
      contract: createMockContract(),
      args: ['deploy-arg']
    };
  });

  it('should deploy contract without private state', async () => {
    mockDeployTxData = createMockDeployTxData();
    mockSubmitDeployTx.mockResolvedValue(mockDeployTxData);

    const result = await deployContract(providers, baseOptions);

    assertDeployResult(result, mockDeployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: baseOptions.contract,
        args: baseOptions.args,
        signingKey: expect.not.stringMatching(createMockSigningKey())
      })
    );
  });

  it('should deploy contract with provided signing key', async () => {
    mockDeployTxData = createMockDeployTxData();
    mockSubmitDeployTx.mockResolvedValue(mockDeployTxData);

    const signingKey = createMockSigningKey();
    const options = { ...baseOptions, signingKey };

    const result = await deployContract(providers, options);

    assertDeployResult(result, mockDeployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        signingKey,
        args: options.args
      })
    );
  });

  it('should deploy contract with private state', async () => {
    const initialPrivateState = { test: 'initial-private-state' };
    mockDeployTxData = createMockDeployTxData(initialPrivateState);
    mockSubmitDeployTx.mockResolvedValue(mockDeployTxData);

    const options = {
      ...baseOptions,
      privateStateId: createMockPrivateStateId(),
      initialPrivateState
    };

    const result = await deployContract(providers, options);

    assertDeployResult(result, mockDeployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        privateStateId: options.privateStateId,
        initialPrivateState,
        args: options.args,
        signingKey: expect.not.stringMatching(createMockSigningKey())
      })
    );
  });

  it('should deploy contract with both custom signing key and private state', async () => {
    const initialPrivateState = { test: 'initial-private-state' };
    mockDeployTxData = createMockDeployTxData(initialPrivateState);
    mockSubmitDeployTx.mockResolvedValue(mockDeployTxData);

    const signingKey = createMockSigningKey();
    const options = {
      ...baseOptions,
      signingKey,
      privateStateId: createMockPrivateStateId(),
      initialPrivateState
    };

    const result = await deployContract(providers, options);

    assertDeployResult(result, mockDeployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        signingKey,
        privateStateId: options.privateStateId,
        initialPrivateState,
        args: options.args
      })
    );
  });
});
