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

/**
 * Re-expressing a retained-era contract's operations for the CURRENT ledger.
 *
 * This is the step that makes keep-state composable at all. The fork does not rewrite a contract's
 * stored state, so a contract deployed before it is served carrying a retained envelope for as long
 * as it stays untouched — and the current composer cannot deserialize those bytes. What has to
 * cross the boundary is not the state but the OPERATION REGISTRY the composer looks the circuit's
 * verifier key up in.
 */

import { readFileSync } from 'node:fs';

import * as LedgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { ComposeOptionError } from '../errors';
import { reexpressOperationsForCurrentEra } from '../lib/v9/operations';
import { fixturePath } from './fixtures';

/**
 * A real RETAINED-era verifier key — the one a pre-fork contract has registered on chain and keeps
 * across the fork. Its own envelope names the retained key version, which is the fact that makes
 * this fixture the right one: the assertions below turn on the current ledger accepting it.
 */
const RETAINED_VERIFIER_KEY = Uint8Array.from(
  readFileSync(fixturePath('twin-contract', 'compiled', 'keys', 'increment.verifier'))
);

/** The envelope the CURRENT ledger writes contract states in. Retained states carry `[v6]`. */
const CURRENT_ERA_STATE_TAG = 'midnight:contract-state[v8]:';

const tagOf = (bytes: Uint8Array): string => Buffer.from(bytes.subarray(0, 64)).toString('ascii');

describe('reexpressOperationsForCurrentEra', () => {
  it('is handed a genuinely RETAINED-era verifier key, which is the premise of the rest', () => {
    // Arrange / Act / Assert: if this fixture ever stopped being a retained-era key, every
    // assertion below would still pass while testing nothing about the fork.
    expect(tagOf(RETAINED_VERIFIER_KEY)).toContain('midnight:verifier-key[v6]:');
  });

  it('emits a CURRENT-era contract state, which is the whole reason it exists', () => {
    // Arrange.
    const entryPoints = [{ circuitId: 'increment', verifierKey: RETAINED_VERIFIER_KEY, verifierKeyHash: undefined }];

    // Act.
    const serialized = reexpressOperationsForCurrentEra(entryPoints);

    // Assert: the current composer refuses anything else, so the envelope is the deliverable.
    expect(tagOf(serialized)).toContain(CURRENT_ERA_STATE_TAG);
    expect(() => LedgerV9.ContractState.deserialize(serialized)).not.toThrow();
  });

  it('carries the retained key through unchanged, so the chain and the prototype agree', () => {
    // Arrange.
    const entryPoints = [{ circuitId: 'increment', verifierKey: RETAINED_VERIFIER_KEY, verifierKeyHash: undefined }];

    // Act.
    const state = LedgerV9.ContractState.deserialize(reexpressOperationsForCurrentEra(entryPoints));

    // Assert: byte equality, not merely "a key is present". The composer hashes this value into the
    // key location a prover resolves by, so a re-encoded key would point at artifacts that do not
    // exist. That the current ledger holds it at all is the upstream half of keep-state.
    expect(state.operation('increment')?.verifierKey).toEqual(RETAINED_VERIFIER_KEY);
  });

  it('registers every entry point that has a key, not only the first', () => {
    // Arrange.
    const entryPoints = [
      { circuitId: 'increment', verifierKey: RETAINED_VERIFIER_KEY, verifierKeyHash: undefined },
      { circuitId: 'decrement', verifierKey: RETAINED_VERIFIER_KEY, verifierKeyHash: undefined }
    ];

    // Act.
    const state = LedgerV9.ContractState.deserialize(reexpressOperationsForCurrentEra(entryPoints));

    // Assert: strict set equality, so an entry point silently dropped fails here rather than as an
    // unresolvable circuit much later.
    expect([...state.operations()].map(String).sort()).toEqual(['decrement', 'increment']);
  });

  it('skips a blank slot rather than inventing a key for it', () => {
    // Arrange: a declared entry point whose key the chain does not hold. Carried as `undefined`
    // rather than as empty bytes -- see the fail-closed decoding note on ContractEntryPointPojo.
    const entryPoints = [
      { circuitId: 'increment', verifierKey: RETAINED_VERIFIER_KEY, verifierKeyHash: undefined },
      { circuitId: 'unregistered', verifierKey: undefined, verifierKeyHash: undefined }
    ];

    // Act.
    const state = LedgerV9.ContractState.deserialize(reexpressOperationsForCurrentEra(entryPoints));

    // Assert: the blank slot stays blank. A caller that goes on to call `unregistered` is refused
    // by the composer, naming that circuit -- which is a better message than anything inventable here.
    expect([...state.operations()].map(String)).toEqual(['increment']);
    expect(state.operation('unregistered')).toBeUndefined();
  });

  it('refuses a registry that would answer for nothing', () => {
    // Arrange: every declared entry point is a blank slot.
    const entryPoints = [{ circuitId: 'unregistered', verifierKey: undefined, verifierKeyHash: undefined }];

    // Act / Assert: refused here rather than handed on, because an empty registry makes the
    // composer's refusal name a circuit when the real fault is that no key was readable at all.
    expect(() => reexpressOperationsForCurrentEra(entryPoints)).toThrow(ComposeOptionError);
  });

  it('refuses bytes that are not a verifier key, rather than registering them', () => {
    // Arrange: well-formed bytes of the wrong kind. The ledger's own setter validates the tag.
    const notAKey = Uint8Array.from([1, 2, 3, 4]);

    // Act / Assert: fail-closed, and the refusal comes from the ledger rather than from a check
    // restated here -- one that could drift from what the ledger actually accepts.
    expect(() =>
      reexpressOperationsForCurrentEra([{ circuitId: 'increment', verifierKey: notAKey, verifierKeyHash: undefined }])
    ).toThrow();
  });
});
