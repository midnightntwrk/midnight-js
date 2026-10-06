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

// Mints state-migrated-v9-merkle.hex.
//
// OQ9 mint-path (a) was checked first: @midnightntwrk/ledger-v9@1.0.0-rc.3's
// public .d.ts exposes no migrate/from_v8/upgrade-from-v8 entry point (only
// `upgradeFromTransient`, an unrelated Zswap-value helper) -- see
// README.md "Mint-path decisions". A REAL migrated tree-bearing state can only
// come out of the spike's Rust simulator (`migrate-8-to-9`), and no island
// committed a small tree-bearing golden (only the large bboard/shielded-hf
// fixtures carry a Merkle tree). Building the simulator was out of scope once
// this synthetic path proved sufficient for the down-convert's actual
// contract-agnostic obligation: rehash every BoundedMerkleTree it finds.
//
// So this fixture is a SYNTHETIC-BUT-SCHEMA-VALID `contract-state[v8]`
// envelope: same outer tag ledger-v9 puts on every real migrated state
// (confirmed against the golden state-migrated-v9.hex), but its StateValue is
// a hand-built BoundedMerkleTree with one leaf -- built entirely from
// @midnightntwrk/ledger-v9's public StateValue/StateBoundedMerkleTree API, no
// compiled contract, no simulator. It is NOT the output of a real 8->9
// migration.
//
// Verified (see generators/.probe.mjs, not committed): ledger-v9's raw byte
// codec is asymmetric -- `serialize()` will happily serialize an UN-rehashed
// tree, but `ContractState.deserialize()` then REJECTS those bytes with "BMT
// must be rehashed". A real on-chain migrated state must therefore already be
// rehashed at the byte level (matching the committed golden
// state-migrated-v9.hex, which deserializes cleanly), so this fixture calls
// `.rehash()` before serializing to stay a realistic, cleanly-deserializable
// input. The hash loss `downcastV9StateForExecution` (downcast.ts:
// rehashStateValue) guards against happens one step LATER, in the
// encode()/decode() POJO bridge it uses to cross the compact-runtime/
// ledger-v9 package boundary -- decode() drops the cached node hashes even
// though the source tree was fully hashed. This fixture proves the byte-level
// envelope is well-formed and deserializes with ledger-v9; the down-convert's
// rehash-after-decode necessity is covered directly against the real golden
// in the smoke test.

import { ContractState, ChargedState, StateValue, StateBoundedMerkleTree } from '@midnightntwrk/ledger-v9';
import { asciiPrefix, writeHexFixture } from './lib.mjs';

const FIELD_ALIGNMENT = [{ tag: 'atom', value: { tag: 'field' } }];

const fieldLeaf = (byte) => ({
  value: [new Uint8Array(32).fill(byte)],
  alignment: FIELD_ALIGNMENT,
});

export const run = () => {
  const tree = new StateBoundedMerkleTree(4).update(0n, fieldLeaf(0x42)).rehash();
  const sv = StateValue.newBoundedMerkleTree(tree);

  const state = new ContractState();
  state.data = new ChargedState(sv);
  const bytes = state.serialize();

  console.log(`[mint-migrated-v9-merkle] tag=${asciiPrefix(bytes, 29)} bytes=${bytes.length} treeHeight=${tree.height} rehashed=true`);

  writeHexFixture('state-migrated-v9-merkle.hex', bytes);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
