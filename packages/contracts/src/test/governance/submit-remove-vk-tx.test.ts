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

import { ContractOperation } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { COMMON_ERROR_CODES, InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { CONTRACTS_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitRemoveVerifierKeyTx } from '../../governance/submit-remove-vk-tx';
import { createUnprovenRemoveVerifierKeyTx } from '../../governance/unproven-tx';
import { submitTx } from '../../submit-tx';
import {
  createMockCoinPublicKey,
  createMockCompiledContract,
  createMockContractAddress,
  createMockContractState,
  createMockFinalizedTxData,
  createMockProviders,
  createMockSigningKey,
  createMockUnprovenTx
} from '../test-mocks';

vi.mock('../../submit-tx');
vi.mock('../../governance/unproven-tx');

describe('submitRemoveVerifierKeyTx', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockCompiledContract: ReturnType<typeof createMockCompiledContract>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockCoinPublicKey: ReturnType<typeof createMockCoinPublicKey>;
  let mockUnprovenTx: Promise<ReturnType<typeof createMockUnprovenTx>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProviders = createMockProviders();
    mockCompiledContract = createMockCompiledContract();
    mockContractAddress = createMockContractAddress();
    mockContractState = createMockContractState();
    mockSigningKey = createMockSigningKey();
    mockCoinPublicKey = createMockCoinPublicKey();
    mockUnprovenTx = Promise.resolve(createMockUnprovenTx());
  });

  it('refuses an invalid config before reading chain state', async () => {
    const providers = { ...mockProviders, config: { networkId: 'undeployed', ttlSeconds: 0 } };

    await expect(
      submitRemoveVerifierKeyTx(providers, mockCompiledContract, mockContractAddress, 'testCircuit')
    ).rejects.toThrow(InvalidArgumentError);
    expect(providers.publicDataProvider.queryContractState).not.toHaveBeenCalled();
  });

  describe('happy path', () => {
    it('should successfully submit remove verifier key transaction', async () => {
      const circuitId = 'testCircuit';
      const mockFinalizedTxData = createMockFinalizedTxData();
      const mockOperation = { verifierKey: new Uint8Array(32) };

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockProviders.walletProvider.getCoinPublicKey = vi.fn().mockReturnValue(mockCoinPublicKey);
      mockContractState.operation = vi.fn().mockReturnValue(mockOperation);

      vi.mocked(createUnprovenRemoveVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

      const result = await submitRemoveVerifierKeyTx(
        mockProviders,
        mockCompiledContract,
        mockContractAddress,
        circuitId
      );

      expect(mockProviders.publicDataProvider.queryContractState).toHaveBeenCalledWith(mockContractAddress);
      expect(mockProviders.privateStateProvider.getSigningKey).toHaveBeenCalledWith(mockContractAddress);
      expect(mockContractState.operation).toHaveBeenCalledWith(circuitId);
      expect(createUnprovenRemoveVerifierKeyTx).toHaveBeenCalledWith(
        mockProviders.zkConfigProvider,
        mockCompiledContract,
        mockContractAddress,
        circuitId,
        mockContractState,
        mockSigningKey,
        mockCoinPublicKey,
        mockProviders.config
      );
      expect(submitTx).toHaveBeenCalledWith(mockProviders, { unprovenTx: await mockUnprovenTx });
      expect(result).toBe(mockFinalizedTxData);
    });
  });

  describe('error scenarios', () => {
    it('refuses an address with no contract state as ContractNotFoundError', async () => {
      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(null);

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, 'testCircuit')
      ).rejects.toMatchObject({
        name: 'ContractNotFoundError',
        code: CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND,
        message: `No contract state found on chain for contract address '${mockContractAddress}'`
      });
      expect(submitTx).not.toHaveBeenCalled();
    });

    it('refuses a contract this caller holds no signing key for as InvalidArgumentError', async () => {
      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockContractState.operation = vi.fn().mockReturnValue({ verifierKey: new Uint8Array(32) });
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(undefined);

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, 'testCircuit')
      ).rejects.toMatchObject({
        name: 'InvalidArgumentError',
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: `Signing key for contract address '${mockContractAddress}' not found`
      });
      expect(submitTx).not.toHaveBeenCalled();
    });

    it('should reject before proving when the circuit is not registered on the contract', async () => {
      const circuitId = 'testCircuit';

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockContractState.operation = vi.fn().mockReturnValue(undefined);

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, circuitId)
      ).rejects.toMatchObject({
        name: 'InvalidArgumentError',
        code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
        message: `Circuit '${circuitId}' not found for contract at address '${mockContractAddress}'`
      });
      expect(mockProviders.privateStateProvider.getSigningKey).not.toHaveBeenCalled();
      expect(createUnprovenRemoveVerifierKeyTx).not.toHaveBeenCalled();
      expect(submitTx).not.toHaveBeenCalled();
    });

    it('should reject before proving when the operation carries no verifier key', async () => {
      const circuitId = 'testCircuit';

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockContractState.operation = vi.fn().mockReturnValue(new ContractOperation());

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, circuitId)
      ).rejects.toThrow(expect.objectContaining({ name: 'BlankVerifierKeySlotError', category: 'INTEGRITY', circuitId }));
      expect(mockProviders.privateStateProvider.getSigningKey).not.toHaveBeenCalled();
      expect(createUnprovenRemoveVerifierKeyTx).not.toHaveBeenCalled();
      expect(submitTx).not.toHaveBeenCalled();
    });

    it('should throw RemoveVerifierKeyTxFailedError when transaction fails', async () => {
      const { RemoveVerifierKeyTxFailedError } = await import('../../governance/errors');
      const { FailEntirely } = await import('@midnight-ntwrk/midnight-js-types');

      const circuitId = 'testCircuit';
      const failedTxData = createMockFinalizedTxData(FailEntirely);
      const mockOperation = { verifierKey: new Uint8Array(32) };

      mockProviders.publicDataProvider.queryContractState = vi.fn().mockResolvedValue(mockContractState);
      mockProviders.privateStateProvider.getSigningKey = vi.fn().mockResolvedValue(mockSigningKey);
      mockContractState.operation = vi.fn().mockReturnValue(mockOperation);

      vi.mocked(createUnprovenRemoveVerifierKeyTx).mockReturnValue(mockUnprovenTx);
      vi.mocked(submitTx).mockResolvedValue(failedTxData);

      await expect(
        submitRemoveVerifierKeyTx(mockProviders, mockCompiledContract, mockContractAddress, circuitId)
      ).rejects.toThrow(RemoveVerifierKeyTxFailedError);
    });
  });
});
