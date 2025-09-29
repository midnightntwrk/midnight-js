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
