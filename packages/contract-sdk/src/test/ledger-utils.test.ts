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
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  type Transcript,
  UnprovenTransaction,
  ZswapChainState
} from '@midnight-ntwrk/ledger';
import { type PartitionedTranscript } from '@midnight-ntwrk/midnight-js-contract-core';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';

import { createUnprovenLedgerCallTx } from '../ledger-utils';

describe('ledger-utils', () => {
  const dummyContractState = new ContractState();
  const dummyEncPublicKey = sampleEncryptionPublicKey();

  it('createUnprovenLedgerCallTx returns an UnprovenTransaction', () => {
    const circuitId = 'unProvenLedgerTx';
    const contractState = dummyContractState;
    const contractOperation = new ContractOperation();

    contractState.setOperation(circuitId, contractOperation);

    const transcript: Transcript<AlignedValue> = {
      gas: 10n,
      effects: {
        claimedNullifiers: [toHex(randomBytes(32))],
        claimedReceives: [toHex(randomBytes(32))],
        claimedSpends: [toHex(randomBytes(32))],
        claimedContractCalls: new Array([5n, sampleContractAddress(), toHex(randomBytes(32)), new Uint8Array([0])]),
        mints: new Map([[toHex(randomBytes(32)), 1n]])
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
    expect(tx).toBeInstanceOf(UnprovenTransaction);
  });
});
