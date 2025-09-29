import { type Op, StateValue } from '@midnight-ntwrk/compact-runtime';
import type { AlignedValue, ZswapChainState } from '@midnight-ntwrk/ledger';
import type { PartitionedTranscript } from '@midnight-ntwrk/midnight-js-contract-core';
import { createMockCoinInfo, createMockCoinPublicKey, createMockContract,
  createMockContractAddress, createMockContractState, createMockUnprovenTx, createMockZswapLocalState } from '@midnight-ntwrk/midnight-js-contract-mocks';
import type { Contract, ImpureCircuitId } from '@midnight-ntwrk/midnight-js-types';
import { vi } from 'vitest';

import type { CallOptions, CallOptionsWithPrivateState } from '../call';
import type { ContractConstructorResult } from '../call-constructor';
import type { UnsubmittedCallTxData } from '../tx-model';

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
