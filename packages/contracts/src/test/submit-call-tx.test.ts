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

import { StateValue } from '@midnight-ntwrk/compact-runtime';
import { type AlignedValue, type ContractAddress, type PartitionedTranscript } from '@midnight-ntwrk/ledger-v7';
import {
  type Contract,
  FailEntirely,
  type FinalizedTxData,
  type ImpureCircuitId,
  type PrivateState,
  type PrivateStateId
} from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from '../errors';
import { submitCallTx, submitCallTxAsync } from '../submit-call-tx';
import { submitTx, submitTxAsync } from '../submit-tx';
import { withContractScopedTransaction } from '../transaction';
import type { FinalizedCallTxData, UnsubmittedCallTxData } from '../tx-model';
import { type CallTxOptions, createUnprovenCallTx } from '../unproven-call-tx';
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
      privateTranscriptOutputs: [] as AlignedValue[],
      result: vi.fn()
    }
  });

  const verifySuccessfulCall = (
    mockUnprovenCallTxData: UnsubmittedCallTxData<Contract, ImpureCircuitId>,
    mockFinalizedTxData: FinalizedTxData,
    result: FinalizedCallTxData<Contract, ImpureCircuitId>,
    options: CallTxOptions<Contract, ImpureCircuitId>
  ) => {
    expect(createUnprovenCallTx).toHaveBeenCalledWith(
      mockProviders,
      options,
      expect.anything() // Ignore transaction context.
    );
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

      it('should successfully submit scoped call transaction', async () => {
        const options = createBasicCallOptions();
        const { mockUnprovenCallTxData, mockFinalizedTxData } = setupSuccessfulMocks();

        const result = await withContractScopedTransaction(mockProviders, async (txCtx) => {
          await submitCallTx(mockProviders, options, txCtx);
        });

        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('successful call with private state ID', () => {
      it('should successfully submit call transaction and update private state', async () => {
        const nextPrivateState = { newState: 'updated' } as PrivateState<Contract>;
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const { mockFinalizedTxData } = setupSuccessfulMocks();

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            nextPrivateState,
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: vi.fn(),
            nextZswapLocalState: mockZswapLocalState,
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo]
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);

        const result = await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, nextPrivateState);
        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
      });

      it('should successfully submit scoped call transaction and update private state', async () => {
        const nextPrivateState_1 = { newState: 'updated_1' } as PrivateState<Contract>;
        const nextPrivateState_2 = { newState: 'updated_2' } as PrivateState<Contract>;
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const { mockFinalizedTxData } = setupSuccessfulMocks();

        const mockUnprovenCallTxData_1 = createMockUnprovenCallTxData({
          private: {
            nextPrivateState: nextPrivateState_1,
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: '1',
            nextZswapLocalState: mockZswapLocalState,
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo]
          }
        });
        const mockUnprovenCallTxData_2 = createMockUnprovenCallTxData({
          private: {
            nextPrivateState: nextPrivateState_2,
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: '2',
            nextZswapLocalState: mockZswapLocalState,
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo]
          }
        });

        const result = await withContractScopedTransaction(mockProviders, async (txCtx) => {
          vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData_1);
          const result_1 = await submitCallTx(mockProviders, options, txCtx);
          expect(result_1.private.result).toBe('1');

          vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData_2);
          const result_2 = await submitCallTx(mockProviders, options, txCtx);
          expect(result_2.private.result).toBe('2');
        });

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, nextPrivateState_2);
        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options, expect.anything());
        expect(result).toEqual({
          private: mockUnprovenCallTxData_2.private,
          public: {
            ...mockUnprovenCallTxData_2.public,
            ...mockFinalizedTxData
          }
        });
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
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow(CallTxFailedError);
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });

      it('should throw CallTxFailedError when scoped transaction fails with FailEntirely', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createFailedTxData();
        const mockFailedTxData = createMockFinalizedTxData(FailEntirely);

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(withContractScopedTransaction(mockProviders, async (txCtx) => {
          await submitCallTx(mockProviders, options, txCtx);
        })).rejects.toThrow(CallTxFailedError);

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

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow("Circuit 'nonExistentCircuit' is undefined");
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
            newCoins: [],
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: vi.fn(),
            nextZswapLocalState: mockZswapLocalState,
            nextPrivateState: { state: 'test' },
            unprovenTx: mockUnprovenTx
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
            nextPrivateState: undefined,
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: vi.fn(),
            nextZswapLocalState: mockZswapLocalState,
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo]
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

        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options, expect.anything());
        verifySuccessfulCall(mockUnprovenCallTxData, mockFinalizedTxData, result, options);
      });
    });
  });

  describe('submitCallTxAsync', () => {
    describe('successful async submission', () => {
      it('should submit transaction and return txId with call data without waiting', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockTxId = 'test-tx-id-123';

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockResolvedValue(mockTxId);

        const result = await submitCallTxAsync(mockProviders, options);

        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options);
        expect(submitTxAsync).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenCallTxData.private.unprovenTx,
          newCoins: mockUnprovenCallTxData.private.newCoins,
          circuitId: 'testCircuit'
        });
        expect(result).toEqual({
          txId: mockTxId,
          callTxData: mockUnprovenCallTxData
        });
      });

      it('should not update private state during async submission', async () => {
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockTxId = 'test-tx-id-456';

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockResolvedValue(mockTxId);

        await submitCallTxAsync(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('configuration validation', () => {
      it('should throw IncompleteCallTxPrivateStateConfig when privateStateId provided without privateStateProvider', async () => {
        const providersWithoutPrivateState = { ...mockProviders };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (providersWithoutPrivateState as any).privateStateProvider;
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });

        await expect(submitCallTxAsync(providersWithoutPrivateState, options)).rejects.toThrow(
          IncompleteCallTxPrivateStateConfig
        );

        expect(createUnprovenCallTx).not.toHaveBeenCalled();
        expect(submitTxAsync).not.toHaveBeenCalled();
      });

      it('should accept privateStateProvider without privateStateId', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockTxId = 'test-tx-id-789';

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockResolvedValue(mockTxId);

        await submitCallTxAsync(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('validation checks', () => {
      it('should validate contract address', async () => {
        const options = createBasicCallOptions({ contractAddress: 'invalid-address' as ContractAddress });

        await expect(submitCallTxAsync(mockProviders, options)).rejects.toThrow();
      });

      it('should validate circuit exists in contract', async () => {
        const options = createBasicCallOptions({ circuitId: 'nonExistentCircuit' as ImpureCircuitId });

        await expect(submitCallTxAsync(mockProviders, options)).rejects.toThrow("Circuit 'nonExistentCircuit' is undefined");
      });
    });

    describe('error propagation', () => {
      it('should propagate errors from createUnprovenCallTx', async () => {
        const options = createBasicCallOptions();
        const createError = new Error('Failed to create unproven call tx');
        vi.mocked(createUnprovenCallTx).mockRejectedValue(createError);

        await expect(submitCallTxAsync(mockProviders, options)).rejects.toThrow('Failed to create unproven call tx');
        expect(submitTxAsync).not.toHaveBeenCalled();
      });

      it('should propagate errors from submitTxAsync', async () => {
        const options = createBasicCallOptions();
        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const submitError = new Error('Network error during submission');

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockRejectedValue(submitError);

        await expect(submitCallTxAsync(mockProviders, options)).rejects.toThrow('Network error during submission');
      });
    });

    describe('edge cases', () => {
      it('should handle empty new coins array', async () => {
        const options = createBasicCallOptions();
        const mockTxId = 'test-tx-id-empty-coins';

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            newCoins: [],
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: vi.fn(),
            nextZswapLocalState: mockZswapLocalState,
            nextPrivateState: { state: 'test' },
            unprovenTx: mockUnprovenTx
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockResolvedValue(mockTxId);

        const result = await submitCallTxAsync(mockProviders, options);

        expect(submitTxAsync).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenCallTxData.private.unprovenTx,
          newCoins: [],
          circuitId: 'testCircuit'
        });
        expect(result.txId).toBe(mockTxId);
        expect(result.callTxData).toEqual(mockUnprovenCallTxData);
      });

      it('should return callTxData with all private state information', async () => {
        const options = createBasicCallOptions({ privateStateId: mockPrivateStateId });
        const mockTxId = 'test-tx-id-full-data';
        const nextPrivateState = { complexState: 'data' } as PrivateState<Contract>;

        const mockUnprovenCallTxData = createMockUnprovenCallTxData({
          private: {
            nextPrivateState,
            input: {} as AlignedValue,
            output: {} as AlignedValue,
            privateTranscriptOutputs: [] as AlignedValue[],
            result: vi.fn(),
            nextZswapLocalState: mockZswapLocalState,
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo]
          }
        });
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTxAsync).mockResolvedValue(mockTxId);

        const result = await submitCallTxAsync(mockProviders, options);

        expect(result.callTxData.private.nextPrivateState).toEqual(nextPrivateState);
        expect(result.callTxData).toEqual(mockUnprovenCallTxData);
      });
    });
  });
});
