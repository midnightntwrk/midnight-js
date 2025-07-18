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

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { call } from '../call';
import { createMockCallOptions, createMockCallOptionsWithPrivateState } from './test-mocks';
import { emptyZswapLocalState, StateValue } from '@midnight-ntwrk/compact-runtime';
import { sampleCoinPublicKey } from '@midnight-ntwrk/ledger';
import { parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

describe('call', () => {
  let mockCircuit: Mock<(...args: any[]) => any>;

  beforeEach(() => {
    mockCircuit?.mockClear();

    mockCircuit = vi.fn().mockReturnValue({
      result: 'test-result',
      context: {
        transactionContext: {
          state: StateValue.newNull(),
          data: new Map(),
          comIndicies: new Set()
        },
        currentPrivateState: { test: 'private-state' },
        currentZswapLocalState: emptyZswapLocalState(
          parseCoinPublicKeyToHex(sampleCoinPublicKey(), getZswapNetworkId())
        )
      },
      proofData: {
        input: { test: 'input' },
        output: { test: 'output' },
        privateTranscriptOutputs: [{ test: 'transcript' }],
        publicTranscript: [{ noop: { n: 1 } }]
      }
    });
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
