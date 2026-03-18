/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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
  type Op,
  QueryContext
} from '@midnight-ntwrk/compact-runtime';
import {
  LedgerParameters,
  MaintenanceUpdate,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleSigningKey,
  Transaction,
  ZswapChainState
} from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { beforeAll } from 'vitest';

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
  beforeAll(() => {
    setNetworkId('testnet');
  });

  const mockZKProvider = createMockZKConfigProvider();
  const mockCompiledContract = createMockCompiledContract();
  const dummySigningKey = sampleSigningKey();
  const dummySigningKey2 = sampleSigningKey();
  const dummyContractState = new CompactContractState();
  const dummyContractAddress = sampleContractAddress();
  const dummyEncPublicKey = sampleEncryptionPublicKey();
  const dummyCPK = sampleCoinPublicKey();

  beforeAll(() => {
    setNetworkId('undeployed');
  });

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
    const contractState = dummyContractState;
    const contractOperation = new ContractOperation();

    contractState.setOperation(circuitId, contractOperation);

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
      [],
      privateTranscriptOutputs,
      alignedValue,
      alignedValue,
      nextZswapLocalState,
      dummyEncPublicKey,
      LedgerParameters.initialParameters(),
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenLedgerCallTx with non-empty publicTranscript produces a valid Transaction', () => {
    const circuitId = 'nonEmptyTranscriptTx';
    const contractState = new CompactContractState();
    const contractOperation = new ContractOperation();

    contractState.setOperation(circuitId, contractOperation);

    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [
        {
          tag: 'atom',
          value: { tag: 'field' }
        }
      ]
    };

    const publicTranscript: Op<AlignedValue>[] = [{ noop: { n: 5 } }];

    const contractAddress = sampleContractAddress();
    const zswapChainState = new ZswapChainState();
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
      publicTranscript,
      privateTranscriptOutputs,
      alignedValue,
      alignedValue,
      nextZswapLocalState,
      dummyEncPublicKey,
      LedgerParameters.initialParameters(),
      dummyCPK
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('createUnprovenLedgerCallTx throws when circuitId has no registered operation', () => {
    const unregisteredCircuitId = 'unregisteredCircuit';
    const contractState = new CompactContractState();

    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [
        {
          tag: 'atom',
          value: { tag: 'field' }
        }
      ]
    };

    expect(() =>
      createUnprovenLedgerCallTx(
        unregisteredCircuitId,
        sampleContractAddress(),
        contractState,
        new ZswapChainState(),
        [],
        [],
        alignedValue,
        alignedValue,
        {
          outputs: [],
          inputs: [],
          coinPublicKey: sampleCoinPublicKey(),
          currentIndex: 0n
        },
        dummyEncPublicKey,
        LedgerParameters.initialParameters(),
        dummyCPK
      )
    ).toThrow(`Operation '${unregisteredCircuitId}' is undefined`);
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
