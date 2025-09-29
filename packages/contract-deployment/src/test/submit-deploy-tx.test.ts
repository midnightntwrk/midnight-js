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

import { submitTx } from '@midnight-ntwrk/midnight-js-contract-core';
import {
  createMockContract,
  createMockContractAddress,
  createMockFinalizedTxData,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockUnprovenTx,
  createMockZswapLocalState
} from '@midnight-ntwrk/midnight-js-contract-mocks';
import { type Contract, FailEntirely, FailFallible, type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeployTxFailedError } from '../errors';
import { submitDeployTx } from '../submit-deploy-tx';
import { createUnprovenDeployTx } from '../unproven-deploy-tx';
import { createMockUnprovenDeployTxData } from './mocks';

vi.mock('../unproven-deploy-tx');
vi.mock('../submit-tx');
vi.mock('@midnight-ntwrk/compact-runtime');
vi.mock('@midnight-ntwrk/ledger');

describe('submit-deploy-tx', () => {
  let mockContract: Contract<undefined>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockPrivateStateId: PrivateStateId;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContract = createMockContract();
    mockContractAddress = createMockContractAddress();
    mockSigningKey = createMockSigningKey();
    mockPrivateStateId = createMockPrivateStateId();
    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
  });

  describe('submitDeployTx', () => {
    describe('successful deployment without private state ID', () => {
      it('should successfully submit deploy transaction and set signing key', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(createUnprovenDeployTx).toHaveBeenCalledWith(mockProviders, options);
        expect(submitTx).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenDeployTxData.private.unprovenTx,
          newCoins: mockUnprovenDeployTxData.private.newCoins
        });
        expect(mockProviders.privateStateProvider.setSigningKey).toHaveBeenCalledWith(
          mockContractAddress,
          mockSigningKey
        );
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(result).toEqual({
          private: mockUnprovenDeployTxData.private,
          public: {
            ...mockFinalizedTxData,
            ...mockUnprovenDeployTxData.public
          }
        });
      });
    });

    describe('successful deployment with private state ID', () => {
      it('should successfully submit deploy transaction and set both signing key and private state', async () => {
        const initialPrivateState = { someState: 'test' };
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: mockPrivateStateId,
          initialPrivateState
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData({
          private: {
            initialPrivateState: initialPrivateState,
            signingKey: mockSigningKey,
            unprovenTx: mockUnprovenTx,
            newCoins: [],
            initialZswapState: createMockZswapLocalState()
          }
        });
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, initialPrivateState);
        expect(mockProviders.privateStateProvider.setSigningKey).toHaveBeenCalledWith(
          mockContractAddress,
          mockSigningKey
        );
        expect(result).toEqual({
          private: mockUnprovenDeployTxData.private,
          public: {
            ...mockFinalizedTxData,
            ...mockUnprovenDeployTxData.public
          }
        });
      });
    });

    describe('failed deployment scenarios', () => {
      it('should throw DeployTxFailedError when transaction fails with FailFallible', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailFallible);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow(DeployTxFailedError);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(mockProviders.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
      });

      it('should throw DeployTxFailedError when transaction fails with FailEntirely', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow(DeployTxFailedError);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(mockProviders.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
      });

      it('should include failure data in DeployTxFailedError', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        try {
          await submitDeployTx(mockProviders, options);
          expect.fail('Expected DeployTxFailedError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DeployTxFailedError);
          expect((error as DeployTxFailedError).finalizedTxData).toEqual(mockFailedTxData);
        }
      });
    });

    describe('error propagation', () => {
      it('should propagate errors from createUnprovenDeployTx', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const createError = new Error('Failed to create unproven deploy tx');
        vi.mocked(createUnprovenDeployTx).mockRejectedValue(createError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to create unproven deploy tx');
        expect(submitTx).not.toHaveBeenCalled();
      });

      it('should propagate errors from submitTx', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();

        const submitError = new Error('Network error during submission');
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockRejectedValue(submitError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Network error during submission');
      });

      it('should propagate errors from privateStateProvider.set', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: mockPrivateStateId,
          initialPrivateState: { someState: 'test' }
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData({
          private: {
            initialPrivateState: { someState: 'test' },
            signingKey: mockSigningKey,
            unprovenTx: mockUnprovenTx,
            newCoins: [],
            initialZswapState: createMockZswapLocalState()
          }
        });

        const mockFinalizedTxData = createMockFinalizedTxData();

        const stateError = new Error('Failed to set private state');
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.set = vi.fn().mockRejectedValue(stateError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to set private state');
      });

      it('should propagate errors from privateStateProvider.setSigningKey', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        const signingKeyError = new Error('Failed to set signing key');
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.setSigningKey = vi.fn().mockRejectedValue(signingKeyError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to set signing key');
      });
    });

    describe('edge cases', () => {
      it('should handle empty new coins array', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData({
          private: {
            unprovenTx: mockUnprovenTx,
            newCoins: [],
            signingKey: mockSigningKey,
            initialPrivateState: undefined,
            initialZswapState: createMockZswapLocalState()
          }
        });
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(submitTx).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenTx,
          newCoins: []
        });
        expect(result).toEqual({
          private: mockUnprovenDeployTxData.private,
          public: {
            ...mockFinalizedTxData,
            ...mockUnprovenDeployTxData.public
          }
        });
      });

      it('should handle undefined initial private state with private state ID', async () => {
        const options = {
          contract: mockContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: mockPrivateStateId,
          initialPrivateState: undefined
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        await submitDeployTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, undefined);
      });
    });
  });
});
