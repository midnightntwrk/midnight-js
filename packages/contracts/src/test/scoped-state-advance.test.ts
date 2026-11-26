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
import {
  LedgerParameters,
  ZswapChainState
} from '@midnightntwrk/midnight-js-protocol/v9';
import { type ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';
import type { Contract } from '@midnightntwrk/midnight-js-protocol/v9/compact-js/effect/Contract';
import {
  ChargedState,
  ContractMaintenanceAuthority,
  ContractOperation,
  ContractState,
  sampleSigningKey,
  signatureVerifyingKey,
  StateValue
} from '@midnightntwrk/midnight-js-protocol/v9/compact-runtime';
import { type AnyProvableCircuitId } from '@midnightntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { advancePublicStates } from '../internal/ledger9-scope-states';
import { CacheStates, PublicStatesOf, RecordCall, TransactionContextImpl } from '../internal/transaction';
import type * as InternalUtils from '../internal/utils';
import { submitCallTx } from '../submit-call-tx';
import { withContractScopedTransaction } from '../transaction';
import {
  chainWithShieldedMap,
  counterOf,
  deposit
} from './scoped-transaction-fixtures';
import {
  createMockContractAddress,
  createMockContractCall,
  createMockExecutedCall,
  createMockProviders,
  createMockUnprovenCallTxData,
  publicStatesReadStub
} from './test-mocks';

// Every build runs for real; the spy only records what each build was given.
vi.mock('../internal/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof InternalUtils>();
  return { ...actual, createUnprovenLedgerCallTx: vi.fn(actual.createUnprovenLedgerCallTx) };
});

describe('a ledger 9 scoped transaction', () => {
  it('runs each call on the state the earlier calls to the same contract left, reading the contract once', async () => {
    // Arrange
    const { providers, contractAddress } = await chainWithShieldedMap();
    const counters: bigint[] = [];

    // Act
    await withContractScopedTransaction(providers, async (txCtx) => {
      for (const nonce of [1, 2, 3]) {
        counters.push(counterOf(await submitCallTx(providers, deposit(contractAddress, nonce), txCtx)));
      }
    });

    // Assert: RED WHEN a recorded call leaves the scope's state of its contract as it was read, so every
    // call runs on the state read from the chain.
    expect(counters).toEqual([1n, 2n, 3n]);
    expect(providers.publicDataProvider.queryZSwapAndContractState).toHaveBeenCalledOnce();
  });

  it("a callee's state advances in the scope after a call that reaches it", async () => {
    // Arrange
    const rootAddress = createMockContractAddress();
    const calleeAddress = createMockContractAddress();
    const rootState = new ContractState();
    const calleeState = new ContractState();
    const [rootBefore, calleeBefore] = [rootState.serialize(), calleeState.serialize()];
    const scope = new TransactionContextImpl<Contract.Any, AnyProvableCircuitId>(createMockProviders());
    scope[CacheStates](
      { contractState: rootState, zswapChainState: new ZswapChainState(), ledgerParameters: LedgerParameters.initialParameters() },
      publicStatesReadStub('v9'),
      { contractAddress: rootAddress },
      '00'.repeat(32)
    );
    const callTo = (address: string, contractState: StateValue): ContractExecutable.ContractExecutable.ContractCall => {
      const call = createMockContractCall({ contractAddress: PlatformContractAddress.ContractAddress(address) });
      return { ...call, public: { ...call.public, contractState } };
    };
    const calleeLeft = StateValue.newArray();
    const rootLeft = StateValue.newArray().arrayPush(StateValue.newNull());
    const statesBuiltAgainst = new Map([
      [rootAddress, { contractState: rootState, zswapChainState: new ZswapChainState() }],
      [calleeAddress, { contractState: calleeState, zswapChainState: new ZswapChainState() }]
    ]);

    // Act
    await scope[RecordCall]('testCircuit', () => Promise.resolve(createMockExecutedCall(createMockUnprovenCallTxData({ calls: [callTo(calleeAddress, calleeLeft), callTo(rootAddress, rootLeft)] }), statesBuiltAgainst)));

    // Assert: RED WHEN a call advances only its root contract in the scope, or changes a state object in
    // place rather than holding a new one.
    expect(scope[PublicStatesOf](calleeAddress)?.contractState.data.state.encode()).toEqual(calleeLeft.encode());
    expect(scope[PublicStatesOf](rootAddress)?.contractState.data.state.encode()).toEqual(rootLeft.encode());
    expect(scope[PublicStatesOf](calleeAddress)?.contractState).not.toBe(calleeState);
    expect(scope[PublicStatesOf](rootAddress)?.contractState).not.toBe(rootState);
    expect(calleeState.serialize()).toEqual(calleeBefore);
    expect(rootState.serialize()).toEqual(rootBefore);
  });

  it('advances a contract from its parts, never serializing the state it replaces the data of, nor walking that data', () => {
    // Arrange: a state with an operation, a balance and a maintenance authority other than the default,
    // built the way the scope held it before.
    const address = createMockContractAddress();
    const before = new ContractState();
    before.setOperation('testCircuit', new ContractOperation());
    before.balance = new Map([[{ tag: 'unshielded', raw: '01'.repeat(32) }, 7n]]);
    before.maintenanceAuthority = new ContractMaintenanceAuthority([signatureVerifyingKey(sampleSigningKey())], 1, 3n);
    const left = StateValue.newArray().arrayPush(StateValue.newNull());
    const expected = ContractState.deserialize(before.serialize());
    expected.data = new ChargedState(left);
    const publicStates = new Map([[address, { contractState: before, zswapChainState: new ZswapChainState() }]]);
    const serialize = vi.spyOn(before, 'serialize');
    const call = createMockContractCall({ contractAddress: PlatformContractAddress.ContractAddress(address) });
    const { assembly } = createMockExecutedCall(
      createMockUnprovenCallTxData({ calls: [{ ...call, public: { ...call.public, contractState: left } }] })
    );
    const encode = vi.spyOn(StateValue.prototype, 'encode');

    // Act
    advancePublicStates(publicStates, assembly);

    // Assert: RED WHEN the advance copies the whole state through its serialization, or walks its data,
    // whose cost grows with the contract's data, or drops a part of the state, the maintenance
    // authority included.
    expect(serialize).not.toHaveBeenCalled();
    expect(encode).not.toHaveBeenCalled();
    serialize.mockRestore();
    encode.mockRestore();
    const after = publicStates.get(address)!.contractState;
    expect(after).not.toBe(before);
    expect(after.maintenanceAuthority.counter).toBe(3n);
    expect(after.serialize()).toEqual(expected.serialize());
  });

  it('leaves a contract the data of the last call of one tree that reaches it twice', () => {
    // Arrange
    const address = createMockContractAddress();
    const publicStates = new Map([[address, { contractState: new ContractState(), zswapChainState: new ZswapChainState() }]]);
    const first = StateValue.newArray();
    const last = StateValue.newArray().arrayPush(StateValue.newNull());
    const calls = [first, last].map((contractState) => {
      const call = createMockContractCall({ contractAddress: PlatformContractAddress.ContractAddress(address) });
      return { ...call, public: { ...call.public, contractState } };
    });

    // Act
    advancePublicStates(publicStates, createMockExecutedCall(createMockUnprovenCallTxData({ calls })).assembly);

    // Assert: RED WHEN the data an earlier call of the tree left is kept, so a later call of the scope
    // runs on stale data.
    expect(publicStates.get(address)!.contractState.data.state.encode()).toEqual(last.encode());
  });

  describe('the balance a call tree leaves a contract', () => {
    const token = { tag: 'unshielded' as const, raw: '01'.repeat(32) };

    /** A transcript whose effects take `taken` of `token` into the contract and pay `paid` out of it. */
    const transcriptMoving = (taken: bigint, paid: bigint) => {
      return {
        gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
        effects: {
          claimedNullifiers: [],
          claimedShieldedReceives: [],
          claimedShieldedSpends: [],
          claimedContractCalls: [],
          shieldedMints: new Map<string, bigint>(),
          unshieldedMints: new Map<string, bigint>(),
          unshieldedInputs: new Map([[token, taken]]),
          unshieldedOutputs: new Map([[token, paid]]),
          claimedUnshieldedSpends: new Map()
        },
        program: []
      };
    };

    const balanceAfter = (
      address: string,
      halves: readonly (readonly [ReturnType<typeof transcriptMoving> | undefined, ReturnType<typeof transcriptMoving> | undefined])[]
    ): bigint | undefined => {
      const before = new ContractState();
      before.balance = new Map([[token, 100n]]);
      const publicStates = new Map([[address, { contractState: before, zswapChainState: new ZswapChainState() }]]);
      const calls = halves.map((partitionedTranscript) => {
        const call = createMockContractCall({ contractAddress: PlatformContractAddress.ContractAddress(address) });
        return { ...call, public: { ...call.public, partitionedTranscript: [...partitionedTranscript] as typeof call.public.partitionedTranscript } };
      });
      advancePublicStates(publicStates, createMockExecutedCall(createMockUnprovenCallTxData({ calls })).assembly);
      return Array.from(publicStates.get(address)!.contractState.balance.values())[0];
    };

    it('moves the balance by the effects of a call placed in the fallible half', () => {
      // Act
      const balance = balanceAfter(createMockContractAddress(), [[undefined, transcriptMoving(5n, 30n)]]);

      // Assert: RED WHEN only the guaranteed half's effects move the balance.
      expect(balance).toBe(75n);
    });

    it('moves the balance by the effects of every call of one tree to the contract, in both halves', () => {
      // Act: the tree reaches the contract twice, once split across both halves.
      const balance = balanceAfter(createMockContractAddress(), [
        [transcriptMoving(10n, 0n), undefined],
        [transcriptMoving(0n, 20n), transcriptMoving(1n, 0n)]
      ]);

      // Assert: RED WHEN a later call of the tree to the contract replaces the effects of an earlier one.
      expect(balance).toBe(91n);
    });
  });
});
