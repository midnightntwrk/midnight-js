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

import type { ZswapChainState } from '@midnight-ntwrk/ledger';
import type { PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPublicStates, getStates } from '../get-states';
import {
  createMockContractAddress,
  createMockContractState,
  createMockPrivateStateId,
  createMockProviders,
} from './test-mocks';

describe('get-states', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let mockContractAddress: ReturnType<typeof createMockContractAddress>;
  let mockContractState: ReturnType<typeof createMockContractState>;
  let mockZswapChainState: ZswapChainState;
  let mockPrivateStateId: PrivateStateId;
  let mockPrivateState: { test: string };

  beforeEach(() => {
    vi.clearAllMocks();

    mockProviders = createMockProviders();
    mockContractAddress = createMockContractAddress();
    mockContractState = createMockContractState();
    mockZswapChainState = {} as ZswapChainState;
    mockPrivateStateId = createMockPrivateStateId();
    mockPrivateState = { test: 'mock-private-state' };
  });

  describe('getPublicStates', () => {
    describe('happy path', () => {
      it('should successfully retrieve public states', async () => {
        mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn()
          .mockResolvedValue([mockZswapChainState, mockContractState]);

        const result = await getPublicStates(mockProviders.publicDataProvider, mockContractAddress);

        expect(mockProviders.publicDataProvider.queryZSwapAndContractState)
          .toHaveBeenCalledWith(mockContractAddress);
        expect(result).toEqual({
          zswapChainState: mockZswapChainState,
          contractState: mockContractState
        });
      });
    });
  });

  describe('getStates', () => {
    describe('happy path', () => {
      it('should successfully retrieve all states', async () => {
        mockProviders.publicDataProvider.queryZSwapAndContractState = vi.fn()
          .mockResolvedValue([mockZswapChainState, mockContractState]);
        mockProviders.privateStateProvider.get = vi.fn().mockResolvedValue(mockPrivateState);

        const result = await getStates(
          mockProviders.publicDataProvider,
          mockProviders.privateStateProvider,
          mockContractAddress,
          mockPrivateStateId
        );

        expect(mockProviders.publicDataProvider.queryZSwapAndContractState)
          .toHaveBeenCalledWith(mockContractAddress);
        expect(mockProviders.privateStateProvider.get).toHaveBeenCalledWith(mockPrivateStateId);
        expect(result).toEqual({
          zswapChainState: mockZswapChainState,
          contractState: mockContractState,
          privateState: mockPrivateState
        });
      });
    });
  });
});
