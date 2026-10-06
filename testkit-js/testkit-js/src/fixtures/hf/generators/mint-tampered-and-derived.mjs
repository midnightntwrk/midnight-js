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

// Mints the four byte-level tamper/derived negatives from the two golden
// envelopes (state-v8-v6-envelope.hex, tag `contract-state[v6]`; and
// state-migrated-v9.hex, tag `contract-state[v8]`). None of these are states a
// real chain could ever produce -- each is a documented, reproducible byte
// surgery on a real golden, built to probe a single failure mode. See
// README.md "Tampered fixtures" for the offsets and the expected outcome of
// feeding each one to ledger-v8 / ledger-v9's ContractState.deserialize.

import { asciiPrefix, readHexFixture, writeHexFixture } from './lib.mjs';

const TAG_MARKER = '[v';

// Locate the single ASCII version digit inside a `...[vN]:...` envelope tag
// and return its byte offset. Throws (rather than guessing) if the marker is
// missing, so a change to the tag format upstream breaks this loudly instead
// of silently tampering the wrong byte.
const versionDigitOffset = (bytes) => {
  const ascii = Buffer.from(bytes.slice(0, 40)).toString('latin1');
  const markerIndex = ascii.indexOf(TAG_MARKER);
  if (markerIndex === -1) {
    throw new Error(`envelope tag marker '${TAG_MARKER}' not found in first 40 bytes: ${asciiPrefix(bytes, 40)}`);
  }
  return markerIndex + TAG_MARKER.length;
};

// Swap ONLY the single ASCII version digit inside the envelope tag, leaving
// every payload byte untouched. Length-preserving (a single ASCII digit for
// digit), so the result is the same size as the source. This produces a blob
// that DECLARES the opposite schema version while still carrying the
// original version's payload underneath -- the keyset/schema mis-dispatch
// shape this fixture pair exists to probe.
const swapVersionDigit = (bytes, expected, replacement) => {
  const offset = versionDigitOffset(bytes);
  const out = Uint8Array.from(bytes);
  const actual = String.fromCharCode(out[offset]);
  if (actual !== expected) {
    throw new Error(`expected version digit '${expected}' at offset ${offset}, found '${actual}'`);
  }
  out[offset] = replacement.charCodeAt(0);
  return { bytes: out, offset };
};

export const run = () => {
  const v6 = readHexFixture('state-v8-v6-envelope.hex');
  const v8 = readHexFixture('state-migrated-v9.hex');

  // state-tampered-keyset-v8to9.hex: a v6-schema (ledger-v8-era) payload
  // wearing the v9-schema (v8) tag.
  const v8to9 = swapVersionDigit(v6, '6', '8');
  console.log(`[tampered-keyset-v8to9] offset=${v8to9.offset} '6'->'8' bytes=${v8to9.bytes.length}`);
  writeHexFixture('state-tampered-keyset-v8to9.hex', v8to9.bytes);

  // state-tampered-keyset-v9to8.hex: a v8-schema (migrated, ledger-v9) payload
  // wearing the v6-schema (ledger-v8/0.16) tag.
  const v9to8 = swapVersionDigit(v8, '8', '6');
  console.log(`[tampered-keyset-v9to8] offset=${v9to8.offset} '8'->'6' bytes=${v9to8.bytes.length}`);
  writeHexFixture('state-tampered-keyset-v9to8.hex', v9to8.bytes);

  // state-tampered-bytes.hex: a correctly-tagged migrated-v9 envelope with a
  // single payload byte bit-flipped well past the header, at a fixed
  // documented offset (headerLen + 32). Tests structural payload corruption
  // that survives the tag check.
  const tamperedBytes = Uint8Array.from(v8);
  const payloadOffset = versionDigitOffset(v8) + 32;
  tamperedBytes[payloadOffset] ^= 0xff;
  console.log(`[tampered-bytes] offset=${payloadOffset} bit-flip bytes=${tamperedBytes.length}`);
  writeHexFixture('state-tampered-bytes.hex', tamperedBytes);

  // state-both-keys.hex: the v6 and v8 golden envelopes concatenated back to
  // back -- a single blob carrying BOTH schema tags. Not a producible on-chain
  // state; probes whether a decoder over-reads past its own envelope boundary
  // instead of stopping (or throwing) at the first complete message.
  const bothKeys = Buffer.concat([Buffer.from(v6), Buffer.from(v8)]);
  console.log(`[both-keys] bytes=${bothKeys.length} (v6=${v6.length} + v8=${v8.length})`);
  writeHexFixture('state-both-keys.hex', bothKeys);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
