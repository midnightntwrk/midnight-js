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

import type { Contract } from '@midnight-ntwrk/compact-js/effect/Contract';
import { LedgerParameters } from '@midnight-ntwrk/ledger-v8';
import type { AnyPrivateState, AnyProvableCircuitId, PrivateStateId } from '@midnight-ntwrk/midnight-js-types';
import { beforeEach, describe, expect, it } from 'vitest';

import { ScopedTransactionIdentityMismatchError } from '../errors';
import type { ContractStates, PublicContractStates } from '../get-states';
import {
  type CachedStateIdentity,
  CacheStates,
  GetCurrentStatesForIdentity,
  MergeUnsubmittedCallTxData,
  TransactionContextImpl
} from '../internal/transaction';
import { createMockContractAddress, createMockContractState, createMockProviders, createMockUnprovenCallTxData } from './test-mocks';

describe('TransactionContextImpl identity validation', () => {
  let mockProviders: ReturnType<typeof createMockProviders>;
  let txCtx: TransactionContextImpl<Contract.Any, AnyProvableCircuitId>;

  const createMockStates = (): ContractStates<AnyPrivateState> => ({
    contractState: createMockContractState(),
    zswapChainState: { test: 'mock-zswap-chain-state' } as never,
    privateState: { mockPrivateState: true } as AnyPrivateState,
    ledgerParameters: LedgerParameters.initialParameters()
  });

  const createMockPublicStates = (): PublicContractStates => ({
    contractState: createMockContractState(),
    zswapChainState: { test: 'mock-zswap-chain-state' } as never,
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

      txCtx[CacheStates](mockStates, identity);
      const result = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result).toBe(mockStates);
    });

    it('should throw ScopedTransactionIdentityMismatchError when contract addresses differ', () => {
      const contractAddress1 = createMockContractAddress();
      const contractAddress2 = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress: contractAddress1, privateStateId };
      const requestedIdentity: CachedStateIdentity = { contractAddress: contractAddress2, privateStateId };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, cachedIdentity);

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

      txCtx[CacheStates](mockStates, cachedIdentity);

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

      txCtx[CacheStates](mockStates, cachedIdentity);

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

      txCtx[CacheStates](mockStates, cachedIdentity);

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

      txCtx[CacheStates](mockStates, identity);

      const result1 = txCtx[GetCurrentStatesForIdentity](identity);
      const result2 = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result1).toBe(mockStates);
      expect(result2).toBe(mockStates);
    });

    it('should work correctly for public-only states (no privateStateId)', () => {
      const contractAddress = createMockContractAddress();
      const identity: CachedStateIdentity = { contractAddress };
      const mockStates = createMockPublicStates();

      txCtx[CacheStates]({ ...mockStates, privateState: undefined }, identity);
      const result = txCtx[GetCurrentStatesForIdentity](identity);

      expect(result).toEqual({ ...mockStates, privateState: undefined });
    });

    it('should throw when requesting with privateStateId but cached without', () => {
      const contractAddress = createMockContractAddress();
      const cachedIdentity: CachedStateIdentity = { contractAddress };
      const requestedIdentity: CachedStateIdentity = { contractAddress, privateStateId: 'some-id' as PrivateStateId };
      const mockStates = createMockPublicStates();

      txCtx[CacheStates]({ ...mockStates, privateState: undefined }, cachedIdentity);

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

    it('should return cached states without identity validation', () => {
      const identity: CachedStateIdentity = {
        contractAddress: createMockContractAddress(),
        privateStateId: 'test-private-state-id' as PrivateStateId
      };
      const mockStates = createMockStates();

      txCtx[CacheStates](mockStates, identity);
      const result = txCtx.getCurrentStates();

      expect(result).toBe(mockStates);
    });
  });

  describe('MergeUnsubmittedCallTxData identity preservation', () => {
    it('should preserve original identity after merging call data', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const mockCallData = createMockUnprovenCallTxData();

      txCtx[CacheStates](mockStates, identity);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData, privateStateId);

      const result = txCtx[GetCurrentStatesForIdentity](identity) as ContractStates<AnyPrivateState>;

      expect(result).toBeDefined();
      expect(result.privateState).toBe(mockCallData.private.nextPrivateState);
    });

    it('should allow GetCurrentStatesForIdentity with same identity after multiple merges', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const mockCallData1 = createMockUnprovenCallTxData();
      const mockCallData2 = createMockUnprovenCallTxData();

      txCtx[CacheStates](mockStates, identity);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData1, privateStateId);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData2, privateStateId);

      const result = txCtx[GetCurrentStatesForIdentity](identity) as ContractStates<AnyPrivateState>;

      expect(result).toBeDefined();
      expect(result.privateState).toBe(mockCallData2.private.nextPrivateState);
    });

    it('should preserve the original zswapChainState without modification after merge', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalZswapChainState = mockStates.zswapChainState;
      const mockCallData = createMockUnprovenCallTxData();

      txCtx[CacheStates](mockStates, identity);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData, privateStateId);

      const result = txCtx[GetCurrentStatesForIdentity](identity) as ContractStates<AnyPrivateState>;

      expect(result.zswapChainState).toBe(originalZswapChainState);
    });

    it('should preserve the original zswapChainState across multiple merges', () => {
      const contractAddress = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const identity: CachedStateIdentity = { contractAddress, privateStateId };
      const mockStates = createMockStates();
      const originalZswapChainState = mockStates.zswapChainState;
      const mockCallData1 = createMockUnprovenCallTxData();
      const mockCallData2 = createMockUnprovenCallTxData();

      txCtx[CacheStates](mockStates, identity);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData1, privateStateId);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData2, privateStateId);

      const result = txCtx[GetCurrentStatesForIdentity](identity) as ContractStates<AnyPrivateState>;

      expect(result.zswapChainState).toBe(originalZswapChainState);
    });

    it('should throw when requesting with different identity after merge', () => {
      const contractAddress1 = createMockContractAddress();
      const contractAddress2 = createMockContractAddress();
      const privateStateId = 'test-private-state-id' as PrivateStateId;
      const cachedIdentity: CachedStateIdentity = { contractAddress: contractAddress1, privateStateId };
      const differentIdentity: CachedStateIdentity = { contractAddress: contractAddress2, privateStateId };
      const mockStates = createMockStates();
      const mockCallData = createMockUnprovenCallTxData();

      txCtx[CacheStates](mockStates, cachedIdentity);
      txCtx[MergeUnsubmittedCallTxData]('testCircuit', mockCallData, privateStateId);

      expect(() => txCtx[GetCurrentStatesForIdentity](differentIdentity)).toThrow(
        ScopedTransactionIdentityMismatchError
      );
    });
  });
});
