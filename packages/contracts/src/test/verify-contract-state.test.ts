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

import { ProvableCircuitId } from '@midnight-ntwrk/midnight-js-protocol/compact-js/effect/Contract';
import { ContractOperation, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { createVerifierKey, type VerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import { ContractTypeError } from '../errors';
import { verifyContractState } from '../find-deployed-contract';

const CIRCUIT_ID = ProvableCircuitId('deposit');

/**
 * A real, serialized verifier key: the `ContractOperation.verifierKey` setter validates the bytes
 * against the `midnight:verifier-key[v6]:` header, so a deployed key cannot be fabricated.
 */
const DEPLOYED_KEY = new Uint8Array(
  readFileSync(new URL('./resources/compiled/shielded-map/keys/deposit.verifier', import.meta.url))
);

const stateWithKeylessOperation = (): ContractState => {
  const state = new ContractState();
  state.setOperation(CIRCUIT_ID, new ContractOperation());
  return state;
};

const stateWithDeployedKey = (): ContractState => {
  const state = new ContractState();
  const operation = new ContractOperation();
  operation.verifierKey = DEPLOYED_KEY;
  state.setOperation(CIRCUIT_ID, operation);
  return state;
};

const localKey = (bytes: Uint8Array): [typeof CIRCUIT_ID, VerifierKey][] => [[CIRCUIT_ID, createVerifierKey(bytes)]];

describe('verifyContractState', () => {
  it('accepts a state whose deployed key equals the local key', () => {
    const state = stateWithDeployedKey();

    expect(() => verifyContractState(localKey(DEPLOYED_KEY), state)).not.toThrow();
  });

  it('rejects a state whose deployed key differs from the local key', () => {
    const state = stateWithDeployedKey();

    expect(() => verifyContractState(localKey(new Uint8Array([1, 2, 3])), state)).toThrow(ContractTypeError);
  });

  it('rejects a state that registers no operation for the circuit', () => {
    const state = new ContractState();

    expect(() => verifyContractState(localKey(DEPLOYED_KEY), state)).toThrow(ContractTypeError);
  });

  // A registered operation can resolve while carrying no verifier key at all — the shape a
  // constructor-built state has before a deploy fills it in, and one that survives a
  // serialize/deserialize round trip. Reading `.verifierKey` unguarded dereferences `undefined`.
  it('rejects a state whose operation resolves but carries no verifier key', () => {
    const state = stateWithKeylessOperation();
    expect(state.operation(CIRCUIT_ID)).toBeDefined();
    expect(state.operation(CIRCUIT_ID)?.verifierKey).toBeUndefined();

    let thrown: unknown;
    try {
      verifyContractState(localKey(DEPLOYED_KEY), state);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ContractTypeError);
    expect((thrown as ContractTypeError).circuitIds).toEqual([CIRCUIT_ID]);
  });

  it('reports every circuit that fails to match, not just the first', () => {
    const other = ProvableCircuitId('withdraw');
    const state = stateWithKeylessOperation();
    state.setOperation(other, new ContractOperation());

    let thrown: unknown;
    try {
      verifyContractState(
        [
          [CIRCUIT_ID, createVerifierKey(DEPLOYED_KEY)],
          [other, createVerifierKey(DEPLOYED_KEY)]
        ],
        state
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ContractTypeError);
    expect((thrown as ContractTypeError).circuitIds.sort()).toEqual([CIRCUIT_ID, other].sort());
  });
});
