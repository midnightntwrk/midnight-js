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

import { WitnessInterceptor } from '../../src/adapter/WitnessInterceptor.js';
import { WitnessExecutionError } from '../../src/errors/WitnessError.js';
import type { Logger } from '../../src/types/contract-types.js';
import type { WitnessContext,Witnesses } from '../../src/types/witness-types.js';

describe('WitnessInterceptor', () => {
  type CounterPrivateState = {
    privateCounter: number;
  };

  let witnesses: Witnesses<any, CounterPrivateState>;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    witnesses = {
      privateIncrement: ({ privateState }) => [
        { privateCounter: privateState.privateCounter + 1 },
        []
      ]
    };
  });

  describe('witness execution monitoring', () => {
    it('should intercept witness calls', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);
      const handler = vi.fn();

      interceptor.onWitnessCall(handler);

      const intercepted = interceptor.createInterceptedWitnesses();
      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      intercepted.privateIncrement(context);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          witnessName: 'privateIncrement',
          context,
          result: expect.any(Array)
        })
      );
    });

    it('should call witness and return correct result', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);
      const intercepted = interceptor.createInterceptedWitnesses();

      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 5 }
      };

      const [newState, outputs] = intercepted.privateIncrement(context);

      expect(newState.privateCounter).toBe(6);
      expect(outputs).toEqual([]);
    });

    it('should log witness execution', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);
      const intercepted = interceptor.createInterceptedWitnesses();

      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      intercepted.privateIncrement(context);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Executing witness: privateIncrement',
        { context }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Witness privateIncrement completed successfully',
        expect.objectContaining({ result: expect.any(Array) })
      );
    });

    it('should handle multiple handlers', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      interceptor.onWitnessCall(handler1);
      interceptor.onWitnessCall(handler2);

      const intercepted = interceptor.createInterceptedWitnesses();
      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      intercepted.privateIncrement(context);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('witness error handling', () => {
    it('should throw WitnessExecutionError when witness fails', () => {
      const failingWitnesses: Witnesses<any, CounterPrivateState> = {
        failingWitness: () => {
          throw new Error('Witness failed');
        }
      };

      const interceptor = new WitnessInterceptor(failingWitnesses, mockLogger);
      const intercepted = interceptor.createInterceptedWitnesses();

      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      expect(() => intercepted.failingWitness(context)).toThrow(WitnessExecutionError);
      expect(() => intercepted.failingWitness(context)).toThrow(/Witness 'failingWitness' execution failed/);
    });

    it('should include witness name and context in error', () => {
      const failingWitnesses: Witnesses<any, CounterPrivateState> = {
        failingWitness: () => {
          throw new Error('Test error');
        }
      };

      const interceptor = new WitnessInterceptor(failingWitnesses, mockLogger);
      const intercepted = interceptor.createInterceptedWitnesses();

      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      try {
        intercepted.failingWitness(context);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(WitnessExecutionError);
        expect(error.witnessName).toBe('failingWitness');
        expect(error.context).toEqual(context);
      }
    });

    it('should log witness errors', () => {
      const failingWitnesses: Witnesses<any, CounterPrivateState> = {
        failingWitness: () => {
          throw new Error('Test error');
        }
      };

      const interceptor = new WitnessInterceptor(failingWitnesses, mockLogger);
      const intercepted = interceptor.createInterceptedWitnesses();

      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      try {
        intercepted.failingWitness(context);
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Witness failingWitness failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle errors in event handlers gracefully', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);
      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });

      interceptor.onWitnessCall(failingHandler);

      const intercepted = interceptor.createInterceptedWitnesses();
      const context: WitnessContext<any, CounterPrivateState> = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 0 }
      };

      expect(() => intercepted.privateIncrement(context)).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in witnessCall handler',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('getWitnesses', () => {
    it('should return original witnesses', () => {
      const interceptor = new WitnessInterceptor(witnesses, mockLogger);

      expect(interceptor.getWitnesses()).toEqual(witnesses);
    });
  });
});
