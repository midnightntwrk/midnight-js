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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { protocolVersionToLedger } from '@midnight-ntwrk/midnight-js-protocol';
import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { vi } from 'vitest';

import type { AnyEraContractStateReadSurface } from '../get-states';

// The shared hard-fork fixture tree, reached by relative path: `testkit-js` depends on
// `midnight-js-contracts`, so a package dependency here would close a workspace cycle.
const FIXTURES_DIR = resolve(
  fileURLToPath(new URL('../../../../', import.meta.url)),
  'testkit-js/testkit-js/src/fixtures/hf'
);

/**
 * Reads one hex golden, refusing a file that is not whole hex.
 *
 * `Buffer.from(text, 'hex')` stops SILENTLY at the first non-hex character, so a truncated or
 * corrupted golden would decode to a short prefix. A positive test would fail loudly on that, but a
 * negative one would pass for the wrong reason -- the decoder refusing a stub rather than refusing
 * the adversarial payload the fixture was minted to be.
 */
const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim();
  const bytes = Uint8Array.from(Buffer.from(text, 'hex'));
  if (bytes.length !== text.length / 2) {
    throw new Error(`fixture '${name}' is not whole hex: ${text.length / 2} bytes expected, ${bytes.length} decoded`);
  }
  return bytes;
};

/**
 * The same contract as the ledger's two eras serve it.
 *
 * Both are goldens ported from the same upstream hard-fork spike, where `state-migrated-v9.hex`
 * was produced by that spike's `migrate-8-to-9` -- see `testkit-js/src/fixtures/hf/README.md:82-84`
 * for each one's provenance. That README does not record that the thing fed to the migration was
 * this exact retained golden, so the pairing is not asserted here; what IS asserted is that the two
 * decode to the same entry points carrying the same verifier-key hashes and the same primary state,
 * which is what the cross-era comparison rests on.
 *
 * Both are around 4.6 KB, small enough that hashing their verifier keys under coverage stays well
 * inside the default timeout.
 */
export const LEDGER8_ENVELOPE = readHexFixture('state-v8.hex');

/** The current-era twin of {@link LEDGER8_ENVELOPE}. */
export const CURRENT_ENVELOPE = readHexFixture('state-migrated-v9.hex');

/**
 * A retained-era tag over a current-era payload: `state-migrated-v9.hex` with the single ASCII
 * digit in its envelope tag flipped.
 *
 * The tag is network-supplied and is what chooses the runtime, so this is the shape a swapped tag
 * takes. The chosen decoder has to fail closed on it.
 */
export const TAG_CLAIMS_LEDGER8 = readHexFixture('state-tampered-keyset-v9to8.hex');

/** A well-formed current-era envelope with one payload byte flipped past the header. */
export const CORRUPTED_PAYLOAD = readHexFixture('state-tampered-bytes.hex');

// The fixture manifest's own scheme: `node-major * 1_000_000 + node-minor * 1_000`.
export const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
export const POST_FORK_PROTOCOL_VERSION = 2_000_000;

/** The entry points both fixtures declare, established against the fixtures themselves. */
export const BBOARD_ENTRY_POINTS = ['takeDown', 'post'];

/**
 * A read surface answering one fixed record, with `version` set from the era of `protocolVersion`
 * rather than from the envelope.
 *
 * On purpose: a provider in this framework tags the record by its envelope, but one outside it may
 * tag it by the block. Tagging by the block here is what lets these tests show that the function
 * under test reads the envelope from the bytes and not the tag.
 */
export const surfaceServing = (raw: Uint8Array, protocolVersion: number): AnyEraContractStateReadSurface => ({
  queryRawContractState: vi.fn<(address: string) => Promise<RawContractState | null>>().mockResolvedValue({
    version: protocolVersionToLedger(protocolVersion, 'read'),
    protocolVersion,
    raw
  })
});

/** A read surface for an address no contract is deployed at. */
export const surfaceServingNothing = (): AnyEraContractStateReadSurface => ({
  queryRawContractState: vi.fn<(address: string) => Promise<RawContractState | null>>().mockResolvedValue(null)
});
