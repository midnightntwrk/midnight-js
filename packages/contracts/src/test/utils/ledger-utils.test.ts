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
  QueryContext
} from '@midnight-ntwrk/compact-runtime';
import {
  feeToken,
  MaintenanceUpdate,
  type PartitionedTranscript,
  type PublicAddress,
  sampleCoinPublicKey,
  sampleContractAddress,
  sampleEncryptionPublicKey,
  sampleSigningKey,
  sampleUserAddress,
  shieldedToken,
  type TokenType,
  Transaction,
  type Transcript,
  unshieldedToken,
  ZswapChainState
} from '@midnight-ntwrk/ledger-v7';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { randomBytes } from 'crypto';
import { beforeAll } from 'vitest';

import {
  createUnprovenLedgerCallTx,
  createUnprovenRemoveVerifierKeyTx,
  createUnprovenReplaceAuthorityTx,
  extractUserAddressedOutputs,
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

  const makeTranscript = (
    claimedUnshieldedSpends: Map<[TokenType, PublicAddress], bigint>
  ): Transcript<AlignedValue> => ({
    gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
    effects: {
      claimedNullifiers: [toHex(randomBytes(32))],
      claimedShieldedReceives: [toHex(randomBytes(32))],
      claimedShieldedSpends: [toHex(randomBytes(32))],
      claimedContractCalls: [],
      shieldedMints: new Map(),
      unshieldedInputs: new Map(),
      unshieldedOutputs: new Map(),
      unshieldedMints: new Map(),
      claimedUnshieldedSpends
    },
    program: ['new', { noop: { n: 5 } }]
  });

  describe('extractUserAddressedOutputs', () => {
    it('returns empty array when transcript is undefined', () => {
      const result = extractUserAddressedOutputs(undefined);

      expect(result).toEqual([]);
    });

    it('returns empty array when claimedUnshieldedSpends is empty', () => {
      const transcript = makeTranscript(new Map());

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('returns output for user-addressed unshielded token spend', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 100n;
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('returns output for user-addressed shielded token spend', () => {
      const userAddress = sampleUserAddress();
      const tokenType = shieldedToken();
      const amount = 50n;
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('filters out contract-addressed spends', () => {
      const contractAddr = sampleContractAddress();
      const tokenType = unshieldedToken();
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'contract', address: contractAddr } as PublicAddress], 100n]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('filters out dust token spends even for user addresses', () => {
      const userAddress = sampleUserAddress();
      const dustTokenType = feeToken();
      const transcript = makeTranscript(
        new Map([[[dustTokenType, { tag: 'user', address: userAddress } as PublicAddress], 100n]])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toEqual([]);
    });

    it('returns only user-addressed non-dust outputs from mixed spends', () => {
      const userAddress1 = sampleUserAddress();
      const userAddress2 = sampleUserAddress();
      const contractAddr = sampleContractAddress();
      const unshieldedTok = unshieldedToken();
      const shieldedTok = shieldedToken();
      const dustTok = feeToken();

      const transcript = makeTranscript(
        new Map([
          [[unshieldedTok, { tag: 'user', address: userAddress1 } as PublicAddress], 100n],
          [[shieldedTok, { tag: 'user', address: userAddress2 } as PublicAddress], 200n],
          [[unshieldedTok, { tag: 'contract', address: contractAddr } as PublicAddress], 300n],
          [[dustTok, { tag: 'user', address: userAddress1 } as PublicAddress], 400n]
        ])
      );

      const result = extractUserAddressedOutputs(transcript);

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { value: 100n, owner: userAddress1, type: unshieldedTok.raw },
          { value: 200n, owner: userAddress2, type: shieldedTok.raw }
        ])
      );
    });
  });

  describe('createUnprovenLedgerCallTx unshielded offers', () => {
    const circuitId = 'unshieldedOfferTx';
    const alignedValue: AlignedValue = {
      value: [new Uint8Array()],
      alignment: [{ tag: 'atom', value: { tag: 'field' } }]
    };
    const privateTranscriptOutputs: AlignedValue[] = [];
    const nextZswapLocalState = {
      outputs: [],
      inputs: [],
      coinPublicKey: sampleCoinPublicKey(),
      currentIndex: 0n
    };

    const callTxWithTranscripts = (
      guaranteed: Transcript<AlignedValue> | undefined,
      fallible: Transcript<AlignedValue> | undefined
    ) => {
      const contractState = new CompactContractState();
      contractState.setOperation(circuitId, new ContractOperation());
      const contractAddress = sampleContractAddress();

      return createUnprovenLedgerCallTx(
        circuitId,
        contractAddress,
        contractState,
        new ZswapChainState(),
        [guaranteed, fallible] as PartitionedTranscript,
        privateTranscriptOutputs,
        alignedValue,
        alignedValue,
        nextZswapLocalState,
        dummyEncPublicKey
      );
    };

    it('does not attach unshielded offers when transcripts are undefined', () => {
      const tx = callTxWithTranscripts(undefined, undefined);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeUndefined();
      expect(intent!.fallibleUnshieldedOffer).toBeUndefined();
    });

    it('attaches guaranteedUnshieldedOffer when guaranteed transcript has user-addressed spends', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 500n;
      const guaranteed = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );
      const fallible = makeTranscript(new Map());

      const tx = callTxWithTranscripts(guaranteed, fallible);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.guaranteedUnshieldedOffer!.outputs[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('attaches fallibleUnshieldedOffer when fallible transcript has user-addressed spends', () => {
      const userAddress = sampleUserAddress();
      const tokenType = unshieldedToken();
      const amount = 750n;
      const guaranteed = makeTranscript(new Map());
      const fallible = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress } as PublicAddress], amount]])
      );

      const tx = callTxWithTranscripts(guaranteed, fallible);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.fallibleUnshieldedOffer!.outputs[0]).toEqual({
        value: amount,
        owner: userAddress,
        type: tokenType.raw
      });
    });

    it('does not attach unshielded offers when only contract-addressed spends exist', () => {
      const contractAddr = sampleContractAddress();
      const tokenType = unshieldedToken();
      const transcript = makeTranscript(
        new Map([[[tokenType, { tag: 'contract', address: contractAddr } as PublicAddress], 100n]])
      );

      const tx = callTxWithTranscripts(transcript, transcript);

      expect(tx).toBeInstanceOf(Transaction);
      const intent = tx.intents?.values().next().value;
      expect(intent).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer).toBeUndefined();
      expect(intent!.fallibleUnshieldedOffer).toBeUndefined();
    });

    it('attaches offers to both guaranteed and fallible when both have user-addressed spends', () => {
      const userAddress1 = sampleUserAddress();
      const userAddress2 = sampleUserAddress();
      const tokenType = unshieldedToken();
      const guaranteed = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress1 } as PublicAddress], 100n]])
      );
      const fallible = makeTranscript(
        new Map([[[tokenType, { tag: 'user', address: userAddress2 } as PublicAddress], 200n]])
      );

      const tx = callTxWithTranscripts(guaranteed, fallible);

      const intent = tx.intents?.values().next().value;
      expect(intent!.guaranteedUnshieldedOffer).toBeDefined();
      expect(intent!.guaranteedUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.guaranteedUnshieldedOffer!.outputs[0].value).toBe(100n);
      expect(intent!.fallibleUnshieldedOffer).toBeDefined();
      expect(intent!.fallibleUnshieldedOffer!.outputs).toHaveLength(1);
      expect(intent!.fallibleUnshieldedOffer!.outputs[0].value).toBe(200n);
    });
  });
});
