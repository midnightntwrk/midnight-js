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

import type { RawContractState } from '@midnight-ntwrk/midnight-js-types';
import { vi } from 'vitest';

import type { AnyEraContractStateReadSurface } from '../get-states';

// The shared hard-fork fixture tree, reached by relative path: `testkit-js` depends on
// `midnight-js-contracts`, so a package dependency here would close a workspace cycle.
const FIXTURES_DIR = resolve(
  fileURLToPath(new URL('../../../../', import.meta.url)),
  'testkit-js/testkit-js/src/fixtures/hf'
);

const readHexFixture = (name: string): Uint8Array =>
  Uint8Array.from(Buffer.from(readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim(), 'hex'));

/**
 * ONE contract on both sides of the fork, not two unrelated states.
 *
 * `state-migrated-v9.hex` is `state-v8.hex` put through a real ledger-8-to-9 migration, so the two
 * decode to the same entry points carrying the same verifier-key hashes -- which is what lets a
 * cross-era comparison be an assertion rather than a coincidence. Both are around 4.6 KB, small
 * enough that hashing their verifier keys under coverage stays well inside the default timeout.
 */
export const RETAINED_ENVELOPE = readHexFixture('state-v8.hex');

/** The current-era twin of {@link RETAINED_ENVELOPE}. */
export const CURRENT_ENVELOPE = readHexFixture('state-migrated-v9.hex');

// The fixture manifest's own scheme: `node-major * 1_000_000 + node-minor * 1_000`.
export const PRE_FORK_PROTOCOL_VERSION = 1_000_000;
export const POST_FORK_PROTOCOL_VERSION = 2_000_000;

/** The entry points both fixtures declare, established against the fixtures themselves. */
export const BBOARD_ENTRY_POINTS = ['takeDown', 'post'];

/**
 * A read surface answering one fixed record, with `version` derived from `protocolVersion` exactly
 * as a provider derives it.
 *
 * Derived rather than passed in, because a stub that let the two be set independently could express
 * a record no provider can produce -- and the disagreement these tests are about is between
 * `protocolVersion` and the ENVELOPE, never between `protocolVersion` and `version`.
 */
export const surfaceServing = (raw: Uint8Array, protocolVersion: number): AnyEraContractStateReadSurface => ({
  queryRawContractState: vi.fn<() => Promise<RawContractState | null>>().mockResolvedValue({
    version: protocolVersion < POST_FORK_PROTOCOL_VERSION ? 'v8' : 'v9',
    protocolVersion,
    raw
  })
});

/** A read surface for an address no contract is deployed at. */
export const surfaceServingNothing = (): AnyEraContractStateReadSurface => ({
  queryRawContractState: vi.fn<() => Promise<RawContractState | null>>().mockResolvedValue(null)
});
