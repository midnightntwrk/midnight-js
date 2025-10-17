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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callContractConstructor, type ContractConstructorOptionsWithPrivateState } from '../call-constructor';
import {
  createMockCoinPublicKey,
  createMockConstructorResult,
  createMockContract,
  createMockZswapLocalState
} from './test-mocks';

vi.mock('@midnight-ntwrk/compact-runtime', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal() as any;
  return {
    ...actual,
    decodeZswapLocalState: vi.fn()
  };
});

describe('callContractConstructor', () => {
  beforeEach(async () => {
    const { decodeZswapLocalState } = await import('@midnight-ntwrk/compact-runtime');
    vi.mocked(decodeZswapLocalState).mockReturnValue(createMockZswapLocalState());
  });

  it('should call contract constructor without arguments', () => {
    const contract = createMockContract();
    const constructorResult = createMockConstructorResult();

    contract.initialState = vi.fn().mockReturnValue({
      currentContractState: constructorResult.nextContractState,
      currentPrivateState: constructorResult.nextPrivateState,
      currentZswapLocalState: constructorResult.nextZswapLocalState
    });

    const options = {
      contract,
      coinPublicKey: createMockCoinPublicKey()
    } as ContractConstructorOptionsWithPrivateState<never>;

    const result = callContractConstructor(options);

    expect(result).toBeDefined();
    expect(result.nextContractState).toBe(constructorResult.nextContractState);
    expect(result.nextPrivateState).toBe(constructorResult.nextPrivateState);
    expect(result.nextZswapLocalState).toBeDefined();
    expect(contract.initialState).toHaveBeenCalledOnce();
  });

  it('should call contract constructor with arguments', () => {
    const contract = createMockContract();
    const constructorResult = createMockConstructorResult();

    contract.initialState = vi.fn().mockReturnValue({
      currentContractState: constructorResult.nextContractState,
      currentPrivateState: constructorResult.nextPrivateState,
      currentZswapLocalState: constructorResult.nextZswapLocalState
    });

    const options = {
      contract,
      coinPublicKey: createMockCoinPublicKey(),
      args: ['arg1', 'arg2']
    };

    const result = callContractConstructor(options);

    expect(result).toBeDefined();
    expect(result.nextContractState).toBe(constructorResult.nextContractState);
    expect(result.nextPrivateState).toBe(constructorResult.nextPrivateState);
    expect(contract.initialState).toHaveBeenCalledWith(
      expect.any(Object),
      'arg1',
      'arg2'
    );
  });

  it('should call contract constructor with private state', () => {
    const contract = createMockContract();
    const constructorResult = createMockConstructorResult();

    contract.initialState = vi.fn().mockReturnValue({
      currentContractState: constructorResult.nextContractState,
      currentPrivateState: constructorResult.nextPrivateState,
      currentZswapLocalState: constructorResult.nextZswapLocalState
    });

    const options = {
      contract,
      coinPublicKey: createMockCoinPublicKey(),
      initialPrivateState: { test: 'initial-private-state' }
    } as ContractConstructorOptionsWithPrivateState<never>;

    const result = callContractConstructor(options);

    expect(result).toBeDefined();
    expect(result.nextContractState).toBe(constructorResult.nextContractState);
    expect(result.nextPrivateState).toBe(constructorResult.nextPrivateState);
    expect(contract.initialState).toHaveBeenCalledOnce();
  });

  it('should call contract constructor with both arguments and private state', () => {
    const contract = createMockContract();
    const constructorResult = createMockConstructorResult();

    contract.initialState = vi.fn().mockReturnValue({
      currentContractState: constructorResult.nextContractState,
      currentPrivateState: constructorResult.nextPrivateState,
      currentZswapLocalState: constructorResult.nextZswapLocalState
    });

    const options = {
      contract,
      coinPublicKey: createMockCoinPublicKey(),
      args: ['constructor-arg'],
      initialPrivateState: { test: 'initial-private-state' }
    };

    const result = callContractConstructor(options);

    expect(result).toBeDefined();
    expect(result.nextContractState).toBe(constructorResult.nextContractState);
    expect(result.nextPrivateState).toBe(constructorResult.nextPrivateState);
    expect(contract.initialState).toHaveBeenCalledWith(
      expect.any(Object),
      'constructor-arg'
    );
  });
});
