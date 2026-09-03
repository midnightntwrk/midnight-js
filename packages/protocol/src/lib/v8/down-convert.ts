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

import type * as OnchainRuntimeV3 from '@midnight-ntwrk/onchain-runtime-v3';
import type { AlignedValue, EncodedStateValue } from '@midnightntwrk/ledger-v9';

// Aliases read off the type-only namespace import above, not mirrors -- see
// ModuleGraphAndLazyLoading.
type ChargedState = OnchainRuntimeV3.ChargedState;
type StateBoundedMerkleTree = OnchainRuntimeV3.StateBoundedMerkleTree;
type StateValue = OnchainRuntimeV3.StateValue;

import { DownConvertFailedError, Ledger8RuntimeInvalidError, MerkleNotRehashedError } from '../../errors';
import type { Ledger8ContractState } from '../era/envelope';

/**
 * The subset of the pre-fork onchain-runtime-v3 `StateValue` statics
 * {@link downConvertForExecution} needs.
 *
 * @see {@link InjectedVendorSlices}
 */
export interface Ledger8CompactRuntimeStateValue {
  readonly decode: (typeof OnchainRuntimeV3.StateValue)['decode'];
}

/**
 * The pre-fork runtime surface {@link downConvertForExecution} bridges into.
 *
 * `ContractState` is here to pin the *era*, not because this module calls it:
 * do not drop it as an unused member.
 *
 * @see {@link RetainedEraExecution}
 */
export interface Ledger8CompactRuntime {
  readonly ContractState: Ledger8ContractState;
  readonly StateValue: Ledger8CompactRuntimeStateValue;
  readonly ChargedState: typeof OnchainRuntimeV3.ChargedState;
}

/**
 * The result of a down-convert: only the primary state data a pre-fork
 * circuit reads during execution.
 *
 * Deliberately not a full pre-fork `ContractState`: it carries no
 * `.operations`, `.maintenanceAuthority` or `.balance`, which remain the
 * caller's to carry.
 *
 * @see {@link RetainedEraExecution}
 */
export interface DownConvertedState {
  readonly data: ChargedState;
}

/**
 * Structural equality over the `EncodedStateValue` algebra — plain objects,
 * arrays, `Map`s, `Uint8Array`s and primitives.
 *
 * `Map`s are compared pairwise in iteration order, deliberately, and that order
 * is not ascending by key — do not reason about it as sorted.
 *
 * @param a One value in the algebra.
 * @param b The value to compare it against.
 * @returns `true` when the two are structurally equal.
 * @see {@link RetainedEraExecution}
 */
export const structurallyEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    return (
      a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((byte, i) => byte === b[i])
    );
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) {
      return false;
    }
    const bEntries = Array.from(b);
    return Array.from(a).every(([key, value], i) => {
      const bEntry = bEntries[i];
      return bEntry !== undefined && structurallyEqual(key, bEntry[0]) && structurallyEqual(value, bEntry[1]);
    });
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => structurallyEqual(item, b[i]));
  }

  const aRecord: Record<string, unknown> = { ...a };
  const bRecord: Record<string, unknown> = { ...b };
  const aKeys = Object.keys(aRecord);
  // `key in bRecord`, not just a matching key count, and a partial guard only --
  // see RetainedEraExecution and SharedTableDiscipline.
  return (
    aKeys.length === Object.keys(bRecord).length &&
    aKeys.every((key) => key in bRecord && structurallyEqual(aRecord[key], bRecord[key]))
  );
};

/**
 * Reads a bounded Merkle tree's root, failing with
 * {@link MerkleNotRehashedError} when the tree has not been rehashed.
 *
 * Three shapes of "no root" are treated alike: `undefined`, `null`, and a
 * throw out of the wasm-bindgen shim for `root()`.
 *
 * @param tree The bounded Merkle tree to read.
 * @returns The tree's root.
 * @throws MerkleNotRehashedError If the tree has no readable root, in any of
 *   those three shapes.
 * @see {@link RetainedEraExecution}
 */
export const checkRoot = (tree: StateBoundedMerkleTree): AlignedValue => {
  let root: AlignedValue | undefined;
  try {
    root = tree.root();
  } catch (cause) {
    throw new MerkleNotRehashedError(cause);
  }

  if (root == null) {
    throw new MerkleNotRehashedError();
  }
  return root;
};

/**
 * Asserts that every bounded Merkle tree in a `StateValue` tree already has
 * its node hashes computed, recursing through the only two container variants
 * in the algebra (`array` and `map`) and ignoring the leaf variants (`cell`,
 * `null`, and `boundedMerkleTree`'s own contents).
 *
 * Does not mutate or rebuild the state: a rootless tree is refused, never
 * repaired.
 *
 * @param sv The `StateValue` tree to walk.
 * @throws MerkleNotRehashedError On the first tree without a readable root,
 *   via {@link checkRoot}.
 * @throws DownConvertFailedError If the walk meets a `StateValue` variant the
 *   pinned typings do not declare.
 * @see {@link RetainedEraExecution}
 */
export const assertMerkleTreesRehashed = (sv: StateValue): void => {
  const variant = sv.type();
  switch (variant) {
    case 'boundedMerkleTree':
      checkRoot(sv.asBoundedMerkleTree()!);
      return;
    case 'array':
      sv.asArray()!.forEach((element) => assertMerkleTreesRehashed(element));
      return;
    case 'map': {
      const map = sv.asMap()!;
      map.keys().forEach((key) => assertMerkleTreesRehashed(map.get(key)!));
      return;
    }
    case 'cell':
    case 'null':
      return;
    default: {
      // Compile-time exhaustiveness plus a runtime throw; neither is redundant
      // with the other -- see SharedTableDiscipline.
      const unhandled: never = variant;
      throw new DownConvertFailedError(
        'state down-convert',
        new Error(`unhandled StateValue variant '${String(unhandled)}' in the Merkle rehash walk`)
      );
    }
  }
};

/**
 * Down-converts an already-extracted (post-fork) {@link EncodedStateValue}
 * into the pre-fork {@link DownConvertedState} a v8-era circuit executes
 * against, decoding it through `ledger8Runtime` and asserting (via
 * {@link assertMerkleTreesRehashed}) that every bounded Merkle tree it
 * contains already has its hashes computed.
 *
 * Never returns a silently empty or partial state: every failure leaves as a
 * coded error. Structural integrity is checked by re-encoding the decoded value
 * and comparing it to the input, which costs one extra encode plus a deep
 * comparison per call.
 *
 * `ledger8Runtime` is checked before anything is decoded. Only the two members
 * this function actually calls are checked; `ContractState` is on
 * {@link Ledger8CompactRuntime} to pin the era, and is never dereferenced here.
 *
 * @param state The already-extracted post-fork encoded state value.
 * @param ledger8Runtime The injected pre-fork runtime slice.
 * @returns The pre-fork state a v8-era circuit executes against.
 * @throws Ledger8RuntimeInvalidError If `ledger8Runtime` is missing
 *   `StateValue.decode` or `ChargedState`.
 * @throws DownConvertFailedError If the state cannot be decoded, does not
 *   re-encode to its source, or the Merkle walk meets an undeclared variant —
 *   carrying the underlying failure on `cause`.
 * @throws MerkleNotRehashedError If any bounded Merkle tree in the state has no
 *   readable root.
 * @see {@link RetainedEraExecution}
 * @see {@link FailClosedDecoding}
 */
export const downConvertForExecution = (
  state: EncodedStateValue,
  ledger8Runtime: Ledger8CompactRuntime
): DownConvertedState => {
  if (typeof ledger8Runtime?.StateValue?.decode !== 'function') {
    throw new Ledger8RuntimeInvalidError('StateValue.decode');
  }
  if (typeof ledger8Runtime.ChargedState !== 'function') {
    throw new Ledger8RuntimeInvalidError('ChargedState');
  }

  try {
    const decoded = ledger8Runtime.StateValue.decode(state);

    if (!structurallyEqual(decoded.encode(), state)) {
      throw new DownConvertFailedError(
        'state down-convert',
        new Error(`decoded StateValue did not re-encode to its source (source tag '${state.tag}')`)
      );
    }

    assertMerkleTreesRehashed(decoded);
    return { data: new ledger8Runtime.ChargedState(decoded) };
  } catch (cause) {
    if (cause instanceof DownConvertFailedError || cause instanceof MerkleNotRehashedError) {
      throw cause;
    }
    throw new DownConvertFailedError('state down-convert', cause);
  }
};
