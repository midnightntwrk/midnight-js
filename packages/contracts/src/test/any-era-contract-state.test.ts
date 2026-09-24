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

import type * as protocol from '@midnight-ntwrk/midnight-js-protocol';
import type { LedgerEra, LedgerVersion } from '@midnight-ntwrk/midnight-js-protocol';
import { TagParseError } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAnyEraContractState } from '../get-states';
import {
  BBOARD_ENTRY_POINTS,
  CURRENT_ENVELOPE,
  POST_FORK_PROTOCOL_VERSION,
  PRE_FORK_PROTOCOL_VERSION,
  RETAINED_ENVELOPE,
  surfaceServing,
  surfaceServingNothing
} from './any-era-fixtures';
import { createMockContractAddress } from './test-mocks';

// `loadLedgerEra` is the one door to either era's decoder, so which era it is ASKED for is the
// whole of this function's dispatch. Spied here rather than deeper: `loadLedger8` is called from
// inside protocol's own module and a mocked export cannot observe it, and whether an acquired era
// is memoised afterwards is `loadLedgerEra`'s documented property, not this function's.
//
// The spy delegates to the real implementation, so every decoding assertion below runs against
// real runtimes.
const { loadLedgerEraSpy } = vi.hoisted(() => ({
  loadLedgerEraSpy: vi.fn<(version: LedgerVersion) => Promise<LedgerEra>>()
}));

vi.mock('@midnight-ntwrk/midnight-js-protocol', async (importOriginal) => {
  const original = await importOriginal<typeof protocol>();
  loadLedgerEraSpy.mockImplementation(original.loadLedgerEra);
  return { ...original, loadLedgerEra: loadLedgerEraSpy };
});

/** The eras `loadLedgerEra` was asked for during one test, in call order. */
const erasRequested = (): LedgerVersion[] => loadLedgerEraSpy.mock.calls.map(([version]) => version);

describe('getAnyEraContractState: one decoded read that spans both ledger eras', () => {
  const contractAddress = createMockContractAddress();

  beforeEach(() => {
    loadLedgerEraSpy.mockClear();
  });

  it('decodes a current-era state served under a current-era block', async () => {
    // Arrange.
    const surface = surfaceServing(CURRENT_ENVELOPE, POST_FORK_PROTOCOL_VERSION);

    // Act.
    const read = await getAnyEraContractState(surface, contractAddress);

    // Assert.
    expect(read?.envelopeVersion).toBe<LedgerVersion>('v9');
    expect(read?.protocolVersion).toBe(POST_FORK_PROTOCOL_VERSION);
    expect(read?.entryPoints.map((entryPoint) => entryPoint.circuitId)).toEqual(BBOARD_ENTRY_POINTS);
    // The retained era is never asked for. A consumer on a forked chain reads current-era states
    // almost exclusively and must not pay for the retained runtime on every one of them.
    expect(erasRequested()).toEqual<LedgerVersion[]>(['v9']);
  });

  it('decodes a retained-era state served under a retained-era block', async () => {
    // Arrange.
    const surface = surfaceServing(RETAINED_ENVELOPE, PRE_FORK_PROTOCOL_VERSION);

    // Act.
    const read = await getAnyEraContractState(surface, contractAddress);

    // Assert.
    expect(read?.envelopeVersion).toBe<LedgerVersion>('v8');
    expect(read?.protocolVersion).toBe(PRE_FORK_PROTOCOL_VERSION);
    expect(read?.entryPoints.map((entryPoint) => entryPoint.circuitId)).toEqual(BBOARD_ENTRY_POINTS);
    expect(erasRequested()).toEqual<LedgerVersion[]>(['v8']);
  });

  it('decodes a retained-era state served under a POST-fork block', async () => {
    // THE CASE THIS FUNCTION EXISTS FOR, and the one every current-era-only reader
    // fails: the fork does not rewrite a contract's stored state, and the indexer
    // serves the last contract action at or before the requested block. A contract
    // deployed before the boundary and not yet written to therefore keeps its
    // retained envelope under a post-fork head, indefinitely.
    //
    // The two signals disagree here ON PURPOSE. The record's `version` says 'v9',
    // because it is derived from `protocolVersion` and documents itself as a
    // statement about the BLOCK. The envelope says 'v8', because that is what wrote
    // the bytes. Reading the first is what makes a reader refuse this state; reading
    // the second is the whole of the fix.

    // Arrange.
    const surface = surfaceServing(RETAINED_ENVELOPE, POST_FORK_PROTOCOL_VERSION);

    // Act.
    const read = await getAnyEraContractState(surface, contractAddress);

    // Assert.
    expect(read?.envelopeVersion).toBe<LedgerVersion>('v8');
    expect(read?.protocolVersion).toBe(POST_FORK_PROTOCOL_VERSION);
    expect(read?.entryPoints.map((entryPoint) => entryPoint.circuitId)).toEqual(BBOARD_ENTRY_POINTS);
    // THE dispatch assertion of this file: the era comes from the bytes, so the post-fork block
    // dating this read never reaches the decoder. A reader that answered from the block would ask
    // for 'v9' here and refuse the state.
    expect(erasRequested()).toEqual<LedgerVersion[]>(['v8']);
  });

  it('reads the same contract to the same entry points on either side of the fork', async () => {
    // The two fixtures are one contract, migrated. A reader that silently decoded the
    // retained envelope with the current era -- or answered from the block rather than
    // the bytes -- could still satisfy each test above on its own; only comparing the
    // two reads establishes that the retained arm returns the contract's real content
    // rather than something merely well-formed.

    // Arrange / Act.
    const retained = await getAnyEraContractState(
      surfaceServing(RETAINED_ENVELOPE, PRE_FORK_PROTOCOL_VERSION),
      contractAddress
    );
    const current = await getAnyEraContractState(
      surfaceServing(CURRENT_ENVELOPE, POST_FORK_PROTOCOL_VERSION),
      contractAddress
    );

    // Assert: the verifier-key HASHES, not the keys -- the migration carries the keys
    // across unchanged, and the hash is the comparison the framework itself makes.
    expect(retained?.entryPoints.map((entryPoint) => entryPoint.verifierKeyHash)).toEqual(
      current?.entryPoints.map((entryPoint) => entryPoint.verifierKeyHash)
    );
  });

  it('hands back the served bytes unchanged, envelope included', async () => {
    // The bytes are what a caller needs to reach anything this function does not
    // decode -- the balance and the maintenance authority among them. Returning a
    // copy that had been through a decoder would make that unreachable.

    // Arrange.
    const surface = surfaceServing(RETAINED_ENVELOPE, POST_FORK_PROTOCOL_VERSION);

    // Act.
    const read = await getAnyEraContractState(surface, contractAddress);

    // Assert.
    expect(read?.raw).toEqual(RETAINED_ENVELOPE);
  });

  it('answers null for an address no contract is deployed at', async () => {
    // Arrange.
    const surface = surfaceServingNothing();

    // Act.
    const read = await getAnyEraContractState(surface, contractAddress);

    // Assert: null rather than a throw. An absent contract is an answer, and this
    // reports it the way every other read member of the surface does.
    expect(read).toBeNull();
  });

  it('refuses a payload carrying no contract-state envelope, before reaching a decoder', async () => {
    // Arrange: a well-formed byte string that is not a contract state.
    const surface = surfaceServing(Uint8Array.from({ length: 64 }, (_, index) => index), POST_FORK_PROTOCOL_VERSION);

    // Act / Assert: the tag failure, NOT a deserializer's complaint from inside one
    // era's runtime -- which would name an era the bytes never claimed.
    await expect(getAnyEraContractState(surface, contractAddress)).rejects.toBeInstanceOf(TagParseError);
  });
});
