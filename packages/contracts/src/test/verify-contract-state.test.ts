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

import { readFileSync } from 'node:fs';

import { ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { ContractOperation, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { createVerifierKey, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { ContractTypeError } from '../errors';
import { verifyContractState } from '../find-deployed-contract';

const CIRCUIT_ID = ProvableCircuitId('deposit');
const OTHER_CIRCUIT_ID = ProvableCircuitId('withdraw');

/**
 * A real, serialized verifier key, read from the committed compiled fixture. The
 * `ContractOperation.verifierKey` setter rejects untagged bytes, so a deployed key cannot be an
 * arbitrary `Uint8Array`.
 */
const DEPLOYED_KEY = new Uint8Array(
  readFileSync(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
);

const keylessOperation = (): ContractOperation => new ContractOperation();

const keyedOperation = (key: Uint8Array = DEPLOYED_KEY): ContractOperation => {
  const operation = new ContractOperation();
  operation.verifierKey = key;
  return operation;
};

const stateWith = (operations: [string, ContractOperation][]): ContractState => {
  const state = new ContractState();
  operations.forEach(([circuitId, operation]) => state.setOperation(circuitId, operation));
  return state;
};

const localKeys = (...entries: [string, Uint8Array][]): [ProvableCircuitId, VerifierKey][] =>
  entries.map(([circuitId, bytes]) => [ProvableCircuitId(circuitId), createVerifierKey(bytes)]);

const expectThrows = <E extends Error>(fn: () => unknown, ctor: new (...args: never[]) => E): E => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ctor) {
      return error;
    }
    throw error;
  }
  throw new Error(`expected ${ctor.name} to be thrown, but nothing was thrown`);
};

describe('verifyContractState', () => {
  describe('states it accepts', () => {
    it('should accept a state whose deployed key equals the local key', () => {
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      expect(() => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state)).not.toThrow();
    });

    it('should accept any state when the client holds no verifier keys', () => {
      expect(() => verifyContractState([], new ContractState())).not.toThrow();
    });
  });

  describe('states it rejects', () => {
    it('should reject a state whose deployed key differs from the local key', () => {
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, new Uint8Array([1, 2, 3])]), state),
        ContractTypeError
      );

      expect(error.mismatchedCircuitIds).toEqual([CIRCUIT_ID]);
    });

    // The local and deployed keys have equal length here, so `verifierKeysEqual`'s length
    // short-circuit cannot decide the comparison and the byte-wise check has to run.
    it('should reject a deployed key of the same length carrying different bytes', () => {
      const tampered = new Uint8Array(DEPLOYED_KEY);
      tampered[tampered.length - 1] ^= 0xff;
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, tampered]), state),
        ContractTypeError
      );

      expect(error.mismatchedCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject a state that registers no operation for the circuit', () => {
      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), new ContractState()),
        ContractTypeError
      );

      expect(error.missingCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject a state whose operation resolves but carries no verifier key', () => {
      const state = stateWith([[CIRCUIT_ID, keylessOperation()]]);
      expect(state.operation(CIRCUIT_ID)).toBeDefined();
      expect(state.operation(CIRCUIT_ID)?.verifierKey).toBeUndefined();

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.keylessCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject an operation left keyless by a serialize/deserialize round trip', () => {
      const roundTripped = ContractState.deserialize(stateWith([[CIRCUIT_ID, keylessOperation()]]).serialize());
      expect(roundTripped.operation(CIRCUIT_ID)).toBeDefined();
      expect(roundTripped.operation(CIRCUIT_ID)?.verifierKey).toBeUndefined();

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), roundTripped),
        ContractTypeError
      );

      expect(error.keylessCircuitIds).toEqual([CIRCUIT_ID]);
    });
  });

  describe('which circuits it reports', () => {
    it('should report only the circuits that fail, leaving matching ones out', () => {
      const state = stateWith([
        [CIRCUIT_ID, keyedOperation()],
        [OTHER_CIRCUIT_ID, keylessOperation()]
      ]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY], [OTHER_CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.circuitIds).toEqual([OTHER_CIRCUIT_ID]);
      expect(error.keylessCircuitIds).toEqual([OTHER_CIRCUIT_ID]);
      expect(error.mismatchedCircuitIds).toEqual([]);
    });

    it('should report every failing circuit in the order the local keys were given', () => {
      const state = stateWith([
        [CIRCUIT_ID, keylessOperation()],
        [OTHER_CIRCUIT_ID, keylessOperation()]
      ]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY], [OTHER_CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.circuitIds).toEqual([CIRCUIT_ID, OTHER_CIRCUIT_ID]);
    });

    it('should sort each failing circuit into the condition that actually applies', () => {
      const absent = ProvableCircuitId('transfer');
      const state = stateWith([
        [CIRCUIT_ID, keylessOperation()],
        [OTHER_CIRCUIT_ID, keyedOperation()]
      ]);

      const error = expectThrows(
        () =>
          verifyContractState(
            localKeys(
              [CIRCUIT_ID, DEPLOYED_KEY],
              [OTHER_CIRCUIT_ID, new Uint8Array([1, 2, 3])],
              [absent, DEPLOYED_KEY]
            ),
            state
          ),
        ContractTypeError
      );

      expect(error.keylessCircuitIds).toEqual([CIRCUIT_ID]);
      expect(error.mismatchedCircuitIds).toEqual([OTHER_CIRCUIT_ID]);
      expect(error.missingCircuitIds).toEqual([absent]);
    });
  });

  describe('the message it produces', () => {
    const keylessError = (): ContractTypeError =>
      expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), stateWith([[CIRCUIT_ID, keylessOperation()]])),
        ContractTypeError
      );

    const mismatchError = (): ContractTypeError =>
      expectThrows(
        () =>
          verifyContractState(
            localKeys([CIRCUIT_ID, new Uint8Array([1, 2, 3])]),
            stateWith([[CIRCUIT_ID, keyedOperation()]])
          ),
        ContractTypeError
      );

    // The deployed state renders a keyless operation exactly like a keyed one, so a message built
    // only from the state dump reads identically for both conditions and sends the user after the
    // wrong remediation.
    it('should describe a keyless slot differently from a key mismatch', () => {
      expect(keylessError().message).not.toEqual(mismatchError().message);
    });

    it('should tell the user that recompiling cannot fix a keyless slot', () => {
      const message = keylessError().message;

      expect(message).toContain(CIRCUIT_ID);
      expect(message).toContain('no verifier key');
      expect(message).not.toContain('differs from the local one');
    });

    it('should name a key mismatch as a differing key', () => {
      const message = mismatchError().message;

      expect(message).toContain(CIRCUIT_ID);
      expect(message).toContain('differs from the local one');
      expect(message).not.toContain('no verifier key');
    });

    it('should include the contract address when one is given', () => {
      const error = expectThrows(
        () =>
          verifyContractState(
            localKeys([CIRCUIT_ID, DEPLOYED_KEY]),
            stateWith([[CIRCUIT_ID, keylessOperation()]]),
            '0200deadbeef'
          ),
        ContractTypeError
      );

      expect(error.message).toContain('0200deadbeef');
    });

    it('should keep the message bounded when the deployed state is large', () => {
      const operations: [string, ContractOperation][] = Array.from({ length: 200 }, (_, index) => [
        `circuit_${index}`,
        keyedOperation()
      ]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), stateWith(operations)),
        ContractTypeError
      );

      expect(error.message.length).toBeLessThan(4_000);
      expect(error.message).toContain(CIRCUIT_ID);
    });

    it('should still carry the full state on the error when the message is truncated', () => {
      const state = stateWith([[CIRCUIT_ID, keylessOperation()]]);

      const error = expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.contractState).toBe(state);
    });
  });
});
