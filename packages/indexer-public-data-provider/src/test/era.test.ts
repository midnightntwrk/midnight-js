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

import { requireV9Era } from '../era';
import { EraUnsupportedError } from '../errors';

function getThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the call to throw, but it returned');
}

describe('requireV9Era', () => {
  it('resolves a node 2.x record to the v9 era', () => {
    expect(requireV9Era({ protocolVersion: 2_000_000 }, 'watchForTxData')).toBe('v9');
    expect(requireV9Era({ protocolVersion: 2_001_003 }, 'watchForTxData')).toBe('v9');
  });

  // The point of deriving the discriminant rather than hardcoding it: a record
  // from a v8-era network is reported here, naming the era and the network,
  // instead of being stamped `version: 'v9'` and failing later inside the
  // v9-only deserializer with no mention of the era.
  describe('a record from an era this provider cannot decode', () => {
    it('rejects a node 1.x record with the registered unsupported-era code', () => {
      const thrown = (): void => {
        requireV9Era({ protocolVersion: 1_000_000 }, 'watchForTxData');
      };

      expect(thrown).toThrow(EraUnsupportedError);
      const error = getThrown(thrown);
      expect(hasErrorCode(error, PROVIDER_ERROR_CODES.ERA_UNSUPPORTED)).toBe(true);
    });

    it('carries the era, the raw protocolVersion and the seam', () => {
      const error = getThrown(() => requireV9Era({ protocolVersion: 1_002_003 }, 'watchForDeployTxData'));

      expect(error).toBeInstanceOf(EraUnsupportedError);
      const eraError = error as EraUnsupportedError;
      expect(eraError.era).toBe('v8');
      expect(eraError.protocolVersion).toBe(1_002_003);
      expect(eraError.seam).toBe('watchForDeployTxData');
    });
  });

  // The resolver in `midnight-js-protocol` maps only node majors 1 and 2, so a
  // 0.x network — which the indexer itself does map — is an unknown era here
  // rather than a supported one. That fail-closed choice surfaces through this
  // helper unchanged.
  it.each([
    ['a 0.x network', 22_001],
    ['a major beyond the mapped range', 3_000_000],
    ['a negative value', -1],
    ['a non-integer', 1.5]
  ])('propagates the resolver error for %s rather than guessing an era', (_label, protocolVersion) => {
    expect(() => requireV9Era({ protocolVersion }, 'watchForTxData')).toThrow(UnknownProtocolVersionError);
  });
});
