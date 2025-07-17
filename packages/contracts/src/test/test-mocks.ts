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
  type Contract, type FinalizedTxData,
  type PrivateStateId,
  SucceedEntirely,
  type TxStatus
} from '@midnight-ntwrk/midnight-js-types';
import {
  type SigningKey,
  sampleSigningKey,
  type ZswapLocalState,
  type ContractState, StateValue, type Op
} from '@midnight-ntwrk/compact-runtime';
import {
  type ContractAddress,
  type CoinInfo,
  type UnprovenTransaction,
  type Transaction, type AlignedValue, sampleCoinPublicKey
} from '@midnight-ntwrk/ledger';
import type { ContractProviders } from '../contract-providers';
import { type CallOptions, type PartitionedTranscript } from '../call';

export const createMockContractAddress = (): ContractAddress =>
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4' as ContractAddress;

export const createMockSigningKey = (): SigningKey => sampleSigningKey();

export const createMockPrivateStateId = (): PrivateStateId => 'test-private-state-id' as PrivateStateId;

export const createMockContractState = (signingKey?: SigningKey): ContractState => ({
  serialize: vi.fn().mockReturnValue(new Uint8Array(32)),
  data: new Map(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  operation: vi.fn().mockImplementation((_circuitId: string) => ({
    verifierKey: new Uint8Array(32)
  })),
  setOperation: vi.fn(),
  maintenanceAuthority: {
    threshold: 1,
    committee: [signingKey || createMockSigningKey()],
    counter: 1n
  }
} as unknown as ContractState);

export const createMockZswapLocalState = (): ZswapLocalState => ({
  currentIndex: 0n,
  coinPublicKey: sampleCoinPublicKey(),
  outputs: [],
  inputs: []
} as ZswapLocalState);

export const createMockContract = (): Contract => ({
  initialState: vi.fn().mockReturnValue({
    currentContractState: createMockContractState()
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
  coin: {} as any,
  privateKey: new Uint8Array(32)
} as unknown as CoinInfo);

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
    coinPublicKey: sampleCoinPublicKey(),
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
  coinPublicKey: sampleCoinPublicKey(),
  initialContractState: createMockContractState(),
  initialZswapChainState: { test: 'zswap-chain-state' },
  ...overrides
});

export const createMockCallOptionsWithPrivateState = (overrides: any = {}): CallOptions<any, any> => ({
  ...createMockCallOptions(),
  initialPrivateState: { test: 'private-state' },
  ...overrides
});

export const createMockConstructorResult = () => ({
  nextContractState: createMockContractState(),
  nextPrivateState: { test: 'next-private-state' },
  nextZswapLocalState: createMockZswapLocalState()
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

export const createMockFoundContract = () => ({
  deployTxData: {
    private: {
      signingKey: createMockSigningKey(),
      initialPrivateState: undefined
    },
    public: {
      ...createMockFinalizedDeployTxData(),
      contractAddress: createMockContractAddress(),
      initialContractState: createMockContractState()
    }
  },
  callTx: vi.fn(),
  circuitMaintenanceTx: vi.fn(),
  contractMaintenanceTx: vi.fn()
});
