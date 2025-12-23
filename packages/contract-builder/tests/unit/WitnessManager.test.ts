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

import { beforeEach, describe, expect, it } from 'vitest';

import { WitnessManager } from '../../src/adapter/WitnessManager.js';
import { WitnessAttachmentError, WitnessValidationError } from '../../src/errors/WitnessError.js';
import type { Witnesses } from '../../src/types/witness-types.js';

describe('WitnessManager', () => {
  type CounterPrivateState = {
    privateCounter: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContractClass: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let witnesses: Witnesses<any, CounterPrivateState>;

  beforeEach(() => {
    witnesses = {
      privateIncrement: ({ privateState }) => [
        { privateCounter: privateState.privateCounter + 1 },
        []
      ]
    };

    mockContractClass = class MockContract {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(public mockWitnesses: any) {}
      name = 'MockContract';
    };
  });

  describe('validation', () => {
    it('should validate when witnesses are provided correctly', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      expect(() => manager.validate()).not.toThrow();
    });

    it('should throw error when no witnesses are provided', () => {
      const emptyWitnesses = {};
      const manager = new WitnessManager(emptyWitnesses, mockContractClass);

      expect(() => manager.validate()).toThrow(WitnessValidationError);
      expect(() => manager.validate()).toThrow('No witnesses provided');
    });

    it('should throw error when witness is not a function', () => {
      const invalidWitnesses = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        privateIncrement: 'not a function' as any
      };
      const manager = new WitnessManager(invalidWitnesses, mockContractClass);

      expect(() => manager.validate()).toThrow(WitnessValidationError);
      expect(() => manager.validate()).toThrow(/must be a function/);
    });

    it('should validate multiple witnesses', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const multipleWitnesses: Witnesses<any, CounterPrivateState> = {
        privateIncrement: ({ privateState }) => [
          { privateCounter: privateState.privateCounter + 1 },
          []
        ],
        privateDecrement: ({ privateState }) => [
          { privateCounter: privateState.privateCounter - 1 },
          []
        ]
      };

      const manager = new WitnessManager(multipleWitnesses, mockContractClass);

      expect(() => manager.validate()).not.toThrow();
    });

    it('should throw error when one of multiple witnesses is invalid', () => {
      const invalidWitnesses = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        privateIncrement: ({ privateState }: any) => [
          { privateCounter: privateState.privateCounter + 1 },
          []
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        privateDecrement: 42 as any
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new WitnessManager(invalidWitnesses as any, mockContractClass);

      expect(() => manager.validate()).toThrow(WitnessValidationError);
      expect(() => manager.validate()).toThrow('privateDecrement');
    });
  });

  describe('attachToContract', () => {
    it('should create new contract instance with witnesses', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const instance = manager.attachToContract();

      expect(instance).toBeInstanceOf(mockContractClass);
      expect(instance.mockWitnesses).toEqual(witnesses);
    });

    it('should throw WitnessAttachmentError when contract instantiation fails', () => {
      const failingContractClass = class FailingContract {
        constructor() {
          throw new Error('Contract instantiation failed');
        }
      };

      const manager = new WitnessManager(witnesses, failingContractClass);

      expect(() => manager.attachToContract()).toThrow(WitnessAttachmentError);
      expect(() => manager.attachToContract()).toThrow(/Failed to attach witnesses/);
    });
  });

  describe('witness queries', () => {
    it('should return list of witness names', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const names = manager.getWitnessNames();

      expect(names).toEqual(['privateIncrement']);
    });

    it('should check if witness exists', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      expect(manager.hasWitness('privateIncrement')).toBe(true);
      expect(manager.hasWitness('nonExistent')).toBe(false);
    });

    it('should get specific witness function', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const witness = manager.getWitness('privateIncrement');

      expect(witness).toBeDefined();
      expect(typeof witness).toBe('function');
    });

    it('should return undefined for non-existent witness', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const witness = manager.getWitness('nonExistent');

      expect(witness).toBeUndefined();
    });

    it('should return all witnesses', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const allWitnesses = manager.getWitnesses();

      expect(allWitnesses).toEqual(witnesses);
    });
  });

  describe('witness execution', () => {
    it('should execute witness function correctly', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);
      const witness = manager.getWitness('privateIncrement');

      const context = {
        contractAddress: '0xabc',
        ledger: {},
        privateState: { privateCounter: 5 }
      };

      const [newState, outputs] = witness!(context);

      expect(newState.privateCounter).toBe(6);
      expect(outputs).toEqual([]);
    });
  });
});
