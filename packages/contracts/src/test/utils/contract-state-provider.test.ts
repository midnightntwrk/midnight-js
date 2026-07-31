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

import type { ContractAddress, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { makeCalleeStateResolver } from '../../utils';

const BLOCK_HASH = 'ab'.repeat(32);
const OTHER_BLOCK_HASH = 'cd'.repeat(32);
const ADDRESS = 'a'.repeat(64) as unknown as ContractAddress;
const OTHER_ADDRESS = 'b'.repeat(64) as unknown as ContractAddress;
const STATE = { tag: 'callee-state' } as unknown as ContractState;
const ZSWAP_STATE = { tag: 'callee-zswap-state' } as unknown as ZswapChainState;
const OTHER_STATE = { tag: 'other-state' } as unknown as ContractState;
const OTHER_ZSWAP_STATE = { tag: 'other-zswap-state' } as unknown as ZswapChainState;

/**
 * A `PublicDataProvider` whose only exercised method is `queryZSwapAndContractState`. The resolver
 * reads both halves in one round-trip, so the contract state the runtime consumes and the Zswap
 * chain state transaction assembly consumes are anchored to the same block by construction.
 */
const providerWith = (
  queryZSwapAndContractState: PublicDataProvider['queryZSwapAndContractState']
): PublicDataProvider => ({ queryZSwapAndContractState } as unknown as PublicDataProvider);

describe('makeCalleeStateResolver', () => {
  it('exposes the pinned block hash and an initially empty resolved-states map', () => {
    const resolver = makeCalleeStateResolver(providerWith(vi.fn()), BLOCK_HASH);

    expect(resolver.blockHash).toBe(BLOCK_HASH);
    expect(resolver.resolvedStates.size).toBe(0);
  });

  it('resolves a callee state at the resolver block hash, ignoring the runtime-supplied block', async () => {
    const query = vi.fn().mockResolvedValue([ZSWAP_STATE, STATE]);
    const resolver = makeCalleeStateResolver(providerWith(query), BLOCK_HASH);

    // The runtime passes its own block hash; the resolver must query at the block the whole call
    // tree is pinned to, not that argument.
    const state = await resolver.stateProvider.getContractState(OTHER_BLOCK_HASH, ADDRESS);

    expect(state).toBe(STATE);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(ADDRESS, { type: 'blockHash', blockHash: BLOCK_HASH });
  });

  it('keeps the Zswap half of the read, which the runtime never asks for', async () => {
    // getContractState returns only the contract state, so the Zswap chain state would be dropped
    // if the resolver did not retain it. It is the half a callee needs to spend a settled coin of
    // its own, and re-fetching it later would anchor it to a different block.
    const query = vi.fn().mockResolvedValue([ZSWAP_STATE, STATE]);
    const resolver = makeCalleeStateResolver(providerWith(query), BLOCK_HASH);

    await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);

    expect(resolver.resolvedStates.get(String(ADDRESS))).toEqual({
      contractState: STATE,
      zswapChainState: ZSWAP_STATE
    });
  });

  it('memoizes a resolved state and serves subsequent reads from the cache', async () => {
    const query = vi.fn().mockResolvedValue([ZSWAP_STATE, STATE]);
    const resolver = makeCalleeStateResolver(providerWith(query), BLOCK_HASH);

    const first = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    const second = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);

    expect(first).toBe(STATE);
    expect(second).toBe(STATE);
    expect(query).toHaveBeenCalledTimes(1);
    expect(resolver.resolvedStates.get(String(ADDRESS))?.contractState).toBe(STATE);
    expect(resolver.resolvedStates.get(String(ADDRESS))?.zswapChainState).toBe(ZSWAP_STATE);
  });

  it('memoizes per address', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([ZSWAP_STATE, STATE])
      .mockResolvedValueOnce([OTHER_ZSWAP_STATE, OTHER_STATE]);
    const resolver = makeCalleeStateResolver(providerWith(query), BLOCK_HASH);

    await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    await resolver.stateProvider.getContractState(BLOCK_HASH, OTHER_ADDRESS);

    expect(query).toHaveBeenCalledTimes(2);
    expect(resolver.resolvedStates.size).toBe(2);
    expect(resolver.resolvedStates.get(String(ADDRESS))?.zswapChainState).toBe(ZSWAP_STATE);
    expect(resolver.resolvedStates.get(String(OTHER_ADDRESS))?.zswapChainState).toBe(OTHER_ZSWAP_STATE);
  });

  it('maps a null provider result to undefined and does not memoize it', async () => {
    const query = vi.fn().mockResolvedValue(null);
    const resolver = makeCalleeStateResolver(providerWith(query), BLOCK_HASH);

    const result = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);

    expect(result).toBeUndefined();
    expect(resolver.resolvedStates.has(String(ADDRESS))).toBe(false);

    // Nothing was cached, so a later read re-queries the provider rather than serving `undefined`.
    await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
