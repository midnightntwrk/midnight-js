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

import { InvalidArgumentError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { ContractOperation, ContractState } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime';
import { createVerifierKey, SerializedContractState, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';

import { ContractTypeError } from '../errors';
import { verifyContractState } from '../find-deployed-contract';
import { hfFixturePath, readHfHexFixture } from './ledger8-replay';

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

const decodedStateWith = (operations: [string, ContractOperation][]): ContractState => {
  const state = new ContractState();
  operations.forEach(([circuitId, operation]) => state.setOperation(circuitId, operation));
  return state;
};

const serialized = (state: ContractState): SerializedContractState<'v9'> => SerializedContractState.fromBytes('v9', state.serialize());

const stateWith = (operations: [string, ContractOperation][]): SerializedContractState<'v9'> =>
  serialized(decodedStateWith(operations));

const localKeys = (...entries: [string, Uint8Array][]): [ProvableCircuitId, VerifierKey][] =>
  entries.map(([circuitId, bytes]) => [ProvableCircuitId(circuitId), createVerifierKey(bytes)]);

const expectThrows = async <E extends Error>(fn: () => Promise<unknown>, ctor: new (...args: never[]) => E): Promise<E> => {
  try {
    await fn();
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
    it('should accept a state whose deployed key equals the local key', async () => {
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      await expect(verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state)).resolves.toBeUndefined();
    });

    it('should accept any state when the client holds no verifier keys', async () => {
      await expect(verifyContractState([], serialized(new ContractState()))).resolves.toBeUndefined();
    });
  });

  describe('states it rejects', () => {
    it('should reject a state whose deployed key differs from the local key', async () => {
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, new Uint8Array([1, 2, 3])]), state),
        ContractTypeError
      );

      expect(error.mismatchedCircuitIds).toEqual([CIRCUIT_ID]);
    });

    // The local and deployed keys have equal length here, so `verifierKeysEqual`'s length
    // short-circuit cannot decide the comparison and the byte-wise check has to run.
    it('should reject a deployed key of the same length carrying different bytes', async () => {
      const tampered = new Uint8Array(DEPLOYED_KEY);
      tampered[tampered.length - 1] ^= 0xff;
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, tampered]), state),
        ContractTypeError
      );

      expect(error.mismatchedCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject a state that registers no operation for the circuit', async () => {
      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), serialized(new ContractState())),
        ContractTypeError
      );

      expect(error.missingCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject a state whose operation resolves but carries no verifier key', async () => {
      const decoded = decodedStateWith([[CIRCUIT_ID, keylessOperation()]]);
      expect(decoded.operation(CIRCUIT_ID)).toBeDefined();
      expect(decoded.operation(CIRCUIT_ID)?.verifierKey).toBeUndefined();
      const state = serialized(decoded);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.keylessCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should reject an operation left keyless by a serialize/deserialize round trip', async () => {
      const roundTripped = ContractState.deserialize(decodedStateWith([[CIRCUIT_ID, keylessOperation()]]).serialize());
      expect(roundTripped.operation(CIRCUIT_ID)).toBeDefined();
      expect(roundTripped.operation(CIRCUIT_ID)?.verifierKey).toBeUndefined();

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), serialized(roundTripped)),
        ContractTypeError
      );

      expect(error.keylessCircuitIds).toEqual([CIRCUIT_ID]);
    });
  });

  describe('which circuits it reports', () => {
    it('should report only the circuits that fail, leaving matching ones out', async () => {
      const state = stateWith([
        [CIRCUIT_ID, keyedOperation()],
        [OTHER_CIRCUIT_ID, keylessOperation()]
      ]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY], [OTHER_CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.circuitIds).toEqual([OTHER_CIRCUIT_ID]);
      expect(error.keylessCircuitIds).toEqual([OTHER_CIRCUIT_ID]);
      expect(error.mismatchedCircuitIds).toEqual([]);
    });

    it('should report every failing circuit in the order the local keys were given', async () => {
      const state = stateWith([
        [CIRCUIT_ID, keylessOperation()],
        [OTHER_CIRCUIT_ID, keylessOperation()]
      ]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY], [OTHER_CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.circuitIds).toEqual([CIRCUIT_ID, OTHER_CIRCUIT_ID]);
    });

    it('should sort each failing circuit into the condition that actually applies', async () => {
      const absent = ProvableCircuitId('transfer');
      const state = stateWith([
        [CIRCUIT_ID, keylessOperation()],
        [OTHER_CIRCUIT_ID, keyedOperation()]
      ]);

      const error = await expectThrows(
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
    const keylessError = (): Promise<ContractTypeError> =>
      expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), stateWith([[CIRCUIT_ID, keylessOperation()]])),
        ContractTypeError
      );

    const mismatchError = (): Promise<ContractTypeError> =>
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
    it('should describe a keyless slot differently from a key mismatch', async () => {
      expect((await keylessError()).message).not.toEqual((await mismatchError()).message);
    });

    it('should tell the user that recompiling cannot fix a keyless slot', async () => {
      const message = (await keylessError()).message;

      expect(message).toContain(CIRCUIT_ID);
      expect(message).toContain('no verifier key');
      expect(message).not.toContain('differs from the local one');
    });

    it('should name a key mismatch as a differing key', async () => {
      const message = (await mismatchError()).message;

      expect(message).toContain(CIRCUIT_ID);
      expect(message).toContain('differs from the local one');
      expect(message).not.toContain('no verifier key');
    });

    it('should include the contract address when one is given', async () => {
      const error = await expectThrows(
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

    it('should keep the message bounded when the deployed state is large', async () => {
      const operations: [string, ContractOperation][] = Array.from({ length: 200 }, (_, index) => [
        `circuit_${index}`,
        keyedOperation()
      ]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), stateWith(operations)),
        ContractTypeError
      );

      expect(error.message.length).toBeLessThan(4_000);
      expect(error.message).toContain(CIRCUIT_ID);
    });

    it('should carry the deployed state on the error as the serialized state it was given', async () => {
      const state = stateWith([[CIRCUIT_ID, keylessOperation()]]);

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(SerializedContractState.isSerializedContractState(error.contractState)).toBe(true);
      expect(error.contractState.era).toBe('v9');
      expect(error.contractState.serialize()).toEqual(state.serialize());
    });
  });

  describe('serialized states of both eras', () => {
    // THE STAND-IN KEY -- see `./v8-native.test.ts` for the full note. The accepting tests below
    // pass ONLY because both sides use the same stand-in: `coin-receiver-016` has no verifier key of
    // its own in this repo.
    const STAND_IN_VERIFIER_KEY = new Uint8Array(
      readFileSync(hfFixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
    );
    const RECEIVE_COIN_CIRCUIT_ID = ProvableCircuitId('receive_coin');

    const ledger8State = () => SerializedContractState.fromBytes('v8', readHfHexFixture('coin-receiver-016', 'state-v6-envelope.hex'));

    it('should accept a ledger 8 state whose deployed key equals the local key', async () => {
      const state = ledger8State();

      await expect(verifyContractState(localKeys([RECEIVE_COIN_CIRCUIT_ID, STAND_IN_VERIFIER_KEY]), state)).resolves.toBeUndefined();
    });

    it('should reject a ledger 8 state whose deployed key differs, carrying the ledger 8 state', async () => {
      const state = ledger8State();

      const error = await expectThrows(
        () => verifyContractState(localKeys([RECEIVE_COIN_CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.mismatchedCircuitIds).toEqual([RECEIVE_COIN_CIRCUIT_ID]);
      expect(error.contractState.era).toBe('v8');
      expect(error.contractState.serialize()).toEqual(state.serialize());
    });

    it('should reject a ledger 8 state that registers no operation for the circuit', async () => {
      const state = ledger8State();

      const error = await expectThrows(
        () => verifyContractState(localKeys([CIRCUIT_ID, DEPLOYED_KEY]), state),
        ContractTypeError
      );

      expect(error.missingCircuitIds).toEqual([CIRCUIT_ID]);
    });

    it('should accept a ledger 9 state whose deployed key equals the local key', async () => {
      const state = SerializedContractState.fromBytes('v9', readHfHexFixture('coin-receiver-016', 'state-v9.hex'));

      await expect(verifyContractState(localKeys([RECEIVE_COIN_CIRCUIT_ID, STAND_IN_VERIFIER_KEY]), state)).resolves.toBeUndefined();
    });
  });
  describe('values it refuses before decoding', () => {
    it('should accept a state made by a second installed copy of the types package', async () => {
      const state = stateWith([[CIRCUIT_ID, keyedOperation()]]);
      const fromAnotherTypesCopy = { era: state.era, serialize: () => state.serialize() };

      await expect(
        Reflect.apply(verifyContractState, undefined, [localKeys([CIRCUIT_ID, DEPLOYED_KEY]), fromAnotherTypesCopy])
      ).resolves.toBeUndefined();
    });

    it('should refuse a decoded contract state as an invalid argument', async () => {
      const decoded = decodedStateWith([[CIRCUIT_ID, keyedOperation()]]);

      const error = await expectThrows(
        () => Reflect.apply(verifyContractState, undefined, [localKeys([CIRCUIT_ID, DEPLOYED_KEY]), decoded]),
        InvalidArgumentError
      );

      expect(error.message).toContain('SerializedContractState');
    });
  });
});
