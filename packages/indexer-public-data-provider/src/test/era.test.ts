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

import { UnknownProtocolVersionError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import { resolveReadEra } from '../era';
import { EraUnresolvableError, IndexerError } from '../errors';

function getThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw, but it returned');
}

describe('resolveReadEra', () => {
  it.each([
    ['the bottom of the node 2.x range', 2_000_000, 'v9'],
    ['a patch release inside it', 2_001_003, 'v9'],
    ['the bottom of the node 1.x range', 1_000_000, 'v8'],
    ['a patch release inside it', 1_002_003, 'v8']
  ])('resolves %s to the %s era', (_label, protocolVersion, expected) => {
    const era = resolveReadEra({ protocolVersion }, 'watchForTxData');

    expect(era).toBe(expected);
  });

  // The point of deriving the discriminant rather than hardcoding it: the era
  // a record is decoded and tagged with comes from the record itself, so a
  // record from either era is decoded by the runtime that wrote it instead of
  // being stamped with whichever era the code happened to be written for.
  it('never answers the same era for records from different networks', () => {
    const older = resolveReadEra({ protocolVersion: 1_000_000 }, 'watchForTxData');
    const newer = resolveReadEra({ protocolVersion: 2_000_000 }, 'watchForTxData');

    expect(older).not.toBe(newer);
  });

  // The resolver in `midnight-js-protocol` maps only node majors 1 and 2, so a
  // 0.x network — which the indexer itself does map — is an unknown era here
  // rather than a supported one. That fail-closed choice surfaces through this
  // helper, re-reported as an IndexerError.
  describe('a protocolVersion that maps to no era at all', () => {
    it.each([
      ['a 0.x network', 22_001],
      ['a major beyond the mapped range', 3_000_000],
      ['a negative value', -1],
      ['a non-integer', 1.5],
      // The one malformed case a real network actually produces: schema drift
      // or a partial GraphQL response leaving the field absent.
      ['a missing protocolVersion', undefined as unknown as number],
      ['a null protocolVersion', null as unknown as number]
    ])('reports %s as an unresolvable era rather than guessing one', (_label, protocolVersion) => {
      const error = getThrown(() => resolveReadEra({ protocolVersion }, 'watchForTxData'));

      expect(error).toBeInstanceOf(EraUnresolvableError);
      expect(hasErrorCode(error, PROVIDER_ERROR_CODES.ERA_UNRESOLVABLE)).toBe(true);
      expect((error as EraUnresolvableError).seam).toBe('watchForTxData');
    });

    it('names the record, so one of several concurrent watches can be identified', () => {
      const error = getThrown(() => resolveReadEra({ protocolVersion: 22_001 }, 'watchForTxData', 'txId 0xabc'));

      expect((error as EraUnresolvableError).recordRef).toBe('txId 0xabc');
      expect((error as Error).message).toContain('txId 0xabc');
    });

    it('preserves the resolver error on cause rather than discarding it', () => {
      const error = getThrown(() => resolveReadEra({ protocolVersion: 22_001 }, 'watchForTxData'));

      expect((error as Error).cause).toBeInstanceOf(UnknownProtocolVersionError);
    });

    // The package documents "catch any indexer error with a single
    // `instanceof IndexerError` check". Before this was wrapped, an unmapped
    // network was the one read-path failure that escaped that contract.
    it('reaches consumers through the IndexerError hierarchy', () => {
      const error = getThrown(() => resolveReadEra({ protocolVersion: 22_001 }, 'watchForTxData'));

      expect(error).toBeInstanceOf(IndexerError);
    });
  });
});
