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

import type { ContractAddress } from '@midnight-ntwrk/ledger';
import { sampleContractAddress } from '@midnight-ntwrk/ledger';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import type { UnshieldedBalances } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { getUnshieldedBalances } from '../get-unshielded-balances';

describe('getUnshieldedBalances', () => {
  const mockContractAddress = sampleContractAddress();
  const mockUnshieldedBalances: UnshieldedBalances = [
    {
      balance: 1000n,
      tokenType: 'token-type-1'
    },
    {
      balance: 2000n,
      tokenType: 'token-type-2'
    }
  ];

  it('should return unshielded balances when data exists', async () => {
    const mockPublicDataProvider: PublicDataProvider = {
      queryUnshieldedBalances: vi.fn().mockResolvedValue(mockUnshieldedBalances)
    } as unknown as PublicDataProvider;

    const result = await getUnshieldedBalances(mockPublicDataProvider, mockContractAddress);

    expect(mockPublicDataProvider.queryUnshieldedBalances).toHaveBeenCalledWith(mockContractAddress);
    expect(result).toEqual(mockUnshieldedBalances);
  });

  it('should throw error when no unshielded balances found', async () => {
    const mockPublicDataProvider: PublicDataProvider = {
      queryUnshieldedBalances: vi.fn().mockResolvedValue(null)
    } as unknown as PublicDataProvider;

    await expect(getUnshieldedBalances(mockPublicDataProvider, mockContractAddress))
      .rejects
      .toThrow(`No unshielded balances found at contract address '${mockContractAddress}'`);

    expect(mockPublicDataProvider.queryUnshieldedBalances).toHaveBeenCalledWith(mockContractAddress);
  });

  it('should validate contract address', async () => {
    const mockPublicDataProvider: PublicDataProvider = {
      queryUnshieldedBalances: vi.fn()
    } as unknown as PublicDataProvider;

    const invalidAddress = 'invalid-address' as ContractAddress;

    await expect(getUnshieldedBalances(mockPublicDataProvider, invalidAddress))
      .rejects
      .toThrow('input string');

    expect(mockPublicDataProvider.queryUnshieldedBalances).not.toHaveBeenCalled();
  });

  it('should return empty array when balances exist but are empty', async () => {
    const mockPublicDataProvider: PublicDataProvider = {
      queryUnshieldedBalances: vi.fn().mockResolvedValue([])
    } as unknown as PublicDataProvider;

    const result = await getUnshieldedBalances(mockPublicDataProvider, mockContractAddress);

    expect(mockPublicDataProvider.queryUnshieldedBalances).toHaveBeenCalledWith(mockContractAddress);
    expect(result).toEqual([]);
  });
});
