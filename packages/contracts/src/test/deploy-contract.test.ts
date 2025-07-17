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

import { describe, it, expect, vi } from 'vitest';
import { deployContract } from '../deploy-contract';
import {
  createMockProviders,
  createMockContract,
  createMockSigningKey,
  createMockPrivateStateId,
  createMockFinalizedTxData
} from './test-mocks';

vi.mock('../submit-deploy-tx', () => ({
  submitDeployTx: vi.fn()
}));

vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));

describe('deployContract', () => {
  it('should deploy contract without private state', async () => {
    const { submitDeployTx } = await import('../submit-deploy-tx');
    const mockSubmitDeployTx = submitDeployTx as any;

    const deployTxData = {
      public: {
        ...createMockFinalizedTxData(),
        contractAddress: 'mock-contract-address',
        initialContractState: { test: 'initial-state' }
      },
      private: {
        signingKey: createMockSigningKey(),
        initialPrivateState: undefined,
        initialZswapState: { test: 'zswap-state' },
        unprovenTx: { test: 'unproven-tx' },
        newCoins: [{ test: 'coin' }]
      }
    };

    mockSubmitDeployTx.mockResolvedValue(deployTxData);

    const providers = createMockProviders();
    const options = {
      contract: createMockContract(),
      args: ['deploy-arg']
    };

    const result = await deployContract(providers, options);

    expect(result).toBeDefined();
    expect(result.deployTxData).toBe(deployTxData);
    expect(result.callTx).toBeDefined();
    expect(result.circuitMaintenanceTx).toBeDefined();
    expect(result.contractMaintenanceTx).toBeDefined();
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        args: options.args,
        signingKey: expect.not.stringMatching(createMockSigningKey())
      })
    );
  });

  it('should deploy contract with provided signing key', async () => {
    const { submitDeployTx } = await import('../submit-deploy-tx');
    const mockSubmitDeployTx = submitDeployTx as any;

    const deployTxData = {
      public: {
        ...createMockFinalizedTxData(),
        contractAddress: 'mock-contract-address',
        initialContractState: { test: 'initial-state' }
      },
      private: {
        signingKey: createMockSigningKey(),
        initialPrivateState: undefined,
        initialZswapState: { test: 'zswap-state' },
        unprovenTx: { test: 'unproven-tx' },
        newCoins: [{ test: 'coin' }]
      }
    };

    mockSubmitDeployTx.mockResolvedValue(deployTxData);

    const providers = createMockProviders();
    const signingKey = createMockSigningKey();
    const options = {
      contract: createMockContract(),
      signingKey,
      args: ['deploy-arg']
    };

    const result = await deployContract(providers, options);

    expect(result).toBeDefined();
    expect(result.deployTxData).toBe(deployTxData);
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
    const { submitDeployTx } = await import('../submit-deploy-tx');
    const mockSubmitDeployTx = submitDeployTx as any;

    const deployTxData = {
      public: {
        ...createMockFinalizedTxData(),
        contractAddress: 'mock-contract-address',
        initialContractState: { test: 'initial-state' }
      },
      private: {
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        initialZswapState: { test: 'zswap-state' },
        unprovenTx: { test: 'unproven-tx' },
        newCoins: [{ test: 'coin' }]
      }
    };

    mockSubmitDeployTx.mockResolvedValue(deployTxData);

    const providers = createMockProviders();
    const privateStateId = createMockPrivateStateId();
    const initialPrivateState = { test: 'initial-private-state' };

    const options = {
      contract: createMockContract(),
      privateStateId,
      initialPrivateState,
      args: ['deploy-arg']
    };

    const result = await deployContract(providers, options);

    expect(result).toBeDefined();
    expect(result.deployTxData).toBe(deployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        privateStateId,
        initialPrivateState,
        args: options.args,
        signingKey: expect.not.stringMatching(createMockSigningKey())
      })
    );
  });

  it('should deploy contract with both custom signing key and private state', async () => {
    const { submitDeployTx } = await import('../submit-deploy-tx');
    const mockSubmitDeployTx = submitDeployTx as any;

    const deployTxData = {
      public: {
        ...createMockFinalizedTxData(),
        contractAddress: 'mock-contract-address',
        initialContractState: { test: 'initial-state' }
      },
      private: {
        signingKey: createMockSigningKey(),
        initialPrivateState: { test: 'initial-private-state' },
        initialZswapState: { test: 'zswap-state' },
        unprovenTx: { test: 'unproven-tx' },
        newCoins: [{ test: 'coin' }]
      }
    };

    mockSubmitDeployTx.mockResolvedValue(deployTxData);

    const providers = createMockProviders();
    const signingKey = createMockSigningKey();
    const privateStateId = createMockPrivateStateId();
    const initialPrivateState = { test: 'initial-private-state' };

    const options = {
      contract: createMockContract(),
      signingKey,
      privateStateId,
      initialPrivateState,
      args: ['deploy-arg']
    };

    const result = await deployContract(providers, options);

    expect(result).toBeDefined();
    expect(result.deployTxData).toBe(deployTxData);
    expect(mockSubmitDeployTx).toHaveBeenCalledWith(
      providers,
      expect.objectContaining({
        contract: options.contract,
        signingKey,
        privateStateId,
        initialPrivateState,
        args: options.args
      })
    );
  });
});
