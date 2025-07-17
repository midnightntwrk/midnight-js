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
  type ImpureCircuitId,
  FailEntirely,
  type PrivateStateId
} from '@midnight-ntwrk/midnight-js-types';
import { type Transaction } from '@midnight-ntwrk/ledger';

import { submitCallTx } from '../submit-call-tx';
import { createUnprovenCallTx } from '../unproven-call-tx';
import { submitTx } from '../submit-tx';
import { CallTxFailedError, IncompleteCallTxPrivateStateConfig } from '../errors';
import {
  createMockContract,
  createMockContractAddress,
  createMockSigningKey,
  createMockContractState,
  createMockZswapLocalState,
  createMockPrivateStateId,
  createMockProviders,
  createMockUnprovenTx,
  createMockCoinInfo, createMockSuccessFinalizedTxData, createMockUnprovenCallTxData
} from './test-mocks';

vi.mock('../unproven-call-tx');
vi.mock('../submit-tx');
vi.mock('@midnight-ntwrk/compact-runtime');
vi.mock('@midnight-ntwrk/ledger');

describe('submit-call-tx', () => {
  let mockContract: Contract;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockSigningKey: ReturnType<typeof createMockSigningKey>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockZswapLocalState: ReturnType<typeof createMockZswapLocalState>;
  let mockPrivateStateId: PrivateStateId;
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockUnprovenTx: ReturnType<typeof createMockUnprovenTx>;
  let mockCoinInfo: ReturnType<typeof createMockCoinInfo>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContract = createMockContract();
    mockContractAddress = createMockContractAddress();
    mockSigningKey = createMockSigningKey();
    mockContractState = createMockContractState(mockSigningKey);
    mockZswapLocalState = createMockZswapLocalState();
    mockPrivateStateId = createMockPrivateStateId();
    mockProviders = createMockProviders();
    mockUnprovenTx = createMockUnprovenTx();
    mockCoinInfo = createMockCoinInfo();
  });

  describe('submitCallTx', () => {
    describe('successful call without private state ID', () => {
      it('should successfully submit call transaction', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        mockUnprovenCallTxData.private.newState = 'updated';

        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitCallTx(mockProviders, options);

        // Verify createUnprovenCallTx was called correctly
        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options);

        // Verify submitTx was called correctly
        expect(submitTx).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenTx,
          newCoins: [mockCoinInfo],
          circuitId: 'testCircuit'
        });

        // Verify private state was not set (no privateStateId)
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();

        // Verify result structure
        expect(result).toEqual({
          private: mockUnprovenCallTxData.private,
          public: {
            ...mockUnprovenCallTxData.public,
            ...mockFinalizedTxData
          }
        });
      });
    });

    describe('successful call with private state ID', () => {
      it('should successfully submit call transaction and update private state', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2'],
          privateStateId: mockPrivateStateId
        };

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const nextPrivateState = { newState: 'updated' };
        mockUnprovenCallTxData.private.nextPrivateState = nextPrivateState;

        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitCallTx(mockProviders, options);

        // Verify private state was set
        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, nextPrivateState);

        // Verify result structure
        expect(result).toEqual({
          private: mockUnprovenCallTxData.private,
          public: {
            ...mockUnprovenCallTxData.public,
            ...mockFinalizedTxData
          }
        });
      });
    });

    describe('configuration validation', () => {
      it('should throw IncompleteCallTxPrivateStateConfig when privateStateId provided without privateStateProvider', async () => {
        const providersWithoutPrivateState = {
          ...mockProviders
        };
        delete (providersWithoutPrivateState as any).privateStateProvider;

        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2'],
          privateStateId: mockPrivateStateId
        };

        await expect(submitCallTx(providersWithoutPrivateState, options)).rejects.toThrow(
          IncompleteCallTxPrivateStateConfig
        );

        expect(createUnprovenCallTx).not.toHaveBeenCalled();
        expect(submitTx).not.toHaveBeenCalled();
      });

      it('should accept privateStateProvider without privateStateId', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });
    });

    describe('failed call scenarios', () => {
      it('should throw CallTxFailedError when transaction fails with FailEntirely', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = {
          public: {
            contractAddress: mockContractAddress,
            contractState: mockContractState
          },
          private: {
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo],
            nextPrivateState: { state: 'test' },
            nextZswapState: mockZswapLocalState
          }
        };

        const mockFailedTxData = {
          status: FailEntirely,
          txId: 'failed-tx-id',
          finalizedAt: new Date(),
          blockHeight: 100,
          failureReason: 'Insufficient funds',
          tx: undefined as unknown as Transaction,
          txHash: 'hash',
          blockHash: 'hash'
        };

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFailedTxData);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow(CallTxFailedError);

        // Verify that private state is not set when call fails
        expect(mockProviders.privateStateProvider.set).not.toHaveBeenCalled();
      });

      it('should include failure data and circuit ID in CallTxFailedError', async () => {
        const circuitId = 'testCircuit' as ImpureCircuitId<Contract>;
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = {
          public: {
            contractAddress: mockContractAddress,
            contractState: mockContractState
          },
          private: {
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo],
            nextPrivateState: { state: 'test' },
            nextZswapState: mockZswapLocalState
          }
        };

        const mockFailedTxData = {
          status: FailEntirely,
          txId: 'failed-tx-id',
          finalizedAt: new Date(),
          blockHeight: 100,
          failureReason: 'Circuit execution failed',
          tx: undefined as unknown as Transaction,
          txHash: 'hash',
          blockHash: 'hash'
        };

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
        const options = {
          contract: mockContract,
          contractAddress: 'invalid-address' as any,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow();
      });

      it('should validate circuit exists in contract', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'nonExistentCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Circuit \'nonExistentCircuit\' is undefined');
      });
    });

    describe('error propagation', () => {
      it('should propagate errors from createUnprovenCallTx', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const createError = new Error('Failed to create unproven call tx');
        vi.mocked(createUnprovenCallTx).mockRejectedValue(createError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Failed to create unproven call tx');

        expect(submitTx).not.toHaveBeenCalled();
      });

      it('should propagate errors from submitTx', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = {
          public: {
            contractAddress: mockContractAddress,
            contractState: mockContractState
          },
          private: {
            unprovenTx: mockUnprovenTx,
            newCoins: [mockCoinInfo],
            nextPrivateState: { state: 'test' },
            nextZswapState: mockZswapLocalState
          }
        };

        const submitError = new Error('Network error during submission');
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockRejectedValue(submitError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Network error during submission');
      });

      it('should propagate errors from privateStateProvider.set', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2'],
          privateStateId: mockPrivateStateId
        };

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        const stateError = new Error('Failed to set private state');
        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);
        mockProviders.privateStateProvider.set = vi.fn().mockRejectedValue(stateError);

        await expect(submitCallTx(mockProviders, options)).rejects.toThrow('Failed to set private state');
      });
    });

    describe('edge cases', () => {
      it('should handle empty new coins array', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2']
        };

        const mockUnprovenCallTxData = {
          public: {
            contractAddress: mockContractAddress,
            contractState: mockContractState
          },
          private: {
            unprovenTx: mockUnprovenTx,
            newCoins: [], // Empty array
            nextPrivateState: { state: 'test' },
            nextZswapState: mockZswapLocalState
          }
        };

        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitCallTx(mockProviders, options);

        expect(submitTx).toHaveBeenCalledWith(mockProviders, {
          unprovenTx: mockUnprovenTx,
          newCoins: [],
          circuitId: 'testCircuit'
        });

        expect(result).toEqual({
          private: mockUnprovenCallTxData.private,
          public: {
            ...mockUnprovenCallTxData.public,
            ...mockFinalizedTxData
          }
        });
      });

      it('should handle undefined next private state with private state ID', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>,
          args: ['arg1', 'arg2'],
          privateStateId: mockPrivateStateId
        };

        const mockUnprovenCallTxData = createMockUnprovenCallTxData();
        mockUnprovenCallTxData.private.nextPrivateState = undefined;
        const mockFinalizedTxData = createMockSuccessFinalizedTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        await submitCallTx(mockProviders, options);

        expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(mockPrivateStateId, undefined);
      });

      it('should handle call without arguments', async () => {
        const options = {
          contract: mockContract,
          contractAddress: mockContractAddress,
          circuitId: 'testCircuit' as ImpureCircuitId<Contract>
        };

        const mockFinalizedTxData = createMockSuccessFinalizedTxData();
        const mockUnprovenCallTxData = createMockUnprovenCallTxData();

        vi.mocked(createUnprovenCallTx).mockResolvedValue(mockUnprovenCallTxData);
        vi.mocked(submitTx).mockResolvedValue(mockFinalizedTxData);

        const result = await submitCallTx(mockProviders, options);

        expect(createUnprovenCallTx).toHaveBeenCalledWith(mockProviders, options);
        expect(result).toEqual({
          private: mockUnprovenCallTxData.private,
          public: {
            ...mockUnprovenCallTxData.public,
            ...mockFinalizedTxData
          }
        });
      });
    });
  });
});
