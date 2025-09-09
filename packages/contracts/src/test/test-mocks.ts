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

import {
  type ContractState,
  type Op,
  sampleSigningKey,
  type SigningKey,
  StateValue,
  type ZswapLocalState
} from '@midnight-ntwrk/compact-runtime';
import {
  type AlignedValue,
  type Binding,
  type CoinPublicKey,
  type EncPublicKey,
  type Proof,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type ShieldedCoinInfo,
  type SignatureEnabled,
  type TokenType,
  type Transaction,
  type ZswapChainState
} from '@midnight-ntwrk/ledger-v6';
import {
  type Contract,
  type FinalizedTxData,
  type ImpureCircuitId,
  type PrivateState,
  type PrivateStateId,
  SucceedEntirely,
  type TxStatus,
  type UnprovenTransaction,
  type VerifierKey,
  type Witnesses
} from '@midnight-ntwrk/midnight-js-types';
import { vi } from 'vitest';

import { type CallOptions, type CallOptionsWithPrivateState, type PartitionedTranscript } from '../call';
import { type ContractConstructorResult } from '../call-constructor';
import type { ContractProviders } from '../contract-providers';
import { type UnsubmittedCallTxData, type UnsubmittedDeployTxData } from '../tx-model';

export const createMockContractAddress = () => sampleContractAddress();

export const createMockSigningKey = () => sampleSigningKey();

export const createMockCoinPublicKey = () => sampleCoinPublicKey();

export const createMockPrivateStateId = (): PrivateStateId => 'test-private-state-id' as PrivateStateId;

export const createMockEncryptionPublicKey = (): EncPublicKey => sampleEncryptionPublicKey();

export const createMockContractState = (signingKey?: SigningKey): ContractState => ({
  serialize: vi.fn().mockReturnValue(new Uint8Array(32)),
  data: StateValue.newNull(),
  operation: vi.fn().mockImplementation((_circuitId: string) => ({
    verifierKey: new Uint8Array(32)
  })),
  query: vi.fn(),
  operations: vi.fn(),
  setOperation: vi.fn(),
  maintenanceAuthority: {
    threshold: 1,
    committee: [signingKey || createMockSigningKey()],
    counter: 1n,
    serialize: function (): Uint8Array {
      throw new Error('Function not implemented.');
    }
  },
  balance: {} as Map<TokenType, bigint>
});

export const createMockZswapLocalState = (): ZswapLocalState => ({
  currentIndex: 0n,
  coinPublicKey: createMockCoinPublicKey(),
  outputs: [],
  inputs: []
});

export const createMockContract = (): Contract<undefined> => ({
  initialState: vi.fn().mockReturnValue({
    currentContractState: createMockContractState(),
    currentPrivateState: { test: 'mock-private-state' },
    currentZswapLocalState: new Uint8Array(0)
  }),
  impureCircuits: {
    testCircuit: vi.fn()
  },
  witnesses: {} as Witnesses<undefined>
});

export const createMockUnprovenTx = (): UnprovenTransaction => ({
  eraseProofs: vi.fn(),
  identifiers: vi.fn(),
  merge: vi.fn(),
  serialize: vi.fn(),
  imbalances: vi.fn(),
  bind: vi.fn(),
  wellFormed: vi.fn(),
  transactionHash: vi.fn(),
  fees: vi.fn(),
  intents: undefined,
  fallibleOffer: undefined,
  guaranteedOffer: undefined,
  bindingRandomness: 0n,
  rewards: undefined,
  mockProve: vi.fn(),
  prove: vi.fn(),
  eraseSignatures: vi.fn(),
  cost: vi.fn()
});

export const createMockCoinInfo = (): ShieldedCoinInfo => ({
  type: 'shielded',
  nonce: 'nonce',
  value: 0n
});

export const createMockProviders = (): ContractProviders<Contract, CoinPublicKey, PrivateState<Contract>> => ({
  midnightProvider: {
    submitTx: vi.fn()
  },
  publicDataProvider: {
    watchForDeployTxData: vi.fn(),
    queryDeployContractState: vi.fn(),
    queryContractState: vi.fn(),
    queryZSwapAndContractState: vi.fn(),
    queryUnshieldedBalances: vi.fn(),
    watchForContractState: vi.fn(),
    watchForTxData: vi.fn(),
    contractStateObservable: vi.fn(),
    watchForUnshieldedBalances: vi.fn(),
    unshieldedBalancesObservable: vi.fn()
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
    encryptionPublicKey: {} as EncPublicKey,
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
  tx: {} as Transaction<SignatureEnabled, Proof, Binding>,
  txHash: 'hash',
  blockHash: 'hash',
  segmentStatusMap: undefined,
  unshielded: {
    created: [],
    spent: []
  },
  blockTimestamp: 0,
  blockAuthor: null,
  indexerId: 0,
  protocolVersion: 0,
  fees: {
    paidFees: '',
    estimatedFees: ''
  }
});

export const createMockUnprovenDeployTxData = (overrides: Partial<UnsubmittedDeployTxData<Contract>> = {}): UnsubmittedDeployTxData<Contract> => ({
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
  ...overrides
});

export const createMockUnprovenCallTxData = (overrides: Partial<UnsubmittedCallTxData<Contract, ImpureCircuitId>> = {}): UnsubmittedCallTxData<Contract, ImpureCircuitId> => ({
    public: {
      nextContractState: StateValue.newNull(),
      publicTranscript: [
        { noop: { n: 1 } }
      ] as Op<AlignedValue>[],
      partitionedTranscript: {} as PartitionedTranscript,
      ...overrides.public
    },
    private: {
      unprovenTx: createMockUnprovenTx(),
      newCoins: [createMockCoinInfo()],
      nextPrivateState: { state: 'test' },
      input: {} as AlignedValue,
      output: {} as AlignedValue,
      privateTranscriptOutputs: [] as AlignedValue[],
      result: vi.fn(),
      nextZswapLocalState: createMockZswapLocalState(),
      ...overrides.private
    }
});

export const createMockCallOptions = (overrides: Partial<CallOptions<Contract, ImpureCircuitId>> = {}): CallOptions<Contract, ImpureCircuitId> => ({
  contract: createMockContract(),
  circuitId: 'testCircuit',
  args: [] as never[],
  contractAddress: createMockContractAddress(),
  coinPublicKey: createMockCoinPublicKey(),
  initialContractState: createMockContractState(),
  initialZswapChainState: {} as ZswapChainState,
  ...overrides
});

export const createMockCallOptionsWithPrivateState = (overrides: Partial<CallOptionsWithPrivateState<Contract, ImpureCircuitId>> = {}): CallOptionsWithPrivateState<Contract, ImpureCircuitId> => ({
  ...createMockCallOptions(),
  initialPrivateState: { test: 'private-state' },
  ...overrides
});

export const createMockConstructorResult = (): ContractConstructorResult<Contract> => ({
  nextContractState: createMockContractState(),
  nextPrivateState: { test: 'next-private-state' },
  nextZswapLocalState: createMockZswapLocalState(),
});

export const createMockVerifierKeys = (): [string, VerifierKey][] => [
  ['testCircuit', new Uint8Array(32) as VerifierKey]
];
