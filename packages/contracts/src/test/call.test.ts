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

import { describe, it, expect, vi } from 'vitest';
import { call } from '../call';
import {
  createMockCallOptions,
  createMockCallOptionsWithPrivateState,
} from './test-mocks';
import { StateValue } from '@midnight-ntwrk/compact-runtime';

describe('call', () => {
  it('should call circuit without private state', () => {
    const options = createMockCallOptions();
    const mockCircuit = vi.fn().mockReturnValue({
      result: 'test-result',
      context: {
        transactionContext: {
          state: StateValue.newNull(),
          data: new Map(),
          comIndicies: new Set()
        },
        currentPrivateState: undefined,
        currentZswapLocalState: { test: 'zswap-state' }
      },
      proofData: {
        input: { test: 'input' },
        output: { test: 'output' },
        privateTranscriptOutputs: [],
        publicTranscript: [{ noop: { n: 1 } }]
      }
    });

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
    const mockCircuit = vi.fn().mockReturnValue({
      result: 'test-result-with-private',
      context: {
        transactionContext: {
          state: StateValue.newNull(),
          data: new Map(),
          comIndicies: new Set()
        },
        currentPrivateState: { test: 'updated-private-state' },
        currentZswapLocalState: { test: 'updated-zswap-state' }
      },
      proofData: {
        input: { test: 'input' },
        output: { test: 'output' },
        privateTranscriptOutputs: [{ test: 'transcript' }],
        publicTranscript: [{ noop: { n: 2 } }]
      }
    });

    options.contract.impureCircuits[options.circuitId] = mockCircuit;

    const result = call(options);

    expect(result).toBeDefined();
    expect(result.public.publicTranscript).toEqual([{ noop: { n: 2 } }]);
    expect(result.private.result).toBe('test-result-with-private');
    expect(result.private.nextPrivateState).toEqual({ test: 'updated-private-state' });
    expect(mockCircuit).toHaveBeenCalledOnce();
  });

  it('should call circuit with arguments', () => {
    const options = {
      ...createMockCallOptions(),
      args: ['arg1', 'arg2']
    };

    const mockCircuit = vi.fn().mockReturnValue({
      result: 'test-result-with-args',
      context: {
        transactionContext: {
          state: StateValue.newNull(),
          data: new Map(),
          comIndicies: new Set()
        },
        currentPrivateState: undefined,
        currentZswapLocalState: { test: 'zswap-state' }
      },
      proofData: {
        input: { test: 'input' },
        output: { test: 'output' },
        privateTranscriptOutputs: [],
        publicTranscript: []
      }
    });

    options.contract.impureCircuits[options.circuitId] = mockCircuit;

    const result = call(options);

    expect(result).toBeDefined();
    expect(result.private.result).toBe('test-result-with-args');
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
