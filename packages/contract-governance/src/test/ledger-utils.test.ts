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
  ContractState,
  sampleContractAddress,
  sampleSigningKey,
  UnprovenTransaction,
} from '@midnight-ntwrk/ledger';
import { createVerifierKey } from '@midnight-ntwrk/midnight-js-types';

import {
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  insertVerifierKey,
  removeVerifierKey,
  replaceAuthority,
  unprovenTxFromContractUpdates} from '../ledger-utils';

describe('ledger-utils', () => {
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new ContractState();
  const dummyContractState2 = new ContractState();
  const dummyContractAddress = sampleContractAddress();
  // Generate a concrete Uint8Array for use as a verifier key
  const verifierKey = createVerifierKey(new Uint8Array(32));

  it('replaceAuthority returns a ReplaceAuthority', () => {
    const ra = replaceAuthority(dummySigningKey, dummyContractState);
    expect(ra).toBeDefined();
    expect(ra.authority.threshold).toBe(1);
  });

  it('removeVerifierKey returns a VerifierKeyRemove', () => {
    const vkRemove = removeVerifierKey('op');
    expect(vkRemove).toBeDefined();
    expect(vkRemove.operation).toBe('op');
  });

  it.skip('insertVerifierKey returns a VerifierKeyInsert', () => {
    const vkInsert = insertVerifierKey('op', verifierKey);
    expect(vkInsert).toBeDefined();
    expect(vkInsert.operation).toBe('op');
  });

  it('unprovenTxFromContractUpdates returns an UnprovenTransaction', () => {
    const tx = unprovenTxFromContractUpdates(
      dummyContractAddress,
      [replaceAuthority(dummySigningKey, dummyContractState)],
      dummyContractState2,
      dummySigningKey2
    );
    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });

  it('createUnprovenReplaceAuthorityTx returns an UnprovenTransaction', () => {
    const tx = createUnprovenReplaceAuthorityTx(
      dummyContractAddress,
      dummySigningKey,
      dummyContractState,
      dummySigningKey2
    );
    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });

  it('createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction', () => {
    const tx = createUnprovenRemoveVerifierKeyTx(dummyContractAddress, 'op', dummyContractState, dummySigningKey);
    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });

  it('removeVerifierKey with Uint8Array operation', () => {
    const opBytes = new Uint8Array([1, 2, 3, 4]);
    const vkRemove = removeVerifierKey(opBytes);
    expect(vkRemove).toBeDefined();
    expect(vkRemove.operation).toBeDefined();
  });

  it('removeVerifierKey with string operation', () => {
    const vkRemove = removeVerifierKey('string-operation');
    expect(vkRemove).toBeDefined();
    expect(vkRemove.operation).toBe('string-operation');
  });

  it('creates unproven tx with multiple updates', () => {
    const updates = [
      replaceAuthority(dummySigningKey, dummyContractState),
      removeVerifierKey('circuit1')
    ];

    const tx = unprovenTxFromContractUpdates(
      dummyContractAddress,
      updates,
      dummyContractState2,
      dummySigningKey2
    );

    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });

  it('createUnprovenRemoveVerifierKeyTx with Uint8Array operation', () => {
    const opBytes = new Uint8Array([5, 6, 7, 8]);
    const tx = createUnprovenRemoveVerifierKeyTx(dummyContractAddress, opBytes, dummyContractState, dummySigningKey);
    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });

  it('replaceAuthority with different contract states', () => {
    const ra1 = replaceAuthority(dummySigningKey, dummyContractState);
    const ra2 = replaceAuthority(dummySigningKey2, dummyContractState2);

    expect(ra1).toBeDefined();
    expect(ra2).toBeDefined();
    expect(ra1.authority.threshold).toBe(1);
    expect(ra2.authority.threshold).toBe(1);
  });
});
