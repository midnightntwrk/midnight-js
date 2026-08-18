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
// The brief calls this a "co.v2-only" blob: a foreign artifact that is NOT a
// ContractState at all, fed to code that expects one. Rather than a wrong
// *version* of the right schema (the tamper fixtures above), this is the
// WRONG SCHEMA entirely, so it must fail at the first tag check no matter
// which contract-state version a caller expects.
//
// Minted from `@midnightntwrk/ledger-v8`'s `ContractOperation` (envelope tag
// `midnight:contract-operation[v4]:`), keyed with the twin contract's own
// `increment` verifier key (../twin-contract/compiled/keys/increment.verifier
// -- "different key material" from either golden ContractState, per the
// brief). ledger-v8 was used deliberately: the 0.16-era `contract-operation`
// tag (which the brief's "co.v2" label points at) requires the
// compact-runtime-0.16 / onchain-runtime-v3 stack, which is not installed
// here (see README.md "Mint-path decisions" -- root `resolutions` pins
// @midnight-ntwrk/compact-runtime to 0.18.0-rc.1, in conflict with the 0.16.0
// pin this stack needs). ContractOperation[v4] is a different top-level
// schema than ContractState under EVERY installed decoder here, which is the
// property this fixture exists to exercise -- ledger-v9's own
// ContractOperation is tag [v6], confirming the schema (not just the version)
// differs from any ContractState envelope.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ContractOperation } from '@midnightntwrk/ledger-v8';
import { asciiPrefix, FIXTURES_DIR, writeHexFixture } from './lib.mjs';

const VERIFIER_KEY_PATH = resolve(FIXTURES_DIR, 'twin-contract/compiled/keys/increment.verifier');

export const run = () => {
  const verifierKey = new Uint8Array(readFileSync(VERIFIER_KEY_PATH));
  const op = new ContractOperation();
  op.verifierKey = verifierKey;
  const bytes = op.serialize();

  console.log(`[co-v2-only-foreign] tag=${asciiPrefix(bytes, 33)} bytes=${bytes.length}`);

  writeHexFixture('state-co-v2-only-foreign.hex', bytes);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
