import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WitnessManager } from '../../src/adapter/WitnessManager.js';
import { WitnessValidationError, WitnessAttachmentError } from '../../src/errors/WitnessError.js';
import type { Witnesses } from '../../src/types/witness-types.js';

describe('WitnessManager', () => {
  type CounterPrivateState = {
    privateCounter: number;
  };

  let mockContractClass: any;
  let witnesses: Witnesses<any, CounterPrivateState>;

  beforeEach(() => {
    witnesses = {
      privateIncrement: ({ privateState }) => [
        { privateCounter: privateState.privateCounter + 1 },
        []
      ]
    };

    mockContractClass = class MockContract {
      constructor(public witnesses: any) {}
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
        privateIncrement: 'not a function' as any
      };
      const manager = new WitnessManager(invalidWitnesses, mockContractClass);

      expect(() => manager.validate()).toThrow(WitnessValidationError);
      expect(() => manager.validate()).toThrow(/must be a function/);
    });

    it('should validate multiple witnesses', () => {
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
        privateIncrement: ({ privateState }: any) => [
          { privateCounter: privateState.privateCounter + 1 },
          []
        ],
        privateDecrement: 42 as any
      };

      const manager = new WitnessManager(invalidWitnesses, mockContractClass);

      expect(() => manager.validate()).toThrow(WitnessValidationError);
      expect(() => manager.validate()).toThrow('privateDecrement');
    });
  });

  describe('attachToContract', () => {
    it('should create new contract instance with witnesses', () => {
      const manager = new WitnessManager(witnesses, mockContractClass);

      const instance = manager.attachToContract();

      expect(instance).toBeInstanceOf(mockContractClass);
      expect(instance.witnesses).toEqual(witnesses);
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
        ledger: {},
        privateState: { privateCounter: 5 }
      };

      const [newState, outputs] = witness!(context);

      expect(newState.privateCounter).toBe(6);
      expect(outputs).toEqual([]);
    });
  });
});
