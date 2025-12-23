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

import { createContractAdapter } from '../../src/adapter/ContractAdapterBuilder.js';
import type { ContractProviders, Logger } from '../../src/types/contract-types.js';
import type { Witnesses } from '../../src/types/witness-types.js';

vi.mock('@midnight-ntwrk/midnight-js-contracts', () => ({
  deployContract: vi.fn().mockResolvedValue({
    deployTxData: {
      public: {
        contractAddress: '0xcontract123'
      },
      txHash: '0xtx123'
    },
    callTx: {
      increment: vi.fn().mockResolvedValue({ success: true }),
      getValue: vi.fn().mockResolvedValue(5)
    }
  }),
  findDeployedContract: vi.fn().mockResolvedValue({
    deployTxData: {
      public: {
        contractAddress: '0xcontract456'
      }
    },
    callTx: {
      increment: vi.fn().mockResolvedValue({ success: true }),
      getValue: vi.fn().mockResolvedValue(10)
    }
  })
}));

describe('Contract Adapter with Witnesses - Integration', () => {
  type CounterPrivateState = {
    privateCounter: number;
  };

  let mockProviders: ContractProviders;
  let mockLogger: Logger;
  let witnesses: Witnesses<any, CounterPrivateState>;
  let mockContractClass: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockProviders = {
      privateStateProvider: {
        get: vi.fn().mockResolvedValue({ privateCounter: 0 }),
        set: vi.fn().mockResolvedValue(undefined)
      },
      walletProvider: {} as any,
      indexerProvider: {} as any,
      proofProvider: {} as any,
      zkConfigProvider: {} as any
    };

    witnesses = {
      privateIncrement: ({ privateState }) => [
        { privateCounter: privateState.privateCounter + 1 },
        []
      ]
    };

    mockContractClass = class MockContract {
      constructor(public contractWitnesses: any) {}
    };
  });

  describe('deployment with witnesses', () => {
    it('should deploy contract with witnesses and private state', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .withLogger(mockLogger)
        .deploy(mockProviders);

      expect(contract.address).toBeDefined();
      expect(contract.getPrivateStateId()).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Attaching witnesses to contract...');
      expect(mockLogger.info).toHaveBeenCalledWith('Configuring private state...');
    });

    it('should deploy contract with custom state ID', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'my-custom-state-id',
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      expect(contract.getPrivateStateId()).toBe('my-custom-state-id');
    });

    it('should deploy contract with auto-generated state ID', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      const stateId = contract.getPrivateStateId();
      expect(stateId).toBeDefined();
      expect(stateId).toMatch(/^private-state-\d+-[a-z0-9]+$/);
    });

    it('should deploy contract without witnesses for contracts that do not need them', async () => {
      const simpleContractClass = class SimpleContract {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        constructor() {}
      };
      const contractInstance = new simpleContractClass();

      const contract = await createContractAdapter(contractInstance)
        .withLogger(mockLogger)
        .deploy(mockProviders);

      expect(contract.address).toBeDefined();
      expect(contract.getPrivateStateId()).toBeUndefined();
    });
  });

  describe('private state operations', () => {
    it('should get private state', async () => {
      mockProviders.privateStateProvider.get = vi.fn().mockResolvedValue({
        privateCounter: 42
      });

      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-state',
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      const state = await contract.getPrivateState();

      expect(state).toEqual({ privateCounter: 42 });
      expect(mockProviders.privateStateProvider.get).toHaveBeenCalledWith('test-state');
    });

    it('should set private state', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'test-state',
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      await contract.setPrivateState({ privateCounter: 100 });

      expect(mockProviders.privateStateProvider.set).toHaveBeenCalledWith(
        'test-state',
        { privateCounter: 100 }
      );
    });

    it('should throw error when accessing private state without configuration', async () => {
      const simpleContractClass = class SimpleContract {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        constructor() {}
      };
      const contractInstance = new simpleContractClass();

      const contract = await createContractAdapter(contractInstance)
        .deploy(mockProviders);

      await expect(contract.getPrivateState()).rejects.toThrow(
        'This contract does not have private state configured'
      );
    });
  });

  describe('contract connection with witnesses', () => {
    it('should connect to existing contract with witnesses', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          stateId: 'existing-state',
          initialState: { privateCounter: 50 }
        })
        .withLogger(mockLogger)
        .connect('0xcontract456', mockProviders);

      expect(contract.address).toBe('0xcontract456');
      expect(contract.getPrivateStateId()).toBe('existing-state');
      expect(mockLogger.info).toHaveBeenCalledWith('Attaching witnesses to contract...');
    });
  });

  describe('method calls with witnesses', () => {
    it('should call contract methods successfully', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      const result = await (contract as any).increment();

      expect(result).toEqual({ success: true });
    });

    it('should call multiple methods in sequence', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      await (contract as any).increment();
      await (contract as any).increment();
      const value = await (contract as any).getValue();

      expect(value).toBe(5);
    });
  });

  describe('debug mode', () => {
    it('should log state changes when debug is enabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 0 });

      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 },
          debug: true
        })
        .deploy(mockProviders);

      await contract.setPrivateState({ privateCounter: 10 });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PrivateState] State changed:',
        {
          from: { privateCounter: 0 },
          to: { privateCounter: 10 }
        }
      );

      consoleSpy.mockRestore();
    });

    it('should use withPrivateStateDebug method', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockProviders.privateStateProvider.get.mockResolvedValue({ privateCounter: 5 });

      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .withPrivateStateDebug(true)
        .deploy(mockProviders);

      await contract.setPrivateState({ privateCounter: 20 });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PrivateState] State changed:',
        expect.objectContaining({
          from: { privateCounter: 5 },
          to: { privateCounter: 20 }
        })
      );

      consoleSpy.mockRestore();
    });
  });


  describe('error scenarios', () => {
    it('should handle invalid private state', async () => {
      const contractInstance = new mockContractClass(witnesses);

      const contract = await createContractAdapter<typeof mockContractClass, any, CounterPrivateState>(
        contractInstance
      )
        .withWitnesses(witnesses)
        .withPrivateState({
          initialState: { privateCounter: 0 }
        })
        .deploy(mockProviders);

      await expect(contract.setPrivateState(null as any)).rejects.toThrow(
        'Invalid private state structure'
      );
    });
  });
});
