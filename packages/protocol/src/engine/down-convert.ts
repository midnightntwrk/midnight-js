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
 * `StateValue` statics {@link downConvertForExecution} needs.
 *
 * Injected rather than imported as a value because every pre-fork package
 * must reach this process through `loadLedger8()`'s lazy acquisition path — a
 * value import here would statically link the retained pre-fork WASM into any
 * bundle that reaches this module, which the `dist-laziness` suite forbids.
 * Letting tests substitute a controlled fake is a consequence of that seam,
 * not its purpose.
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
 * circuit reads during execution.
 *
 * Deliberately not a full pre-fork `ContractState`: this bridge produces only
 * the `ChargedState`, so it does not fabricate blank defaults for
 * `.operations`, `.maintenanceAuthority`, or `.balance`. Those remain the
 * caller's to carry — execution receives balances via `CallContext.balance`,
 * not via this state.
 */
export interface DownConvertedState {
  readonly data: ChargedState;
}

/**
 * Structural equality over the `EncodedStateValue` algebra — plain objects,
 * arrays, `Map`s, `Uint8Array`s and primitives.
 *
 * Hand-rolled rather than `node:util`'s `isDeepStrictEqual` because this
 * package also ships to browsers, where `node:util` does not resolve. `Map`s
 * are compared pairwise in iteration order, which is exact here: the runtime
 * emits map entries in a canonical key order, so a value and its re-encoding
 * always iterate identically (pinned by a test over a multi-entry map
 * inserted out of order).
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
  return (
    aKeys.length === Object.keys(bRecord).length && aKeys.every((key) => structurallyEqual(aRecord[key], bRecord[key]))
  );
};

export const checkRoot = (tree: StateBoundedMerkleTree): AlignedValue => {
  const root = tree.root();
  if (root === undefined) {
    throw new MerkleNotRehashedError();
  }
  return root;
};

/**
 * Asserts that every bounded Merkle tree in a `StateValue` tree already has
 * its node hashes computed, recursing through the only two container variants
 * in the algebra (`array` and `map`) and ignoring the leaf variants (`cell`,
 * `null`, and `boundedMerkleTree`'s own contents). Throws
 * {@link MerkleNotRehashedError} (via {@link checkRoot}) on the first tree
 * without a readable root.
 *
 * Fail-fast by design: an `encode()`/`decode()` round trip materializes a
 * tree's hashes on the pinned onchain-runtime-v3/ledger-v9 versions, and
 * every state reaching {@link downConvertForExecution} has crossed one — so a
 * rootless tree here can only mean an upstream programming error, which this
 * surfaces loudly instead of silently repairing. That round-trip behaviour is
 * a vendor property rather than a guarantee, so it is pinned by a test
 * (`materializes the hashes of a tree that was never rehashed`) that fails if
 * a vendor bump changes it.
 *
 * Does not mutate or rebuild the state, unlike the rehash-on-decode this
 * replaced. It is not allocation-free: each `asArray()`/`asMap()` step
 * marshals fresh wrapper objects out of WASM.
 *
 * The non-null assertions below are guarded by the preceding `type()` call:
 * the `as*` accessors return `undefined` only on a variant mismatch, which
 * the switch has already excluded. `map.get(key)` is likewise asserted
 * because a key marshalled out by `keys()` resolves back through `get()`.
 * Both are observed behaviour of onchain-runtime-v3 rather than
 * vendor-documented invariants — the vendor's own types are not authoritative
 * about definedness here (`asCell()` is declared non-optional yet returns
 * `undefined` for a `null` state value) — so they are pinned by tests over a
 * multi-entry map rather than by prose alone.
 */
export const assertMerkleTreesRehashed = (sv: StateValue): void => {
  switch (sv.type()) {
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
  }
};

/** The `StateValue` variants {@link assertMerkleTreesRehashed} handles. */
type HandledStateValueVariant = 'boundedMerkleTree' | 'array' | 'map' | 'cell' | 'null';

// Compile-time-only guard, in the style of version.ts's
// `_allLedgerVersionsAreMapped`: if a vendor bump adds a StateValue variant,
// this assignment stops type-checking. Without it a new *container* variant
// would fall out of the switch above and silently skip every Merkle tree
// nested inside it — the exact silent-wrong-data outcome this module exists
// to prevent.
const _allStateValueVariantsHandled: Exclude<
  ReturnType<StateValue['type']>,
  HandledStateValueVariant
> extends never
  ? true
  : never = true;

/**
 * Down-converts an already-extracted (post-fork) {@link EncodedStateValue}
 * into the pre-fork {@link DownConvertedState} a v8-era circuit executes
 * against, decoding it through `ledger8Runtime` and asserting (via
 * {@link assertMerkleTreesRehashed}) that every bounded Merkle tree it
 * contains already has its hashes computed.
 *
 * Never returns a silently empty or partial state. Every failure leaves as a
 * {@link DownConvertFailedError} carrying `{ cause }`, or a
 * {@link MerkleNotRehashedError} — including failures from the Merkle walk
 * and from `ChargedState` construction, so no uncoded error escapes a seam
 * whose whole contract is code-based discrimination.
 *
 * Structural integrity is checked by re-encoding the decoded value and
 * comparing it to the input, which catches every loss mode at every depth (a
 * shortened array, a dropped map entry, a changed cell, a substituted
 * subtree) rather than only a wholesale collapse to `null`. This costs one
 * extra encode plus a deep comparison per call, and it is deliberate: the
 * alternative is a bridge that can hand a circuit silently wrong data.
 */
export const downConvertForExecution = (
  state: EncodedStateValue,
  ledger8Runtime: Ledger8CompactRuntime
): DownConvertedState => {
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
