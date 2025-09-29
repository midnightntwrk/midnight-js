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
  type CircuitContext,
  type CircuitResults,
  emptyZswapLocalState,
  StateValue
} from '@midnight-ntwrk/compact-runtime';
import {
  type AlignedValue,
  type BlockContext,
  type ContractState,
  type Effects,
  type QueryContext,
  sampleCoinPublicKey
} from '@midnight-ntwrk/ledger';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type Contract, type PrivateState } from '@midnight-ntwrk/midnight-js-types';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { call } from '../call';
import { createMockCallOptions, createMockCallOptionsWithPrivateState, createMockContractAddress } from './test-mocks';

// TODO: add test: circuit with invalid arguments
// TODO: add test: circuit with not matching arguments (e.g.: Boolean -> Field)

describe('call', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCircuit: Mock<(...args: any[]) => any>;

  beforeEach(() => {
    mockCircuit?.mockClear();

    mockCircuit = vi.fn().mockReturnValue({
      result: 'test-result',
      context: {
        transactionContext: {
          block: {} as BlockContext,
          state: StateValue.newNull(),
          effects: {} as Effects,
          comIndicies: new Map(),
          insertCommitment: vi.fn(),
          qualify: vi.fn(),
          runTranscript: vi.fn(),
          query: vi.fn(),
          intoTranscript: vi.fn(),
          address: createMockContractAddress(),
        } as QueryContext,
        originalState: {} as ContractState,
        currentPrivateState: { test: 'private-state' } as PrivateState<Contract>,
        currentZswapLocalState: emptyZswapLocalState(
          parseCoinPublicKeyToHex(sampleCoinPublicKey(), getZswapNetworkId())
        )
      } as CircuitContext<Contract>,
      proofData: {
        input: {} as AlignedValue,
        output: {} as AlignedValue,
        privateTranscriptOutputs: [{}],
        publicTranscript: [{ noop: { n: 1 } }]
      },
    } as CircuitResults<Contract, string>);
  });

  it('should call circuit without initial private state', () => {
    const options = createMockCallOptions();
    options.contract.impureCircuits[options.circuitId] = mockCircuit;

    const result = call(options);

    expect(result).toBeDefined();
    expect(result.public).toBeDefined();
    expect(result.private).toBeDefined();
    expect(result.public.nextContractState).toBeDefined();
    expect(result.public.publicTranscript).toEqual([{ noop: { n: 1 } }]);
    expect(result.private.result).toBe('test-result');
    expect(mockCircuit).toHaveBeenCalledOnce();
  });

  it('should call circuit with private state', () => {
    const options = createMockCallOptionsWithPrivateState();

    options.contract.impureCircuits[options.circuitId] = mockCircuit;

    const result = call(options);

    expect(result).toBeDefined();
    expect(result.public.publicTranscript).toEqual([{ noop: { n: 1 } }]);
    expect(result.private.result).toBe('test-result');
    expect(result.private.nextPrivateState).toEqual({ test: 'private-state' });
    expect(mockCircuit).toHaveBeenCalledOnce();
  });

  it('should call circuit with arguments', () => {
    const options = {
      ...createMockCallOptions(),
      args: ['arg1', 'arg2']
    };

    options.contract.impureCircuits[options.circuitId] = mockCircuit;

    const result = call(options);

    expect(result).toBeDefined();
    expect(result.private.result).toBe('test-result');
    expect(mockCircuit).toHaveBeenCalledWith(
      expect.objectContaining({
        originalState: options.initialContractState,
        currentPrivateState: undefined
      }),
      'arg1',
      'arg2'
    );
  });

  it('should throw error for undefined circuit', () => {
    const options = createMockCallOptions({
      circuitId: 'nonExistentCircuit'
    });

    expect(() => call(options)).toThrow("Circuit 'nonExistentCircuit' is not defined");
  });
});
