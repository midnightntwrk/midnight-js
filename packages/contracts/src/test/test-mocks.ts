/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import {
  assert as compactAssert,
  ChargedState,
  CompactError,
  type ContractState,
  emptyZswapLocalState,  type Op,
  sampleSigningKey,
  type SigningKey,
  StateValue,
  type ZswapLocalState} from '@midnight-ntwrk/compact-runtime';
import {
  type AlignedValue,
  type Binding,
  type Bindingish,
  type CoinPublicKey,
  type CoinSecretKey,
  type DustSecretKey,
  type EncPublicKey,
  type EncryptionSecretKey,
  type PartitionedTranscript,
  type Proof,
  type Proofish,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleDustSecretKey,
  sampleEncryptionPublicKey,
  type ShieldedCoinInfo,
  type SignatureEnabled,
  type Signaturish,
  type TokenType,
  type UnprovenTransaction,
  type ZswapChainState,
  type ZswapSecretKeys,
} from '@midnight-ntwrk/ledger-v7';
import {
  type FinalizedTxData,
  type PrivateStateId,
  type ProverKey,
  SucceedEntirely,
  type Transaction,
  type TxStatus,
  type VerifierKey,
  ZKConfigProvider,
  type ZKIR
} from '@midnight-ntwrk/midnight-js-types';

import { type CallOptions, type CallOptionsWithPrivateState } from '../call';
import { type ContractConstructorResult } from '../call-constructor';
import type { ContractProviders } from '../contract-providers';
import { type UnsubmittedCallTxData, type UnsubmittedDeployTxData } from '../tx-model';

export const createMockContractAddress = () => sampleContractAddress();

export const createMockSigningKey = () => sampleSigningKey();

export const createMockCoinPublicKey = () => sampleCoinPublicKey();

export const createMockPrivateStateId = (): PrivateStateId => 'test-private-state-id' as PrivateStateId;

export const createMockEncryptionPublicKey = (): EncPublicKey => sampleEncryptionPublicKey();

export const createMockDustSecretKey = (): DustSecretKey => sampleDustSecretKey();

export const createMockZswapSecretKeys = (): ZswapSecretKeys => {
  return {
    coinPublicKey: createMockCoinPublicKey() as CoinPublicKey,
    coinSecretKey: {} as CoinSecretKey,
    encryptionPublicKey: createMockEncryptionPublicKey() as EncPublicKey,
    encryptionSecretKey: {} as EncryptionSecretKey,
    clear: vi.fn()
  };
};

export const createMockContractState = (signingKey?: SigningKey): ContractState => ({
  serialize: vi.fn().mockReturnValue(new Uint8Array(32)),
  data: new ChargedState(StateValue.newNull()),
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

export const createDefaultCircuit = () => vi.fn().mockImplementation((ctx) => ({
  result: { test: 'result ' },
  context: {
    ...ctx,
    currentPrivateState: { test: 'next-private-state' }
  },
  proofData: {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  }
}));

export const createFailingCircuit = (failMessage: string) => vi.fn().mockImplementation((() => {
  compactAssert(false, failMessage);
}));

type MockCircuit = ReturnType<typeof createDefaultCircuit>;

type MockContractClassOptions = {
  testCircuit: MockCircuit;
  constructorErrorMessage?: string;
  initialStateErrorMessage?: string;
}

const defaultMockContractClassOptions: MockContractClassOptions = {
  testCircuit: createDefaultCircuit()
};

const createMockContractClass = (options?: Partial<MockContractClassOptions>) => {
  const finalOptions = { ...defaultMockContractClassOptions, ...options } as MockContractClassOptions;
  return class {
    constructor(witnesses: Contract.Witnesses<any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (finalOptions.constructorErrorMessage) {
        throw new CompactError(finalOptions.constructorErrorMessage);
      }
      this.witnesses = witnesses;
      this.initialState = vi.fn().mockImplementation((ctx) => {
        if (finalOptions.initialStateErrorMessage) {
          throw new CompactError(finalOptions.initialStateErrorMessage);
        }
        return {
          currentContractState: createMockContractState(),
          currentPrivateState: { test: 'mock-private-state' },
          currentZswapLocalState: emptyZswapLocalState(ctx.initialZswapLocalState.coinPublicKey)
        };
      });
      this.circuits = {
        testCircuit: finalOptions.testCircuit
      };
      this.impureCircuits = this.circuits;
    }
    initialState;
    circuits;
    impureCircuits;
    witnesses;
  }
}

export const createMockContract = (options?: Partial<MockContractClassOptions>): Contract<undefined> =>
  new (createMockContractClass(options))({});

export const createMockCompiledContract = (options?: Partial<MockContractClassOptions>): CompiledContract.CompiledContract<any, unknown, never> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  return CompiledContract.make('test', createMockContractClass(options)).pipe(
    CompiledContract.withVacantWitnesses
  ) as unknown as CompiledContract.CompiledContract<any, unknown, never>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const createMockUnprovenTx = (): UnprovenTransaction => ({
  addCalls: vi.fn(),
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
  cost: vi.fn(),
  feesWithMargin: vi.fn()
});

export const createMockProvenTx = (): Transaction<Signaturish, Proofish, Bindingish> => ({
  addCalls: vi.fn(),
  eraseProofs: vi.fn(),
  identifiers: vi.fn().mockReturnValue(['test-tx-id']),
  merge: vi.fn(),
  serialize: vi.fn(),
  imbalances: vi.fn(),
  bind: vi.fn().mockReturnValue(new Uint8Array(0)),
  wellFormed: vi.fn(),
  transactionHash: vi.fn(),
  fees: vi.fn(),
  intents: undefined,
  fallibleOffer: undefined,
  guaranteedOffer: undefined,
  bindingRandomness: 0n,
  rewards: undefined,
  eraseSignatures: vi.fn(),
  cost: vi.fn(),
  feesWithMargin: vi.fn(),
  mockProve: vi.fn(),
  prove: vi.fn()
});

export const createMockCoinInfo = (): ShieldedCoinInfo => ({
  type: 'shielded',
  nonce: 'nonce',
  value: 0n
});

export const createMockProviders = (): ContractProviders<Contract.Any, Contract.ImpureCircuitId<Contract.Any>, Contract.PrivateState<Contract.Any>> => ({
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
    setContractAddress: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    getSigningKey: vi.fn(),
    setSigningKey: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    clearSigningKeys: vi.fn(),
    removeSigningKey: vi.fn(),
    exportPrivateStates: vi.fn(),
    importPrivateStates: vi.fn(),
    exportSigningKeys: vi.fn(),
    importSigningKeys: vi.fn()
  },
  zkConfigProvider: {
    getVerifierKeys: vi.fn(),
    getZKIR: vi.fn(),
    getProverKey: vi.fn(),
    getVerifierKey: vi.fn(),
    get: vi.fn(),
    asKeyMaterialProvider: vi.fn()
},
  walletProvider: {
    balanceTx: vi.fn(),
    getCoinPublicKey: createMockCoinPublicKey,
    getEncryptionPublicKey: createMockEncryptionPublicKey
  },
  proofProvider: {
    proveTx: vi.fn()
  }
});

export const createMockFinalizedTxData = (status: TxStatus = SucceedEntirely): FinalizedTxData => ({
  status: status,
  txId: 'test-tx-id',
  identifiers: ['test-tx-id-0', 'test-tx-id'],
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

export const createMockUnprovenDeployTxData = (overrides: Partial<UnsubmittedDeployTxData<Contract.Any>> = {}): UnsubmittedDeployTxData<Contract.Any> => ({
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

export const createMockUnprovenCallTxData = (overrides: Partial<UnsubmittedCallTxData<Contract.Any, Contract.ImpureCircuitId<Contract.Any>>> = {}): UnsubmittedCallTxData<Contract.Any, Contract.ImpureCircuitId<Contract.Any>> => ({
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

export const createMockCallOptions = (overrides: Partial<CallOptions<Contract.Any, Contract.ImpureCircuitId<Contract.Any>>> = {}): CallOptions<Contract.Any, Contract.ImpureCircuitId<Contract.Any>> => ({
  compiledContract: createMockCompiledContract(),
  circuitId: 'testCircuit',
  args: [] as never[],
  contractAddress: createMockContractAddress(),
  coinPublicKey: createMockCoinPublicKey(),
  initialContractState: createMockContractState(),
  initialZswapChainState: {} as ZswapChainState,
  ...overrides
});

export const createMockCallOptionsWithPrivateState = (overrides: Partial<CallOptionsWithPrivateState<Contract.Any, Contract.ImpureCircuitId<Contract.Any>>> = {}): CallOptionsWithPrivateState<Contract.Any, Contract.ImpureCircuitId<Contract.Any>> => ({
  ...createMockCallOptions(),
  initialPrivateState: { test: 'private-state' },
  ...overrides
});

export const createMockConstructorResult = (): ContractConstructorResult<Contract.Any> => ({
  nextContractState: createMockContractState(),
  nextPrivateState: { test: 'next-private-state' },
  nextZswapLocalState: createMockZswapLocalState(),
});

export const createMockVerifierKeys = (): [string, VerifierKey][] => [
  ['testCircuit', new Uint8Array(32) as VerifierKey]
];

export const createMockZKConfigProvider = (): ZKConfigProvider<string> => {
  const verifierKeys = createMockVerifierKeys();
  return new (class extends ZKConfigProvider<string> {
    getZKIR(_: string): Promise<ZKIR> {
      throw new Error('Method not implemented.');
    }
    getProverKey(_: string): Promise<ProverKey> {
      throw new Error('Method not implemented.');
    }
    getVerifierKey(_: string): Promise<VerifierKey> {
      return Promise.resolve(verifierKeys[0][1]);
    }
  })();
}
