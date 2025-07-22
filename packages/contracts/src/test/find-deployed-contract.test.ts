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
import { findDeployedContract, type FoundContract } from '../find-deployed-contract';
import {
  createMockContract,
  createMockContractAddress,
  createMockContractState,
  createMockFinalizedTxData,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockVerifierKeys
} from './test-mocks';
import { type Contract } from '@midnight-ntwrk/midnight-js-types';

vi.mock('../tx-interfaces', () => ({
  createCircuitCallTxInterface: vi.fn().mockReturnValue({ call: 'mock-call-interface' }),
  createCircuitMaintenanceTxInterfaces: vi.fn().mockReturnValue({ maintenance: 'mock-maintenance-interfaces' }),
  createContractMaintenanceTxInterface: vi.fn().mockReturnValue({ contractMaintenance: 'mock-contract-maintenance' })
}));

vi.mock('@midnight-ntwrk/midnight-js-types', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getImpureCircuitIds: vi.fn().mockReturnValue(['testCircuit'])
  };
});

describe('findDeployedContract', () => {
  let providers: ReturnType<typeof createMockProviders>;
  let contractAddress: ReturnType<typeof createMockContractAddress>;
  let contract: ReturnType<typeof createMockContract>;
  let finalizedTxData: ReturnType<typeof createMockFinalizedTxData>;
  let contractState: ReturnType<typeof createMockContractState>;
  let verifierKeys: ReturnType<typeof createMockVerifierKeys>;

  const setupCommonMocks = () => {
    vi.mocked(providers.publicDataProvider.watchForDeployTxData).mockResolvedValue(finalizedTxData);
    vi.mocked(providers.publicDataProvider.queryDeployContractState).mockResolvedValue(contractState);
    vi.mocked(providers.publicDataProvider.queryContractState).mockResolvedValue(contractState);
    vi.mocked(providers.zkConfigProvider.getVerifierKeys).mockResolvedValue(verifierKeys);
  };

  const expectBasicResult = (result: FoundContract<Contract>) => {
    expect(result).toBeDefined();
    expect(result.deployTxData).toBeDefined();
    expect(result.deployTxData.public.contractAddress).toBe(contractAddress);
    expect(result.deployTxData.public.initialContractState).toBe(contractState);
    expect(result.callTx).toBeDefined();
    expect(result.circuitMaintenanceTx).toBeDefined();
    expect(result.contractMaintenanceTx).toBeDefined();
  };

  const expectCommonProviderCalls = () => {
    expect(providers.publicDataProvider.watchForDeployTxData).toHaveBeenCalledWith(contractAddress);
    expect(providers.publicDataProvider.queryDeployContractState).toHaveBeenCalledWith(contractAddress);
    expect(providers.publicDataProvider.queryContractState).toHaveBeenCalledWith(contractAddress);
    expect(providers.zkConfigProvider.getVerifierKeys).toHaveBeenCalledWith(['testCircuit']);
  };

  beforeEach(() => {
    providers = createMockProviders();
    contractAddress = createMockContractAddress();
    contract = createMockContract();
    finalizedTxData = createMockFinalizedTxData();
    contractState = createMockContractState();
    verifierKeys = createMockVerifierKeys();

    setupCommonMocks();
  });

  it('should find deployed contract without private state', async () => {
    vi.mocked(providers.privateStateProvider.getSigningKey).mockResolvedValue(null);
    vi.mocked(providers.privateStateProvider.setSigningKey).mockResolvedValue(undefined);

    const options = {
      contract,
      contractAddress
    };

    const result = await findDeployedContract(providers, options);

    expectBasicResult(result);
    expectCommonProviderCalls();
  });

  it('should find deployed contract with provided signing key', async () => {
    const signingKey = createMockSigningKey();
    vi.mocked(providers.privateStateProvider.setSigningKey).mockResolvedValue(undefined);

    const options = {
      contract,
      contractAddress,
      signingKey
    };

    const result = await findDeployedContract(providers, options);

    expectBasicResult(result);
    expect(result.deployTxData.private.signingKey).toBe(signingKey);
    expect(providers.privateStateProvider.setSigningKey).toHaveBeenCalledWith(contractAddress, signingKey);
  });

  it('should find deployed contract with existing private state', async () => {
    const privateStateId = createMockPrivateStateId();
    const existingPrivateState = { test: 'existing-private-state' };

    vi.mocked(providers.privateStateProvider.getSigningKey).mockResolvedValue(null);
    vi.mocked(providers.privateStateProvider.setSigningKey).mockResolvedValue(undefined);
    vi.mocked(providers.privateStateProvider.get).mockResolvedValue(existingPrivateState);

    const options = {
      contract,
      contractAddress,
      privateStateId
    };

    const result = await findDeployedContract(providers, options);

    expectBasicResult(result);
    expect(result.deployTxData.private.initialPrivateState).toBe(existingPrivateState);
    expect(providers.privateStateProvider.get).toHaveBeenCalledWith(privateStateId);
  });

  it('should find deployed contract and store new private state', async () => {
    const privateStateId = createMockPrivateStateId();
    const initialPrivateState = { test: 'initial-private-state' };

    vi.mocked(providers.privateStateProvider.getSigningKey).mockResolvedValue(null);
    vi.mocked(providers.privateStateProvider.setSigningKey).mockResolvedValue(undefined);
    vi.mocked(providers.privateStateProvider.set).mockResolvedValue(undefined);

    const options = {
      contract,
      contractAddress,
      privateStateId,
      initialPrivateState
    };

    const result = await findDeployedContract(providers, options);

    expectBasicResult(result);
    expect(result.deployTxData.private.initialPrivateState).toBe(initialPrivateState);
    expect(providers.privateStateProvider.set).toHaveBeenCalledWith(privateStateId, initialPrivateState);
  });

  it('should find deployed contract with existing signing key', async () => {
    const existingSigningKey = createMockSigningKey();
    vi.mocked(providers.privateStateProvider.getSigningKey).mockResolvedValue(existingSigningKey);

    const options = {
      contract,
      contractAddress
    };

    const result = await findDeployedContract(providers, options);

    expectBasicResult(result);
    expect(result.deployTxData.private.signingKey).toBe(existingSigningKey);
    expect(providers.privateStateProvider.getSigningKey).toHaveBeenCalledWith(contractAddress);
    expect(providers.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
  });

  it('should throw error when contract is not found', async () => {
    vi.mocked(providers.publicDataProvider.watchForDeployTxData).mockResolvedValue(finalizedTxData);
    vi.mocked(providers.publicDataProvider.queryDeployContractState).mockResolvedValue(null);

    const options = {
      contract,
      contractAddress
    };

    await expect(findDeployedContract(providers, options)).rejects.toThrow(
      `No contract deployed at contract address '${contractAddress}'`
    );

    expect(providers.publicDataProvider.watchForDeployTxData).toHaveBeenCalledWith(contractAddress);
    expect(providers.publicDataProvider.queryDeployContractState).toHaveBeenCalledWith(contractAddress);
    expect(providers.publicDataProvider.queryContractState).not.toHaveBeenCalled();
    expect(providers.zkConfigProvider.getVerifierKeys).not.toHaveBeenCalled();
  });
});
