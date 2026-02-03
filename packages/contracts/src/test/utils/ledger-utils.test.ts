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
  ContractState as CompactContractState,
  QueryContext
} from '@midnight-ntwrk/compact-runtime';
import {
  MaintenanceUpdate,
  type PartitionedTranscript,
  type PublicAddress,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleSigningKey,
  Transaction,
  type Transcript,
  unshieldedToken,
  ZswapChainState
} from '@midnight-ntwrk/ledger-v7';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';

import {
  createUnprovenLedgerCallTx,
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  fromLedgerContractState,
  toLedgerContractState,
  toLedgerQueryContext,
  unprovenTxFromContractUpdates} from '../../utils';
import { createMockCompiledContract,createMockZKConfigProvider } from '../test-mocks';

describe('ledger-utils', () => {
  const mockZKProvider = createMockZKConfigProvider();
  const mockCompiledContract = createMockCompiledContract();
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyEncPublicKey = sampleEncryptionPublicKey();
  const dummyCPK = sampleCoinPublicKey();

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

  it('unprovenTxFromContractUpdates returns an UnprovenTransaction', async () => {
    const tx = await unprovenTxFromContractUpdates(
      () => Promise.resolve(new MaintenanceUpdate(dummyContractAddress, [], 1n))
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
      gas: {
        readTime: 1n,
        computeTime: 2n,
        bytesWritten: 4n,
        bytesDeleted: 8n,
      },
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

  it('createUnprovenReplaceAuthorityTx returns an UnprovenTransaction', async () => {
    const tx = await createUnprovenReplaceAuthorityTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      dummySigningKey,
      dummyContractState,
      dummySigningKey2,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenRemoveVerifierKeyTx returns an UnprovenTransaction', async () => {
    const tx = await createUnprovenRemoveVerifierKeyTx(
      mockZKProvider,
      mockCompiledContract,
      dummyContractAddress,
      'op',
      dummyContractState,
      dummySigningKey,
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });
});
