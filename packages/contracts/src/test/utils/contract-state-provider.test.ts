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

import type { ContractAddress, ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it, vi } from 'vitest';

import { makeCalleeStateResolver } from '../../utils';

const BLOCK_HASH = 'ab'.repeat(32);
const OTHER_BLOCK_HASH = 'cd'.repeat(32);
const ADDRESS = 'a'.repeat(64) as unknown as ContractAddress;
const OTHER_ADDRESS = 'b'.repeat(64) as unknown as ContractAddress;
const STATE = { tag: 'callee-state' } as unknown as ContractState;

/** A `PublicDataProvider` whose only exercised method is `queryContractState`. */
const providerWith = (queryContractState: PublicDataProvider['queryContractState']): PublicDataProvider =>
  ({ queryContractState } as unknown as PublicDataProvider);

describe('makeCalleeStateResolver', () => {
  it('exposes the pinned block hash and an initially empty resolved-states map', () => {
    const resolver = makeCalleeStateResolver(providerWith(vi.fn()), BLOCK_HASH);

    expect(resolver.blockHash).toBe(BLOCK_HASH);
    expect(resolver.resolvedStates.size).toBe(0);
  });

  it('resolves a callee state at the resolver block hash, ignoring the runtime-supplied block', async () => {
    const queryContractState = vi.fn().mockResolvedValue(STATE);
    const resolver = makeCalleeStateResolver(providerWith(queryContractState), BLOCK_HASH);

    // The runtime passes its own block hash; the resolver must query at the block the whole call
    // tree is pinned to, not that argument.
    const state = await resolver.stateProvider.getContractState(OTHER_BLOCK_HASH, ADDRESS);

    expect(state).toBe(STATE);
    expect(queryContractState).toHaveBeenCalledTimes(1);
    expect(queryContractState).toHaveBeenCalledWith(ADDRESS, { type: 'blockHash', blockHash: BLOCK_HASH });
  });

  it('memoizes a resolved state and serves subsequent reads from the cache', async () => {
    const queryContractState = vi.fn().mockResolvedValue(STATE);
    const resolver = makeCalleeStateResolver(providerWith(queryContractState), BLOCK_HASH);

    const first = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    const second = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);

    expect(first).toBe(STATE);
    expect(second).toBe(STATE);
    expect(queryContractState).toHaveBeenCalledTimes(1);
    expect(resolver.resolvedStates.get(String(ADDRESS))).toBe(STATE);
  });

  it('memoizes per address', async () => {
    const queryContractState = vi
      .fn()
      .mockResolvedValueOnce(STATE)
      .mockResolvedValueOnce({ tag: 'other-state' } as unknown as ContractState);
    const resolver = makeCalleeStateResolver(providerWith(queryContractState), BLOCK_HASH);

    await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    await resolver.stateProvider.getContractState(BLOCK_HASH, OTHER_ADDRESS);

    expect(queryContractState).toHaveBeenCalledTimes(2);
    expect(resolver.resolvedStates.size).toBe(2);
    expect(resolver.resolvedStates.has(String(ADDRESS))).toBe(true);
    expect(resolver.resolvedStates.has(String(OTHER_ADDRESS))).toBe(true);
  });

  it('maps a null provider result to undefined and does not memoize it', async () => {
    const queryContractState = vi.fn().mockResolvedValue(null);
    const resolver = makeCalleeStateResolver(providerWith(queryContractState), BLOCK_HASH);

    const result = await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);

    expect(result).toBeUndefined();
    expect(resolver.resolvedStates.has(String(ADDRESS))).toBe(false);

    // Nothing was cached, so a later read re-queries the provider rather than serving `undefined`.
    await resolver.stateProvider.getContractState(BLOCK_HASH, ADDRESS);
    expect(queryContractState).toHaveBeenCalledTimes(2);
  });
});
