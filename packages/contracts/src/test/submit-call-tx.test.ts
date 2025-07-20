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
import {
  type Contract,
  FailEntirely,
  type FinalizedTxData,
  type ImpureCircuitId,
  type PrivateStateId
} from '@midnight-ntwrk/midnight-js-types';
import { type AlignedValue, type ContractAddress, type Transaction } from '@midnight-ntwrk/ledger';

import { submitCallTx } from '../submit-call-tx';
import { type CallTxOptions, createUnprovenCallTx } from '../unproven-call-tx';
import { submitTx } from '../submit-tx';
import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from '../errors';
import {
  createMockCoinInfo,
  createMockContract,
  createMockContractAddress,
  createMockFinalizedTxData,
  createMockPrivateStateId,
  createMockProviders,
  createMockUnprovenCallTxData,
  createMockUnprovenTx,
  createMockZswapLocalState
} from './test-mocks';
import type { FinalizedCallTxData, UnsubmittedCallTxData } from '../tx-model';
import { type PartitionedTranscript } from '../call';
import { StateValue } from '@midnight-ntwrk/compact-runtime';

describe('submit-call-tx', () => {
  let mockContract: Contract<undefined>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockZswapLocalState: ReturnType<typeof createMockZswapLocalState>;
  let mockPrivateStateId: PrivateStateId;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
  let mockCoinInfo: ReturnType<typeof createMockCoinInfo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContract = createMockContract();
    mockContractAddress = createMockContractAddress();
    mockZswapLocalState = createMockZswapLocalState();
    mockPrivateStateId = createMockPrivateStateId();
    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
    mockCoinInfo = createMockCoinInfo();

    vi.mock('../unproven-call-tx');
    vi.mock('../submit-tx');
  });

  const createBasicCallOptions = (overrides: Partial<CallTxOptions<Contract, ImpureCircuitId>> = {}) => ({
    contract: mockContract,
    contractAddress: mockContractAddress,
    circuitId: 'testCircuit' as ImpureCircuitId,
    args: ['arg1', 'arg2'],
    ...overrides
  });

  const setupSuccessfulMocks = () => {
    const mockUnprovenCallTxData = createMockUnprovenCallTxData();
    const mockFinalizedTxData = createMockFinalizedTxData();

    vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
    vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

    return { mockUnprovenCallTxData, mockFinalizedTxData };
  };

  const createFailedTxData = (): UnsubmittedCallTxData<Contract, ImpureCircuitId> => ({
    public: {
      nextContractState: StateValue.newNull(),
      publicTranscript: [],
      partitionedTranscript: {} as PartitionedTranscript
    },
    private: {
      input: {} as AlignedValue,
      output: {} as AlignedValue,
      unprovenTx: mockUnprovenTx,
      newCoins: [mockCoinInfo],
      nextPrivateState: { state: 'test' },
      nextZswapLocalState: mockZswapLocalState,
      privateTranscriptOutputs: {} as AlignedValue[],
      result: vi.fn()
    }
  });

  const verifySuccessfulCall = (
    mockUnprovenCallTxData: UnsubmittedCallTxData<Contract, ImpureCircuitId>,
    mockFinalizedTxData: FinalizedTxData,
    result: FinalizedCallTxData<Contract, ImpureCircuitId>,
    options: CallTxOptions<Contract, ImpureCircuitId>
  ) => {
    expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options);
    expect(submitTx).toHaveBeenCalledWith(mockProviders, {
      unprovenTx: mockUnprovenCallTxData.private.unprovenTx,
      newCoins: mockUnprovenCallTxData.private.newCoins,
      circuitId: 'testCircuit'
    });
    expect(result).toEqual({
      private: mockUnprovenCallTxData.private,
      public: {
        ...mockUnprovenCallTxData.public,
        ...mockFinalizedTxData
      }
    });
  };

  describe('submitCallTx', () => {
    describe('successful call without private state ID', () => {
      it('should successfully submit call transaction', async () => {
        const options = createBasicCallOptions();
        const { mockUnprovenCallTxData, mockFinalizedTxData } = setupSuccessfulMocks();

        const result = await submitCallTx(mockProviders, options);

        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('successful call with private state ID', () => {
      it('should successfully submit call transaction and update private state', async () => {
        const nextPrivateState = { newState: 'updated' };
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const { mockFinalizedTxData } = setupSuccessfulMocks();

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            nextPrivateState
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);

        const result = await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, nextPrivateState);
        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
      });
    });

    describe('configuration validation', () => {
      it('should throw IncompleteCallTxPrivateStateConfig when privateStateId provided without privateStateProvider', async () => {
        const providersWithoutPrivateState = { ...mockProviders };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (providersWithoutPrivateState as any).privateStateProvider;
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });

        await expect(submitCallTx(providersWithoutPrivateState, options)).rejects.toThrow(
          IncompleteCallTxPrivateStateConfig
        );

        expect(createUnprovenCallTx).not.toHaveBeenCalled();
        expect(submitTx).not.toHaveBeenCalled();
      });

      it('should accept privateStateProvider without privateStateId', async () => {
        const options = createBasicCallOptions();
        setupSuccessfulMocks();

        await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('failed call scenarios', () => {
      it('should throw CallTxFailedError when transaction fails with FailEntirely', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createFailedTxData();
        const mockFailedTxData = {
          status: FailEntirely,
          txId: 'failed-tx-id',
          blockHeight: 100,
          tx: {} as Transaction,
          txHash: 'hash',
          blockHash: 'hash'
        } as FinalizedTxData;

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow(CallTxFailedError);
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });

      it('should include failure data and circuit ID in CallTxFailedError', async () => {
        const circuitId = 'testCircuit' as ImpureCircuitId<Contract>;
        const options = createBasicCallOptions({ circuitId });
        const mockUnprovenCallTxData = createFailedTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        try {
          await submitCallTx(mockProviders, options);
          expect.fail('Expected CallTxFailedError to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(CallTxFailedError);
          expect((error as CallTxFailedError).finalizedTxData).toEqual(mockFailedTxData);
          expect((error as CallTxFailedError).circuitId).toEqual(circuitId);
        }
      });
    });

    describe('validation checks', () => {
      it('should validate contract address', async () => {
        const options = createBasicCallOptions({ contractAddress: 'invalid-address' as ContractAddress });

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow();
      });

      it('should validate circuit exists in contract', async () => {
        const options = createBasicCallOptions({ circuitId: 'nonExistentCircuit' as ImpureCircuitId });

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Circuit \'nonExistentCircuit\' is undefined');
      });
    });

    describe('error propagation', () => {
      it('should propagate errors from createUnprovenCallTx', async () => {
        const options = createBasicCallOptions();
        const createError = new Error('Failed to create unproven call tx');
        vi.mocked(createUnprovenCallTx).mockRejectedValue(createError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Failed to create unproven call tx');
        expect(submitTx).not.toHaveBeenCalled();
      });

      it('should propagate errors from submitTx', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createFailedTxData();
        const submitError = new Error('Network error during submission');

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockRejectedValue(submitError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Network error during submission');
      });

      it('should propagate errors from privateStateProvider.set', async () => {
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const stateError = new Error('Failed to set private state');

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockFinalizedTxData = createMockFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.set = vi.fn().mockRejectedValue(stateError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Failed to set private state');
      });
    });

    describe('edge cases', () => {
      it('should handle empty new coins array', async () => {
        const options = createBasicCallOptions();
        const mockFinalizedTxData = createMockFinalizedTxData();

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            newCoins: []
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitCallTx(mockProviders, options);

        expect(submitTx).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenCallTxData.private.unprovenTx,
          newCoins: [],
          circuitId: 'testCircuit'
        });
        expect(result).toEqual({
          private: mockUnprovenCallTxData.private,
          public: { ...mockUnprovenCallTxData.public, ...mockFinalizedTxData }
        });
      });

      it('should handle undefined next private state with private state ID', async () => {
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            nextPrivateState: undefined
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);

        await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, undefined);
      });

      it('should handle call without arguments', async () => {
        const options = createBasicCallOptions();
        const { mockUnprovenCallTxData, mockFinalizedTxData } = setupSuccessfulMocks();

        const result = await submitCallTx(mockProviders, options);

        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options);
        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
      });
    });
  });
});
