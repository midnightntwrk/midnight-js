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

import type { ChargedState, StateBoundedMerkleTree, StateValue } from '@midnight-ntwrk/onchain-runtime-v3';
import type { AlignedValue, EncodedStateValue } from '@midnightntwrk/ledger-v9';

import { DownConvertFailedError, MerkleNotRehashedError } from '../errors';

/**
 * The subset of the pre-fork (`compact-runtime@0.16` / onchain-runtime-v3)
 * `StateValue` statics {@link downConvertForExecution} needs. Injected rather
 * than imported directly so callers can target a specific WASM instance
 * (e.g. a differently-bundled copy of onchain-runtime-v3), and so tests can
 * substitute a controlled fake to exercise the safety net below.
 */
export interface Ledger8CompactRuntimeStateValue {
  readonly decode: (value: EncodedStateValue) => StateValue;
}

/** The pre-fork runtime surface {@link downConvertForExecution} bridges into. */
export interface Ledger8CompactRuntime {
  readonly StateValue: Ledger8CompactRuntimeStateValue;
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
 * Asserts that every bounded Merkle tree in a `StateValue` tree already has
 * its node hashes computed, recursing through `array`/`map` and passing
 * `cell`/`null` through unchanged. A read-only walk — nothing is copied or
 * rebuilt — that throws {@link MerkleNotRehashedError} (via {@link checkRoot})
 * on the first tree without a readable root.
 *
 * Fail-fast by design: on the pinned onchain-runtime-v3/ledger-v9 versions an
 * `encode()`/`decode()` round trip already materializes a tree's hashes
 * (verified empirically), and every state reaching
 * {@link downConvertForExecution} has crossed one — so a rootless tree here
 * can only mean an upstream programming error (an in-memory tree that was
 * never rehashed), which this surfaces loudly instead of silently repairing.
 * The walk is contract-agnostic: it recurses the generic `StateValue`
 * algebra, not any one contract's schema.
 *
 * The non-null assertions below (`asBoundedMerkleTree()!`, `asMap()!`,
 * `asArray()!`, `map.get(key)!`) are each guarded by the preceding `type()`
 * (or `keys()`) call that guarantees the corresponding accessor is defined —
 * an onchain-runtime-v3 invariant, not a type-system guarantee, and not one
 * a real fixture can violate (there is no way to construct a `StateValue`
 * that fails it without corrupting the WASM's own internal state).
 *
 * Exported (in addition to {@link downConvertForExecution}) so tests can
 * exercise this recursion directly against an in-memory tree that has never
 * been through an `encode()`/`decode()` round trip — the only way to build a
 * genuinely rootless tree on the pinned versions.
 */
export const assertMerkleTreesRehashed = (sv: StateValue): void => {
  switch (sv.type()) {
    case 'boundedMerkleTree':
      checkRoot(sv.asBoundedMerkleTree()!);
      return;
    case 'array':
      sv.asArray()!.forEach(assertMerkleTreesRehashed);
      return;
    case 'map': {
      const map = sv.asMap()!;
      map.keys().forEach((key) => assertMerkleTreesRehashed(map.get(key)!));
      return;
    }
    default:
      return;
  }
};

/**
 * Down-converts an already-extracted (post-fork) {@link EncodedStateValue}
 * into the pre-fork {@link DownConvertedState} a v8-era circuit executes
 * against, decoding it through `ledger8Runtime` and asserting (via
 * {@link assertMerkleTreesRehashed}) that every bounded Merkle tree it
 * contains already has its hashes computed.
 *
 * Never returns a silently empty or partial state: a `ledger8Runtime.StateValue.decode`
 * failure, or a decode that silently loses non-null source data, is wrapped
 * in a {@link DownConvertFailedError} with `{ cause }`; a decoded tree
 * without a readable root throws {@link MerkleNotRehashedError}.
 */
export const downConvertForExecution = (state: EncodedStateValue, ledger8Runtime: Ledger8CompactRuntime): DownConvertedState => {
  let decoded: StateValue;
  try {
    decoded = ledger8Runtime.StateValue.decode(state);
  } catch (cause) {
    throw new DownConvertFailedError('v9 state down-convert', cause);
  }

  if (state.tag !== 'null' && decoded.type() === 'null') {
    throw new DownConvertFailedError(
      'v9 state down-convert',
      new Error(`decoded StateValue lost its data: source tag '${state.tag}' decoded to 'null'`)
    );
  }

  assertMerkleTreesRehashed(decoded);
  return { data: new ledger8Runtime.ChargedState(decoded) };
};
