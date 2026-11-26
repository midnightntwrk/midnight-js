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

import * as PlatformContractAddress from '@midnightntwrk/midnight-js-protocol/platform-js/effect/ContractAddress';
import { LedgerParameters, Transaction, ZswapChainState } from '@midnightntwrk/midnight-js-protocol/v9';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import { ChargedState, ContractState, StateValue } from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import {
  type AnyPrivateState,
  type AnyProvableCircuitId,
  type PrivateStateId,
  SerializedContractState
} from '@midnightntwrk/midnight-js-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScopedTransactionIdentityMismatchError } from '../errors';
import type { Ledger9ContractStates, Ledger9PublicStates } from '../internal/era';
import {
  type CachedStateIdentity,
  CacheStates,
  GetCurrentStatesForIdentity,
  RecordCall,
  TransactionContextImpl
} from '../internal/transaction';
import type * as InternalUtils from '../internal/utils';
import {
  createMockContractAddress,
  createMockContractCall,
  createMockContractState,
  createMockExecutedCall,
  createMockProviders,
  createMockUnprovenCallTxData,
  publicStatesReadStub
} from './test-mocks';

// The transaction a recorded call's own build assembles; these tests read what the scope records.
vi.mock('../internal/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof InternalUtils>()),
  createUnprovenLedgerCallTx: vi.fn(() => Transaction.fromParts('undeployed'))
}));

describe('TransactionContextImpl identity validation', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let txCtx: TransactionContextImpl<Contract.Any, AnyProvableCircuitId>;

  const MOCK_BLOCK_HASH = '00'.repeat(32);

  const MOCK_READ = publicStatesReadStub('v9');

  const createMockStates = (): Ledger9ContractStates<AnyPrivateState> => ({
    contractState: createMockContractState(),
    zswapChainState: new ZswapChainState(),
    privateState: { mockPrivateState: true } as AnyPrivateState,
    ledgerParameters: LedgerParameters.initialParameters()
  });

  const createMockPublicStates = (): Ledger9PublicStates => ({
    contractState: createMockContractState(),
    zswapChainState: new ZswapChainState(),
    ledgerParameters: LedgerParameters.initialParameters()
  });

  beforeEach(() => {
    mockProviders = createMockProviders();
    txCtx = new TransactionContextImpl(mockProviders);
  });

  describe('GetCurrentStatesForIdentity', () => {
    it('should return undefined when no states are cached', () => {
      const identity: CachedStateIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'test-private-state-id' as PrivateStateId
      };

      const result = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result).toBeUndefined();
    });

    it('should return cached states when identity matches exactly', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      const result = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result?.states).toEqual(mockStates);
      expect(result?.states.contractState).toBe(mockStates.contractState);
      expect(result?.blockHash).toBe(MOCK_BLOCK_HASH);
    });





    it('should throw ScopedTransactionIdentityMismatchError when contract addresses differ', () => {
      const contractAddress1 = createMockContractAddress();
      const contractAddress2 = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress: contractAddress1, privateStateId };
      const requestedIdentity: CachedStateIdentity = { contractAddress: contractAddress2, privateStateId };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, cachedIdentity, MOCK_BLOCK_HASH);

      expect(() => txCtx[GetCurrentStatesForIdentity](requestedIdentity)).toThrow(
        ScopedTransactionIdentityMismatchError
      );
    });

    it('should throw ScopedTransactionIdentityMismatchError when private state IDs differ', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId1 = 'private-state-id-1' as PrivateStateId;
      const privateStateId2 = 'private-state-id-2' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress, privateStateId: privateStateId1 };
      const requestedIdentity: CachedStateIdentity = { contractAddress, privateStateId: privateStateId2 };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, cachedIdentity, MOCK_BLOCK_HASH);

      expect(() => txCtx[GetCurrentStatesForIdentity](requestedIdentity)).toThrow(
        ScopedTransactionIdentityMismatchError
      );
    });

    it('should throw ScopedTransactionIdentityMismatchError when one has privateStateId and other does not', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress, privateStateId };
      const requestedIdentity: CachedStateIdentity = { contractAddress };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, cachedIdentity, MOCK_BLOCK_HASH);

      expect(() => txCtx[GetCurrentStatesForIdentity](requestedIdentity)).toThrow(
        ScopedTransactionIdentityMismatchError
      );
    });

    it('should include correct identity information in error', () => {
      const contractAddress1 = createMockContractAddress();
      const contractAddress2 = createMockContractAddress();
      const privateStateId1 = 'ps-id-1' as PrivateStateId;
      const privateStateId2 = 'ps-id-2' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress: contractAddress1, privateStateId: privateStateId1 };
      const requestedIdentity: CachedStateIdentity = { contractAddress: contractAddress2, privateStateId: privateStateId2 };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, cachedIdentity, MOCK_BLOCK_HASH);

      try {
        txCtx[GetCurrentStatesForIdentity](requestedIdentity);
        expect.fail('Expected ScopedTransactionIdentityMismatchError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScopedTransactionIdentityMismatchError);
        const identityError = error as ScopedTransactionIdentityMismatchError;
        expect(identityError.cached.contractAddress).toBe(contractAddress1);
        expect(identityError.cached.privateStateId).toBe(privateStateId1);
        expect(identityError.requested.contractAddress).toBe(contractAddress2);
        expect(identityError.requested.privateStateId).toBe(privateStateId2);
      }
    });

    it('should allow same identity to be used multiple times', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);

      const result1 = txCtx[GetCurrentStatesForIdentity](identity);
      const result2 = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result1?.states).toEqual(mockStates);
      expect(result2?.states).toEqual(mockStates);
    });

    it('should work correctly for public-only states (no privateStateId)', () => {
      const contractAddress = createMockContractAddress();
      const identity: CachedStateIdentity = { contractAddress };
      const mockStates = createMockPublicStates();

      txCtx[CacheStates]({ ...mockStates, privateState: undefined }, MOCK_READ, identity, MOCK_BLOCK_HASH);
      const result = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result?.states).toEqual({ ...mockStates, privateState: undefined });
    });

    it('should throw when requesting with privateStateId but cached without', () => {
      const contractAddress = createMockContractAddress();
      const cachedIdentity: CachedStateIdentity = { contractAddress };
      const requestedIdentity: CachedStateIdentity = { contractAddress, privateStateId: 'some-id' as PrivateStateId };
      const mockStates = createMockPublicStates();

      txCtx[CacheStates]({ ...mockStates, privateState: undefined }, MOCK_READ, cachedIdentity, MOCK_BLOCK_HASH);

      expect(() => txCtx[GetCurrentStatesForIdentity](requestedIdentity)).toThrow(
        ScopedTransactionIdentityMismatchError
      );
    });
  });

  describe('getCurrentStates', () => {
    it('should return undefined when no states are cached', () => {
      const result = txCtx.getCurrentStates();

      expect(result).toBeUndefined();
    });

    const identity: CachedStateIdentity = {
      contractAddress: createMockContractAddress(),
      privateStateId: 'test-private-state-id' as PrivateStateId
    };

    it('returns the cached public states as bytes, without the private state', () => {
      const contractState = new ContractState();
      txCtx[CacheStates]({ ...createMockStates(), contractState }, MOCK_READ, identity, MOCK_BLOCK_HASH);

      const result = txCtx.getCurrentStates();

      expect(Object.keys(result ?? {}).sort()).toEqual(['contractState', 'ledgerParameters', 'protocolVersion', 'zswapChainState']);
      expect(SerializedContractState.isSerializedContractState(result?.contractState)).toBe(true);
      expect(result?.contractState.era).toBe('v9');
      expect(result?.contractState.serialize()).toEqual(contractState.serialize());
      expect(result?.ledgerParameters).toBe(MOCK_READ.ledgerParameters);
      expect(result?.zswapChainState.serialize()).toEqual(new ZswapChainState().serialize());
      expect(result?.protocolVersion).toBe(MOCK_READ.protocolVersion);
    });

    it('returns the running contract state after a call in the scope', async () => {
      const contractState = new ContractState();
      contractState.data = new ChargedState(StateValue.newArray());
      const before = contractState.serialize();
      txCtx[CacheStates]({ ...createMockStates(), contractState }, MOCK_READ, identity, MOCK_BLOCK_HASH);

      const call = createMockContractCall({ contractAddress: PlatformContractAddress.ContractAddress(identity.contractAddress) });
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(createMockExecutedCall(createMockUnprovenCallTxData({ calls: [{ ...call, public: { ...call.public, contractState: StateValue.newNull() } }] }))));
      const running = txCtx[GetCurrentStatesForIdentity](identity)?.states.contractState;

      expect(running?.serialize()).not.toEqual(before);
      expect(txCtx.getCurrentStates()?.contractState.serialize()).toEqual(running?.serialize());
    });
  });

  describe('getLastUnsubmittedCallTxDataToTransact', () => {
    const withScopeTransactionOf = (executed: ReturnType<typeof createMockExecutedCall>) => ({
      ...executed.result,
      private: { ...executed.result.private, unprovenTx: expect.anything(), newCoins: executed.newCoins }
    });

    it('reports the private state id of the last merged call', async () => {
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const executed = createMockExecutedCall();

      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(executed), {
        contractAddress: createMockContractAddress(),
        privateStateId
      });

      expect(txCtx.getLastUnsubmittedCallTxDataToTransact()).toEqual([withScopeTransactionOf(executed), privateStateId]);
    });

    it('reports no private state id for a call that stores none', async () => {
      const executed = createMockExecutedCall();

      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(executed));

      expect(txCtx.getLastUnsubmittedCallTxDataToTransact()).toEqual([withScopeTransactionOf(executed), undefined]);
    });

    it('reports the latest call when a later call replaces an earlier one', async () => {
      const first = createMockExecutedCall();
      const second = createMockExecutedCall(createMockUnprovenCallTxData({ private: { ...createMockUnprovenCallTxData().private, result: 'second' } }));
      const contractAddress = createMockContractAddress();

      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(first), { contractAddress, privateStateId: 'first' });
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(second), { contractAddress, privateStateId: 'second' });

      expect(txCtx.getLastUnsubmittedCallTxDataToTransact()).toEqual([
        { ...withScopeTransactionOf(second), private: { ...withScopeTransactionOf(second).private, newCoins: [...first.newCoins, ...second.newCoins] } },
        'second'
      ]);
    });
  });

  describe('the identity of a recorded call', () => {
    it('should preserve original identity after merging call data', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const mockCallData = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result).toBeDefined();
      expect(result.privateState).toBe(mockCallData.result.private.nextPrivateState);
    });

    it('should allow GetCurrentStatesForIdentity with same identity after several recorded calls', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const mockCallData1 = createMockExecutedCall();
      const mockCallData2 = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData1), { contractAddress, privateStateId });
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData2), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result).toBeDefined();
      expect(result.privateState).toBe(mockCallData2.result.private.nextPrivateState);
    });

    it('should preserve the original ledgerParameters without modification after a recorded call', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalLedgerParameters = mockStates.ledgerParameters;
      const mockCallData = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result.ledgerParameters).toBe(originalLedgerParameters);
    });

    it('should preserve the original ledgerParameters across several recorded calls', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalLedgerParameters = mockStates.ledgerParameters;
      const mockCallData1 = createMockExecutedCall();
      const mockCallData2 = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData1), { contractAddress, privateStateId });
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData2), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result.ledgerParameters).toBe(originalLedgerParameters);
    });

    it('should preserve the original zswapChainState without modification after a recorded call', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalZswapChainState = mockStates.zswapChainState;
      const mockCallData = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result.zswapChainState).toBe(originalZswapChainState);
    });

    it('should preserve the original zswapChainState across several recorded calls', async () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalZswapChainState = mockStates.zswapChainState;
      const mockCallData1 = createMockExecutedCall();
      const mockCallData2 = createMockExecutedCall();

      txCtx[CacheStates](mockStates, MOCK_READ, identity, MOCK_BLOCK_HASH);
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData1), { contractAddress, privateStateId });
      await txCtx[RecordCall]('testCircuit', () => Promise.resolve(mockCallData2), { contractAddress, privateStateId });

      const result = txCtx[GetCurrentStatesForIdentity](identity)?.states as Ledger9ContractStates<AnyPrivateState>;

      expect(result.zswapChainState).toBe(originalZswapChainState);
    });

  });
});
