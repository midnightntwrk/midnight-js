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

import type {
  ContractAddress,
  ContractState,
  ContractStateProvider
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ZswapChainState } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';

/**
 * The chain-side state of one cross-contract callee, as of the resolver's block.
 */
export interface ResolvedCalleeState {
  /**
   * The callee's contract state — its ledger data and its `ContractOperation`s.
   */
  readonly contractState: ContractState;
  /**
   * The callee's Zswap chain state: its view of the global shielded commitment tree, pruned to the
   * coins it owns. Needed to build a Merkle path when the callee spends a coin of its own, because
   * the root contract's view has every other contract's leaves collapsed out of it.
   */
  readonly zswapChainState: ZswapChainState;
}

/**
 * A {@link ContractStateProvider} backed by a {@link PublicDataProvider}, together with the
 * contract states it resolved while a circuit executed.
 */
export interface CalleeStateResolver {
  /**
   * The state provider passed to the circuit runtime to resolve cross-contract call targets.
   */
  readonly stateProvider: ContractStateProvider;
  /**
   * The states resolved (and memoized) while executing the circuit, keyed by the string form of
   * the contract address. Populated as a side effect of the runtime invoking
   * {@link ContractStateProvider.getContractState}. Used after execution to look up each callee's
   * `ContractOperation` and — when that callee moved shielded coins — its Zswap chain state, both
   * without a second round-trip to the indexer. (Keyed by `string` to be agnostic to the various
   * branded `ContractAddress` types.)
   */
  readonly resolvedStates: ReadonlyMap<string, ResolvedCalleeState>;
  /**
   * The block hash the callee states are resolved as of — the same block the root contract's state
   * was read at. Exposed so the circuit's `parentBlockHash` can be set from a single source (the
   * resolver's presence and its block are then one and the same).
   */
  readonly blockHash: string;
}

/**
 * Creates a lazy, indexer-backed {@link ContractStateProvider} for resolving the targets of
 * cross-contract calls.
 *
 * The Compact runtime calls {@link ContractStateProvider.getContractState} on demand — once per
 * cross-contract callee, for the specific address it needs, at the point it makes the call — and
 * caches the result for the rest of the execution. This resolver therefore fetches exactly the
 * callee states required, during the single circuit run: no callee addresses need to be known in
 * advance, and the circuit is not executed twice. Each fetched state is memoized in
 * {@link CalleeStateResolver.resolvedStates} so it can be reused when building the transaction.
 *
 * Each callee is fetched with `queryZSwapAndContractState` rather than `queryContractState`, so a
 * single round-trip yields both halves at one block: the contract state the runtime needs to
 * execute the call, and the Zswap chain state transaction assembly needs if that callee spends a
 * shielded coin of its own. The zswap half is unused for callees that move no coins; fetching it
 * unconditionally keeps the read atomic and avoids a second, later, differently-anchored query.
 *
 * A `null` result from the data provider (no state at the address) resolves to `undefined`, which
 * the runtime surfaces as an unresolved cross-contract call.
 *
 * @param publicDataProvider The data provider used to fetch contract states.
 * @param blockHash The block hash at which to resolve callee states — the same block at which the
 * root contract's state was read, so the whole call tree is read from one coherent chain snapshot.
 * @returns A {@link CalleeStateResolver}.
 */
export const makeCalleeStateResolver = (
  publicDataProvider: PublicDataProvider,
  blockHash: string
): CalleeStateResolver => {
  const resolvedStates = new Map<string, ResolvedCalleeState>();
  const stateProvider: ContractStateProvider = {
    getContractState: async (_blockHash: string, address: ContractAddress): Promise<ContractState | undefined> => {
      const key = String(address);
      const cached = resolvedStates.get(key);
      if (cached !== undefined) {
        return cached.contractState;
      }
      const resolved = await publicDataProvider.queryZSwapAndContractState(address, {
        type: 'blockHash',
        blockHash
      });
      if (resolved === null) {
        return undefined;
      }
      const [zswapChainState, contractState] = resolved;
      resolvedStates.set(key, { contractState, zswapChainState });
      return contractState;
    }
  };
  return { stateProvider, resolvedStates, blockHash };
};
