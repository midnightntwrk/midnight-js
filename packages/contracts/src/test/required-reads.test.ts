/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
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

import { describe, expect, it, vi } from 'vitest';

import {
  getExistingSigningKey,
  queryExistingContractState,
  requireDeployedContract
} from '../internal/required-reads';
import { createMockContractAddress, createMockContractState, createMockSigningKey } from './test-mocks';

describe('requireDeployedContract', () => {
  const contractAddress = createMockContractAddress();

  it('returns the state when the contract is deployed', () => {
    const state = createMockContractState();

    const result = requireDeployedContract(state, contractAddress);

    expect(result).toBe(state);
  });

  it.each([null, undefined])('refuses a %s state as ContractNotFoundError', (state) => {
    expect(() => requireDeployedContract(state, contractAddress)).toThrow(
      expect.objectContaining({
        name: 'ContractNotFoundError',
        message: `No contract deployed at contract address '${contractAddress}'`
      })
    );
  });
});

describe('queryExistingContractState', () => {
  const contractAddress = createMockContractAddress();

  it('returns the on-chain state of the queried address', async () => {
    const state = createMockContractState();
    const queryContractState = vi.fn().mockResolvedValue(state);

    const result = await queryExistingContractState({ queryContractState }, contractAddress);

    expect(result).toBe(state);
    expect(queryContractState).toHaveBeenCalledWith(contractAddress);
  });

  it('refuses an address with no state as ContractNotFoundError', async () => {
    const queryContractState = vi.fn().mockResolvedValue(null);

    await expect(queryExistingContractState({ queryContractState }, contractAddress)).rejects.toMatchObject({
      name: 'ContractNotFoundError',
      message: `No contract state found on chain for contract address '${contractAddress}'`
    });
  });
});

describe('getExistingSigningKey', () => {
  const contractAddress = createMockContractAddress();

  it('returns the signing key stored for the address', async () => {
    const signingKey = createMockSigningKey();
    const getSigningKey = vi.fn().mockResolvedValue(signingKey);

    const result = await getExistingSigningKey({ getSigningKey }, contractAddress);

    expect(result).toBe(signingKey);
    expect(getSigningKey).toHaveBeenCalledWith(contractAddress);
  });

  it('refuses an address with no stored key as InvalidArgumentError', async () => {
    const getSigningKey = vi.fn().mockResolvedValue(null);

    await expect(getExistingSigningKey({ getSigningKey }, contractAddress)).rejects.toMatchObject({
      name: 'InvalidArgumentError',
      message: `Signing key for contract address '${contractAddress}' not found`
    });
  });
});
