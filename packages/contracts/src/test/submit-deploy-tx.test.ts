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

import { COMMON_ERROR_CODES } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { type CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import { CURRENT_LEDGER_VERSION } from '@midnight-ntwrk/midnight-js-protocol/version';
import { FailEntirely, FailFallible, type PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IncompleteDeployContractPrivateStateConfig,Ledger9DeployTxFailedError } from '../errors';
import { submitDeployTx } from '../submit-deploy-tx';
import { submitLedger9Payload } from '../submit-tx';
import { createUnprovenDeployTx } from '../unproven-deploy-tx';
import {
  createMockCompiledContract,
  createMockFinalizedTxData,
  createMockPrivateStateId,
  createMockProviders,
  createMockSigningKey,
  createMockUnprovenDeployTxData,
  createMockUnprovenTx,
  createMockZswapLocalState
} from './test-mocks';

vi.mock('../unproven-deploy-tx');
vi.mock('../submit-tx');
vi.mock('@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime');

describe('submit-deploy-tx', () => {
  let mockCompiledContract: CompiledContract.CompiledContract<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockPrivateStateId: PrivateStateId;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCompiledContract = createMockCompiledContract();
    mockSigningKey = createMockSigningKey();
    mockPrivateStateId = createMockPrivateStateId();
    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
  });

  describe('submitDeployTx', () => {
    describe('successful deployment without private state ID', () => {
      it('should successfully submit deploy transaction and set signing key', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(createUnprovenDeployTx).toHaveBeenCalledWith(mockProviders, options);
        expect(submitLedger9Payload).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenDeployTxData.private.unprovenTx
        });
        expect(mockProviders.privateStateProvider.setSigningKey).toHaveBeenCalledWith(
          mockUnprovenDeployTxData.public.contractAddress,
          mockUnprovenDeployTxData.private.signingKey
        );
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(result).toEqual({
          era: CURRENT_LEDGER_VERSION,
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
          compiledContract: mockCompiledContract,
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
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, initialPrivateState);
        expect(mockProviders.privateStateProvider.setSigningKey).toHaveBeenCalledWith(
          mockUnprovenDeployTxData.public.contractAddress,
          mockUnprovenDeployTxData.private.signingKey
        );
        expect(result).toEqual({
          era: CURRENT_LEDGER_VERSION,
          private: mockUnprovenDeployTxData.private,
          public: {
            ...mockFinalizedTxData,
            ...mockUnprovenDeployTxData.public
          }
        });
      });
    });

    describe('failed deployment scenarios', () => {
      it('should throw Ledger9DeployTxFailedError when transaction fails with FailFallible', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailFallible);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFailedTxData);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow(Ledger9DeployTxFailedError);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(mockProviders.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
      });

      it('should throw Ledger9DeployTxFailedError when transaction fails with FailEntirely', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFailedTxData);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow(Ledger9DeployTxFailedError);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
        expect(mockProviders.privateStateProvider.setSigningKey).not.toHaveBeenCalled();
      });

      it('should include failure data in Ledger9DeployTxFailedError', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFailedTxData);

        try {
          await submitDeployTx(mockProviders, options);
          expect.fail('Expected Ledger9DeployTxFailedError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Ledger9DeployTxFailedError);
          expect((error as Ledger9DeployTxFailedError).finalizedTxData).toEqual(mockFailedTxData);
        }
      });
    });

    describe('error propagation', () => {
      it('should propagate errors from createUnprovenDeployTx', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const createError = new Error('Failed to create unproven deploy tx');
        vi.mocked(createUnprovenDeployTx).mockRejectedValue(createError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to create unproven deploy tx');
        expect(submitLedger9Payload).not.toHaveBeenCalled();
      });

      it('should propagate errors from submitTx', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();

        const submitError = new Error('Network error during submission');
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockRejectedValue(submitError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Network error during submission');
      });

      it('should propagate errors from privateStateProvider.set', async () => {
        const options = {
          compiledContract: mockCompiledContract,
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
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.set = vi.fn().mockRejectedValue(stateError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to set private state');
      });

      it('should propagate errors from privateStateProvider.setSigningKey', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        const signingKeyError = new Error('Failed to set signing key');
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.setSigningKey = vi.fn().mockRejectedValue(signingKeyError);

        await expect(submitDeployTx(mockProviders, options)).rejects.toThrow('Failed to set signing key');
      });
    });

    describe('edge cases', () => {
      it('should handle empty new coins array', async () => {
        const options = {
          compiledContract: mockCompiledContract,
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
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);

        const result = await submitDeployTx(mockProviders, options);

        expect(submitLedger9Payload).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenTx
        });
        expect(result).toEqual({
          era: CURRENT_LEDGER_VERSION,
          private: mockUnprovenDeployTxData.private,
          public: {
            ...mockFinalizedTxData,
            ...mockUnprovenDeployTxData.public
          }
        });
      });

      it('should handle undefined initial private state with private state ID', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: mockPrivateStateId,
          initialPrivateState: undefined
        };

        const mockUnprovenDeployTxData = createMockUnprovenDeployTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenDeployTx).mockResolvedValue(mockUnprovenDeployTxData);
        vi.mocked(submitLedger9Payload).mockResolvedValue(mockFinalizedTxData);

        await submitDeployTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, undefined);
      });
    });

    describe('half a private-state pairing', () => {
      it('submits an initial private state written as undefined and no id, storing nothing', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey,
          initialPrivateState: undefined
        };
        vi.mocked(createUnprovenDeployTx).mockResolvedValue(createMockUnprovenDeployTxData());
        vi.mocked(submitLedger9Payload).mockResolvedValue(createMockFinalizedTxData());

        await submitDeployTx(mockProviders, options);

        expect(submitLedger9Payload).toHaveBeenCalledTimes(1);
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });

      it('refuses an initial private state with no id to store it under, before anything is built', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey,
          initialPrivateState: { someState: 'test' }
        };

        const submitting = submitDeployTx(mockProviders, options);

        await expect(submitting).rejects.toBeInstanceOf(IncompleteDeployContractPrivateStateConfig);
        await expect(submitting).rejects.toThrow(
          "'initialPrivateState' was defined for contract deploy while 'privateStateId' was undefined"
        );
        expect(createUnprovenDeployTx).not.toHaveBeenCalled();
        expect(submitLedger9Payload).not.toHaveBeenCalled();
      });

      it('refuses a private state id with no initial private state, before anything is built', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: mockPrivateStateId
        };

        const submitting = submitDeployTx(mockProviders, options);

        await expect(submitting).rejects.toBeInstanceOf(IncompleteDeployContractPrivateStateConfig);
        await expect(submitting).rejects.toThrow(
          "'privateStateId' was defined for contract deploy while 'initialPrivateState' was omitted"
        );
        expect(createUnprovenDeployTx).not.toHaveBeenCalled();
        expect(submitLedger9Payload).not.toHaveBeenCalled();
      });

      it('refuses a private state id given as undefined, before anything is built', async () => {
        const options = {
          compiledContract: mockCompiledContract,
          args: [],
          signingKey: mockSigningKey,
          privateStateId: undefined,
          initialPrivateState: { someState: 'test' }
        };

        const submitting = submitDeployTx(mockProviders, options);

        await expect(submitting).rejects.toMatchObject({
          name: 'InvalidArgumentError',
          code: COMMON_ERROR_CODES.INVALID_ARGUMENT,
          message: expect.stringContaining("'privateStateId' was given as undefined")
        });
        expect(createUnprovenDeployTx).not.toHaveBeenCalled();
        expect(submitLedger9Payload).not.toHaveBeenCalled();
      });
    });
  });
});
