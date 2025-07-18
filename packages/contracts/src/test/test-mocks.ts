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

import { vi } from 'vitest';
import {
  type Contract,
  type FinalizedTxData,
  type PrivateStateId,
  SucceedEntirely,
  type TxStatus
} from '@midnight-ntwrk/midnight-js-types';
import {
  type ContractState,
  type Op,
  sampleContractAddress,
  sampleSigningKey,
  type SigningKey,
  StateValue,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import {
  type AlignedValue,
  type CoinInfo,
  sampleCoinPublicKey,
  type Transaction,
  type UnprovenTransaction
} from '@midnight-ntwrk/ledger';
import type { ContractProviders } from '../contract-providers';
import { type CallOptions, type PartitionedTranscript } from '../call';
import { type ContractConstructorResult } from '../call-constructor';

export const createMockContractAddress = () => sampleContractAddress();

export const createMockSigningKey = () => sampleSigningKey();

export const createMockCoinPublicKey = () => sampleCoinPublicKey();

export const createMockPrivateStateId = (): PrivateStateId => 'test-private-state-id' as PrivateStateId;

export const createMockContractState = (signingKey?: SigningKey): ContractState =>
  ({
    serialize: vi.fn().mockReturnValue(new Uint8Array(32)),
    data: StateValue.newNull(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    operation: vi.fn().mockImplementation((_circuitId: string) => ({
      verifierKey: new Uint8Array(32)
    })),
    query: vi.fn(),
    operations: vi.fn(),
    setOperation: vi.fn(),
    maintenanceAuthority: {
      threshold: 1,
      committee: [signingKey || createMockSigningKey()],
      counter: 1n
    }
  }) as unknown as ContractState;

export const createMockZswapLocalState = (): ZswapLocalState => ({
  currentIndex: 0n,
  coinPublicKey: createMockCoinPublicKey(),
  outputs: [],
  inputs: []
});

export const createMockContract = (): Contract => ({
  initialState: vi.fn().mockReturnValue({
    currentContractState: createMockContractState(),
    currentPrivateState: { test: 'mock-private-state' },
    currentZswapLocalState: new Uint8Array(0) // Simple empty array that the mock will handle
  }),
  impureCircuits: {
    testCircuit: vi.fn()
  }
} as unknown as Contract);

export const createMockUnprovenTx = (): UnprovenTransaction => ({
  id: 'unproven-tx-id',
  inputs: [],
  outputs: [],
  fee: 100n,
  validityWindow: { start: 0n, end: 100n }
} as unknown as UnprovenTransaction);

export const createMockCoinInfo = (): CoinInfo => ({
  type: 'shielded',
  nonce: 'nonce',
  value: 0n
});

export const createMockProviders = (): ContractProviders<any> => ({
  midnightProvider: {
    submitTx: vi.fn(),
  },
  publicDataProvider: {
    watchForDeployTxData: vi.fn(),
    queryDeployContractState: vi.fn(),
    queryContractState: vi.fn(),
    queryZSwapAndContractState: vi.fn(),
    watchForContractState: vi.fn(),
    watchForTxData: vi.fn(),
    contractStateObservable: vi.fn()
  },
  privateStateProvider: {
    get: vi.fn(),
    set: vi.fn(),
    getSigningKey: vi.fn(),
    setSigningKey: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    clearSigningKeys: vi.fn(),
    removeSigningKey: vi.fn()
  },
  zkConfigProvider: {
    getVerifierKeys: vi.fn(),
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn(),
    get: vi.fn()
  },
  walletProvider: {
    coinPublicKey: createMockCoinPublicKey(),
    encryptionPublicKey: {} as any,
    balanceTx: vi.fn()
  },
  proofProvider: {
    proveTx: vi.fn()
  }
});

export const createMockFinalizedTxData = (status: TxStatus = SucceedEntirely): FinalizedTxData => ({
  status: status,
  txId: 'test-tx-id',
  blockHeight: 100,
  tx: undefined as unknown as Transaction,
  txHash: 'hash',
  blockHash: 'hash'
});

export const createMockUnprovenDeployTxData = () => ({
  public: {
    contractAddress: createMockContractAddress(),
    initialContractState: createMockContractState()
  },
  private: {
    unprovenTx: createMockUnprovenTx(),
    newCoins: [createMockCoinInfo()],
    signingKey: createMockSigningKey(),
    initialPrivateState: undefined,
    initialZswapState: createMockZswapLocalState()
  },
});

export const createMockUnprovenCallTxData = () => ({
    public: {
      contractAddress: createMockContractAddress(),
      contractState: createMockContractState(),
      nextContractState: StateValue.newNull(),
      publicTranscript: [
        { noop: { n: 1 } }
      ] as Op<AlignedValue>[],
      partitionedTranscript: undefined as unknown as PartitionedTranscript
    },
    private: {
      unprovenTx: createMockUnprovenTx(),
      newCoins: [createMockCoinInfo()],
      nextPrivateState: { state: 'test' },
      nextZswapState: createMockZswapLocalState(),
      input: undefined as unknown as AlignedValue,
      output: undefined as unknown as AlignedValue,
      privateTranscriptOutputs: undefined as unknown as AlignedValue[],
      result: undefined,
      newState: 'undefined',
      nextZswapLocalState: createMockZswapLocalState()
    }
});

export const createMockCallOptions = (overrides: any = {}): CallOptions<any, any> => ({
  contract: createMockContract(),
  circuitId: 'testCircuit',
  contractAddress: createMockContractAddress(),
  coinPublicKey: createMockCoinPublicKey(),
  initialContractState: createMockContractState(),
  initialZswapChainState: { test: 'zswap-chain-state' },
  ...overrides
});

export const createMockCallOptionsWithPrivateState = (overrides: any = {}): CallOptions<any, any> => ({
  ...createMockCallOptions(),
  initialPrivateState: { test: 'private-state' },
  ...overrides
});

export const createMockConstructorResult = (): ContractConstructorResult<any> => ({
  nextContractState: createMockContractState(),
  nextPrivateState: { test: 'next-private-state' },
  nextZswapLocalState: createMockZswapLocalState(),
});

export const createMockVerifierKeys = () => [
  ['testCircuit', new Uint8Array(32)] as const
];

export const createMockEncryptionPublicKey = () => 'test-encryption-public-key' as any;

export const createMockFinalizedDeployTxData = (): FinalizedTxData => ({
  status: SucceedEntirely,
  txId: 'deploy-tx-id',
  blockHeight: 100,
  tx: vi.fn() as unknown as Transaction,
  txHash: 'deploy-hash',
  blockHash: 'block-hash'
});

export const createMockDeployedContract = () => ({
  deployTxData: {
    public: {
      ...createMockFinalizedDeployTxData(),
      contractAddress: createMockContractAddress(),
      initialContractState: createMockContractState()
    },
    private: {
      signingKey: createMockSigningKey(),
      initialPrivateState: undefined,
      initialZswapState: createMockZswapLocalState(),
      unprovenTx: createMockUnprovenTx(),
      newCoins: [createMockCoinInfo()]
    }
  },
  callTx: vi.fn(),
  circuitMaintenanceTx: vi.fn(),
  contractMaintenanceTx: vi.fn()
});

