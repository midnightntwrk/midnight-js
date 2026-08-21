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

// Mints state-co-v2-only-foreign.hex -- the A4 mis-dispatch negative.
//
// Fix round 1 (Critical): the first attempt minted a BARE `ContractOperation`
// and fed it where a `ContractState` was expected -- that fails at the
// envelope-tag check on the very first byte, so it could never reach the
// down-convert/execute code path this fixture exists to test. This version
// mints a full, well-formed `ContractState` that deserializes cleanly on
// ledger-v9 (same envelope tag as the other migrated fixtures), whose
// registered `increment` operation slot carries a FOREIGN verifier key --
// so the mis-dispatch only surfaces later, deterministically, when execution
// actually tries to use that slot (a typed key mismatch), not at decode time.
//
// "Foreign" here means genuinely NOT built from the retained counter
// artifacts: the key is borrowed from the real migrated golden
// (state-migrated-v9.hex)'s own `post` operation -- bboard's real,
// pre-fork-compiled, migrated verifier key (DECISIONS.md: "copies the
// pre-fork contract's verifier key `source.v2 -> op.v2`"). `ContractOperation`
// exposes only its plain, unversioned `verifierKey` (the .d.ts: "Only the
// latest available version is exposed to this API") -- the pre-migration,
// single-key-slot shape DECISIONS.md calls `op.v2`, as opposed to the
// fork-era multi-version `ContractOperationVersion('v3'|'v4')`/
// `ContractOperationVersionedVerifierKey` scheme. That single-slot key is what
// this fixture borrows and re-registers under the counter's own circuit
// name ("increment"), on an otherwise-blank ContractState.

import { ContractState, ChargedState, StateValue } from '@midnightntwrk/ledger-v9';
import { asciiPrefix, readHexFixture, writeHexFixture } from './lib.mjs';

const FOREIGN_SOURCE_OPERATION = 'post'; // a real op.v2-vintage bboard circuit, foreign to counter
const TARGET_OPERATION = 'increment'; // counter's own (only) circuit name

export const run = () => {
  const goldenState = ContractState.deserialize(readHexFixture('state-migrated-v9.hex'));
  const foreignOp = goldenState.operation(FOREIGN_SOURCE_OPERATION);
  if (foreignOp === undefined) {
    throw new Error(`state-migrated-v9.hex has no '${FOREIGN_SOURCE_OPERATION}' operation to borrow`);
  }

  const state = new ContractState();
  state.data = new ChargedState(StateValue.newNull());
  state.setOperation(TARGET_OPERATION, foreignOp);
  const bytes = state.serialize();

  // Verify the shape this fixture exists to prove, before writing it: a
  // clean round-trip, with the foreign key intact under the counter's own
  // operation name.
  const roundTrip = ContractState.deserialize(bytes);
  const registered = roundTrip.operation(TARGET_OPERATION);
  if (registered === undefined) {
    throw new Error('round-trip lost the foreign operation registration');
  }
  if (!Buffer.from(registered.verifierKey).equals(Buffer.from(foreignOp.verifierKey))) {
    throw new Error('round-trip corrupted the foreign verifier key');
  }

  console.log(
    `[co-v2-only-foreign] tag=${asciiPrefix(bytes, 29)} bytes=${bytes.length} ` +
      `operation='${TARGET_OPERATION}' (borrowed from '${FOREIGN_SOURCE_OPERATION}') ` +
      `verifierKeyLength=${registered.verifierKey.length}`
  );

  writeHexFixture('state-co-v2-only-foreign.hex', bytes);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
