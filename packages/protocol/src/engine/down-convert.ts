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

import type { ChargedState, StateBoundedMerkleTree, StateMap, StateValue } from '@midnight-ntwrk/onchain-runtime-v3';
import type { AlignedValue, EncodedStateValue } from '@midnightntwrk/ledger-v9';

import { DownConvertFailedError, MerkleNotRehashedError } from '../errors';

/**
 * The subset of the pre-fork (`compact-runtime@0.16` / onchain-runtime-v3)
 * `StateValue` statics {@link downConvertForExecution} needs. Injected rather
 * than imported directly so callers can target a specific WASM instance
 * (e.g. a differently-bundled copy of onchain-runtime-v3), and so tests can
 * substitute a controlled fake to exercise the safety net below.
 */
export interface CompactRuntime016StateValue {
  readonly newArray: () => StateValue;
  readonly newMap: (map: StateMap) => StateValue;
  readonly newBoundedMerkleTree: (tree: StateBoundedMerkleTree) => StateValue;
  readonly decode: (value: EncodedStateValue) => StateValue;
}

/** The pre-fork runtime surface {@link downConvertForExecution} bridges into. */
export interface CompactRuntime016 {
  readonly StateValue: CompactRuntime016StateValue;
  readonly ChargedState: new (state: StateValue) => ChargedState;
}

/**
 * The result of a down-convert: only the primary state data a pre-fork
 * circuit reads during execution. Deliberately not a full pre-fork
 * `ContractState` — execution never reads `.operations`, `.maintenanceAuthority`,
 * or `.balance`, so this down-convert does not fabricate blank defaults for
 * them.
 */
export interface DownConvertedState {
  readonly data: ChargedState;
}

/**
 * Rehashes every bounded Merkle tree in a `StateValue` tree, recursing
 * through `array`/`map` and passing `cell`/`null` through unchanged.
 *
 * A bounded Merkle tree only has a readable root once every node hash has
 * been computed; a tree built or updated without a subsequent `rehash()`
 * reports an `undefined` root (see {@link checkRoot}). Rehashing here is
 * unconditional and idempotent — a no-op on a tree that is already fully
 * hashed — so it is safe defense-in-depth against any tree
 * {@link downConvertForExecution} carries over not yet having its hashes
 * computed, regardless of the underlying runtime version's exact
 * encode/decode behaviour. This walk is contract-agnostic: it recurses the
 * generic `StateValue` algebra, not any one contract's schema.
 *
 * The non-null assertions below (`asBoundedMerkleTree()!`, `asMap()!`,
 * `asArray()!`, `m.get(key)!`) are each guarded by the preceding `type()` (or
 * `keys()`) call that guarantees the corresponding accessor is defined —
 * an onchain-runtime-v3 invariant, not a type-system guarantee, and not one
 * a real fixture can violate (there is no way to construct a `StateValue`
 * that fails it without corrupting the WASM's own internal state).
 */
const rehashStateValue = (SV: CompactRuntime016StateValue, sv: StateValue): StateValue => {
  switch (sv.type()) {
    case 'boundedMerkleTree':
      return SV.newBoundedMerkleTree(sv.asBoundedMerkleTree()!.rehash());
    case 'array':
      return sv.asArray()!.reduce<StateValue>((out, child) => out.arrayPush(rehashStateValue(SV, child)), SV.newArray());
    case 'map': {
      const map = sv.asMap()!;
      const rehashed = map.keys().reduce((m, key) => m.insert(key, rehashStateValue(SV, m.get(key)!)), map);
      return SV.newMap(rehashed);
    }
    default:
      return sv;
  }
};

/**
 * Reads a bounded Merkle tree's root, failing fast with
 * {@link MerkleNotRehashedError} instead of returning `undefined` when the
 * tree has not (yet) been rehashed.
 */
export const checkRoot = (tree: StateBoundedMerkleTree): AlignedValue => {
  const root = tree.root();
  if (root === undefined) {
    throw new MerkleNotRehashedError();
  }
  return root;
};

/**
 * Down-converts an already-extracted (post-fork) {@link EncodedStateValue}
 * into the pre-fork {@link DownConvertedState} a v8-era circuit executes
 * against, decoding it through `runtime016` and rehashing every bounded
 * Merkle tree it contains.
 *
 * Never returns a silently empty or partial state: a `runtime016.StateValue.decode`
 * failure, or a decode that silently loses non-null source data, is wrapped
 * in a {@link DownConvertFailedError} with `{ cause }`.
 */
export const downConvertForExecution = (state: EncodedStateValue, runtime016: CompactRuntime016): DownConvertedState => {
  let decoded: StateValue;
  try {
    decoded = runtime016.StateValue.decode(state);
  } catch (cause) {
    throw new DownConvertFailedError('v9 state down-convert', cause);
  }

  if (state.tag !== 'null' && decoded.type() === 'null') {
    throw new DownConvertFailedError(
      'v9 state down-convert',
      new Error(`decoded StateValue lost its data: source tag '${state.tag}' decoded to 'null'`)
    );
  }

  const rehashed = rehashStateValue(runtime016.StateValue, decoded);
  return { data: new runtime016.ChargedState(rehashed) };
};
