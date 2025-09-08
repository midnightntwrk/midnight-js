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
  type AlignedValue,
  ContractOperation,
  ContractState,
  type PublicAddress,
  QueryContext,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleSigningKey,
  Transaction,
  type Transcript,
  unshieldedToken,
  ZswapChainState} from '@midnight-ntwrk/ledger-v6';
import { createVerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';

import { type PartitionedTranscript } from '../../call';
import {
  contractMaintenanceAuthority,
  createUnprovenLedgerCallTx,
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  fromLedgerContractState,
  insertVerifierKey,
  removeVerifierKey,
  replaceAuthority,
  toLedgerContractState,
  toLedgerQueryContext,
  unprovenTxFromContractUpdates} from '../../utils';

describe('ledger-utils', () => {
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new ContractState();
  const dummyContractState2 = new ContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyEncPublicKey = sampleEncryptionPublicKey();
  // Generate a concrete Uint8Array for use as a verifier key
  const verifierKey = createVerifierKey(new Uint8Array(32));

  it('toLedgerContractState and fromLedgerContractState are inverses', () => {
    const ledgerState = toLedgerContractState(dummyContractState);
    const roundTrip = fromLedgerContractState(ledgerState);
    expect(roundTrip.constructor.name).toBe('ContractState');
    expect(roundTrip).toHaveProperty('maintenanceAuthority');
  });

  it('toLedgerQueryContext returns a LedgerQueryContext', () => {
    const queryContext = new QueryContext(dummyContractState.data, dummyContractAddress);
    const ledgerQueryContext = toLedgerQueryContext(queryContext);
    expect(ledgerQueryContext.address).toEqual(queryContext.address);
    // RuntimeError: unreachable
    // WASM Error
  });

  it('contractMaintenanceAuthority returns a valid authority', () => {
    const authority = contractMaintenanceAuthority(dummySigningKey, dummyContractState);
    expect(authority.threshold).toBe(1);
    expect(authority.committee.length).toBe(1);
    expect(authority.counter).toBe(1n);
  });

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
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenLedgerCallTx returns an UnprovenTransaction', () => {
    const circuitId = 'unProvenLedgerTx';
    const tokenType = unshieldedToken();
    const contractState = dummyContractState;
    const contractOperation = new ContractOperation();
    const address = { tag: 'contract', address: sampleContractAddress() } as PublicAddress;

    contractState.setOperation(circuitId, contractOperation);

    const transcript: Transcript<AlignedValue> = {
      gas: 10n,
      effects: {
        claimedNullifiers: [toHex(randomBytes(32))],
        claimedShieldedReceives: [toHex(randomBytes(32))],
        claimedShieldedSpends: [toHex(randomBytes(32))],
        claimedContractCalls: new Array([5n, sampleContractAddress(), toHex(randomBytes(32)), new Uint8Array([0])]),
        shieldedMints: new Map([[toHex(randomBytes(32)), 1n]]),
        unshieldedInputs: new Map([[tokenType, 1n]]),
        unshieldedOutputs: new Map([[tokenType, 1n]]),
        unshieldedMints: new Map([[toHex(randomBytes(32)), 1n]]),
        claimedUnshieldedSpends: new Map([[[tokenType, address], 1n]])
      },
      program: ['new', { noop: { n: 5 } }]
    };

    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [
        {
          tag: 'atom',
          value: { tag: 'field' }
        }
      ]
    };

    const contractAddress = sampleContractAddress();
    const zswapChainState = new ZswapChainState();
    const partitionedTranscript: PartitionedTranscript = [transcript, transcript];
    const privateTranscriptOutputs: AlignedValue[] = [];
    const nextZswapLocalState = {
      outputs: [],
      inputs: [],
      coinPublicKey: sampleCoinPublicKey(),
      currentIndex: 0n
    };

    const tx = createUnprovenLedgerCallTx(
      circuitId,
      contractAddress,
      contractState,
      zswapChainState,
      partitionedTranscript,
      privateTranscriptOutputs,
      alignedValue,
      alignedValue,
      nextZswapLocalState,
      dummyEncPublicKey
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenReplaceAuthorityTx returns an UnprovenTransaction', () => {
    const tx = createUnprovenReplaceAuthorityTx(
      dummyContractAddress,
      dummySigningKey,
      dummyContractState,
      dummySigningKey2
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction', () => {
    const tx = createUnprovenRemoveVerifierKeyTx(dummyContractAddress, 'op', dummyContractState, dummySigningKey);
    expect(tx).toBeInstanceOf(Transaction);
  });
});
