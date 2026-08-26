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

import { DownConvertFailedError, MerkleNotRehashedError } from '../../errors';
import type { Ledger8ContractState } from '../era/envelope';

/**
 * The subset of the pre-fork onchain-runtime-v3 `StateValue` statics
 * {@link downConvertForExecution} needs.
 *
 * Injected rather than imported as a value: a value import here would
 * statically link the retained pre-fork WASM into any bundle that reaches this
 * module. The pre-fork packages reach this process through a lazy acquisition
 * path the caller owns.
 *
 * The `dist-laziness` suite is the intended enforcement, but it does not reach
 * this module: it walks the eager static closure of `dist/index.js`, and the
 * only value import of this file is `lib/v8/engine.ts`, which no eager entry
 * reaches — so it is bundled into `dist/engine.js` instead. Covering it needs a
 * second closure walk rooted at that chunk, not a new build entry: the `./engine`
 * build entry it would have waited for already exists (`src/engine.ts`).
 * Contrast the note on `Ledger8ContractState` in `envelope.ts`, which IS inside
 * the eager closure because the root barrel re-exports `lib/era/load-era.ts`.
 */
export interface Ledger8CompactRuntimeStateValue {
  readonly decode: (value: EncodedStateValue) => StateValue;
}

/**
 * The pre-fork runtime surface {@link downConvertForExecution} bridges into.
 *
 * `ContractState` is here to pin the *era*, not because this module calls it.
 * `StateValue.decode` and `new ChargedState(...)` are structurally identical
 * across the fork — that identity is what makes the bridge possible, and it is
 * asserted directly by the wire-shape drift detectors in
 * `v8-down-convert.test.ts`. So neither member can tell a pre-fork runtime
 * from a post-fork one, and without a third member this interface is satisfied
 * by onchain-runtime-v4 and by `compact-runtime` (which re-exports it) — both
 * public barrel exports of this very package. A caller reaching for the wrong
 * one gets no error: decode and re-encode then use the same post-fork codec, so
 * the structural comparison passes, the Merkle walk passes, and a v4
 * `ChargedState` is returned typed as a v3 one, to surface later as an opaque
 * wasm-bindgen rejection deep inside execution.
 *
 * `ContractState` closes that, because its `query()` returns a `GatherResult`
 * whose `log` variant gained fields after the fork. That divergence is
 * incidental to this bridge, so it is pinned by a compile-time negative
 * assertion (`_PostForkOnchainRuntimeIsRejected`) rather than trusted: a vendor
 * bump that realigned the two shapes would otherwise silently reopen the hole.
 */
export interface Ledger8CompactRuntime {
  readonly ContractState: Ledger8ContractState;
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
 * Hand-rolled rather than `node:util`'s `isDeepStrictEqual`, which does not
 * resolve in a browser bundle. `Map`s are compared pairwise in iteration
 * order, deliberately: both runtimes emit map entries in a deterministic,
 * insertion-order-independent order that the two of them agree on, so a value
 * and its re-encoding iterate identically whatever order the entries were
 * inserted in. Note that order is not ascending by key — it is a canonical
 * hash order, so do not reason about it as sorted. That agreement is a
 * cross-runtime property, not a single-codec one — the source encoding comes
 * from ledger-v9 and the re-encoding from onchain-runtime-v3 — so it is pinned
 * by tests that build the two sides with the two different codecs, not only by
 * the same-codec round trip.
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
  // `key in bRecord`, not just a matching key count: without it two objects
  // that share no key at all compare equal whenever the diverging key's value
  // in `a` is `undefined`, because both lookups then read `undefined` and
  // short-circuit. No *record* in today's algebra holds an undefined-valued
  // field — the one `undefined` it contains is the second slot of a
  // boundedMerkleTree leaf tuple (`[Uint8Array, undefined]`), which arrives
  // through the array branch above and never reaches this comparison. So this
  // guards against a record gaining one rather than fixing a live defect.
  //
  // It is a partial guard, not a total one: `bRecord` is a plain object, so
  // `in` also succeeds for every `Object.prototype` member. Keys in the pinned
  // algebra are only `tag`/`content`/`value`/`alignment`/`length`, none of them
  // inherited, so the hole is unreachable today — but `Object.hasOwn` would
  // close it outright and is the right move the moment this helper is used on
  // anything wider.
  return (
    aKeys.length === Object.keys(bRecord).length &&
    aKeys.every((key) => key in bRecord && structurallyEqual(aRecord[key], bRecord[key]))
  );
};

/**
 * Reads a bounded Merkle tree's root, failing with
 * {@link MerkleNotRehashedError} when the tree has not been rehashed.
 *
 * Three shapes of "no root" are treated alike, because all three mean the same
 * thing to a caller and only one is in the vendor's type: `undefined` (what
 * the typings document), `null` (what a `None` can serialize to), and a throw
 * — the wasm-bindgen shim for `root()` rethrows a Rust `Err` rather than
 * always resolving to a value. Letting that throw escape would demote it to a
 * generic down-convert failure and tell the caller to check its envelope bytes
 * when the actual remediation is to rehash the tree.
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
 * Does not mutate or rebuild the state. It is not allocation-free: each
 * `asArray()`/`asMap()` step marshals fresh wrapper objects out of WASM.
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
      // Compile-time exhaustiveness, in the style of version.ts's
      // `_allLedgerVersionsAreMapped`: a vendor bump that adds a variant stops
      // this assignment type-checking, so the omission is a build failure
      // rather than a review miss.
      //
      // The runtime throw is not redundant with it. The `StateValue` reaching
      // this walk comes from a caller-injected runtime, whose WASM can emit a
      // tag the pinned `.d.ts` does not declare — and these declarations are
      // known to be unfaithful (see the `asCell()` note below). Returning
      // `void` on an unrecognised variant would skip every Merkle tree nested
      // inside it without a word, which is the exact silent-wrong-data
      // outcome this module exists to prevent.
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
 * Never returns a silently empty or partial state. Every failure leaves as a
 * {@link DownConvertFailedError} carrying `{ cause }`, or a
 * {@link MerkleNotRehashedError} — including failures from the Merkle walk
 * and from `ChargedState` construction, so no uncoded error escapes a seam
 * whose whole contract is code-based discrimination.
 *
 * Structural integrity is checked by re-encoding the decoded value and
 * comparing it to the input, which catches loss at every depth (a shortened
 * array, a dropped map entry, a changed cell, a substituted subtree) rather
 * than only a wholesale collapse to `null`. This costs one extra encode plus a
 * deep comparison per call, and it is deliberate: the alternative is a bridge
 * that can hand a circuit silently wrong data.
 *
 * What it does not cover: anything the pre-fork encoder re-derives rather than
 * carries. A bounded Merkle tree encodes as its height and leaves, never its
 * node hashes, so a tree whose internal hashes were re-materialized
 * differently across the fork boundary still re-encodes byte-identically here.
 * {@link assertMerkleTreesRehashed} establishes only that each tree has a
 * readable root, not that the root matches the source's. Comparing roots
 * across the boundary needs the source-side tree, which this function never
 * sees — it belongs at the envelope seam.
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
