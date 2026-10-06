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

// Mints state-v8.hex: the golden 0.16-runtime `contract-state[v6]` envelope
// (state-v8-v6-envelope.hex, ported verbatim from spike-dapp-hf), bridged
// through @midnightntwrk/ledger-v8's ContractState the same way
// spike-dapp-hf/island-3/driver/src/assemble.ts:59-60 bridges a compact-runtime
// ContractState into the ledger-8 native type:
//
//   const toLedgerContractStateV8 = (cs) => LedgerContractStateV8.deserialize(cs.serialize());
//
// Here the input is already serialized bytes (the golden), so the bridge is
// just deserialize -> serialize. This is cheap (pure npm path, no compact-
// runtime/0.16 stack needed) because ledger-v8's ContractState codec accepts
// the v6-tagged envelope unchanged -- see README.md "Finding" note.

import { ContractState as LedgerContractStateV8 } from '@midnightntwrk/ledger-v8';
import { asciiPrefix, readHexFixture, writeHexFixture } from './lib.mjs';

export const run = () => {
  const v6Bytes = readHexFixture('state-v8-v6-envelope.hex');
  const bridged = LedgerContractStateV8.deserialize(v6Bytes);
  const v8Bytes = bridged.serialize();

  const identical = Buffer.from(v6Bytes).equals(Buffer.from(v8Bytes));
  console.log(`[mint-state-v8] tag=${asciiPrefix(v8Bytes, 29)} bytes=${v8Bytes.length} identical-to-v6-source=${identical}`);

  writeHexFixture('state-v8.hex', v8Bytes);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
