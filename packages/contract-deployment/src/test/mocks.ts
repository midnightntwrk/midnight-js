import {
  createMockCoinInfo,
  createMockContractAddress,
  createMockContractState,
  createMockSigningKey,
  createMockUnprovenTx,
  createMockZswapLocalState
} from '@midnight-ntwrk/midnight-js-contract-mocks';
import type { ContractConstructorResult } from '@midnight-ntwrk/midnight-js-contract-sdk';
import type { Contract } from '@midnight-ntwrk/midnight-js-types';

import type { UnsubmittedDeployTxData } from '../tx-model';

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

export const createMockConstructorResult = (): ContractConstructorResult<Contract> => ({
  nextContractState: createMockContractState(),
  nextPrivateState: { test: 'next-private-state' },
  nextZswapLocalState: createMockZswapLocalState(),
});
