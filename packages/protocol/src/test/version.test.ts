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

import { describe, expect, it, vi } from 'vitest';

import { PROTOCOL_ERROR_CODES, UnknownProtocolVersionError } from '../errors';
import { LEDGER_VERSIONS, networkHeadVersion, protocolVersionToLedger, versionOfRecord } from '../version';

describe('protocolVersionToLedger', () => {
  it.each([
    [22_000, 'v8'],
    [22_500, 'v8'], // node 0.22 (major-0 exemption)
    [1_000_000, 'v8'],
    [1_999_000, 'v8'], // node 1.x
    [2_000_000, 'v9'],
    [2_001_000, 'v9'],
    [2_999_000, 'v9'] // node 2.x — unseen-minor regression guard
  ])('maps %i to %s', (int, expected) => {
    expect(protocolVersionToLedger(int)).toBe(expected);
  });

  it.each([[23_000], [0], [21_000], [3_000_000], [4_000_000]])('fails fast on unknown %i', (int) => {
    expect(() => protocolVersionToLedger(int)).toThrow(UnknownProtocolVersionError);
  });

  it('defaults to the construct path and code when called without an explicit path', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT })
    );
  });

  it('names the int in the message for an unknown version', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/3000000/);
  });

  it('mentions v8 in the message for an unknown version', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/v8/);
  });

  it('mentions v9 in the message for an unknown version', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/v9/);
  });

  describe('malformed input', () => {
    it.each([
      ['NaN', Number.NaN],
      ['a fractional number', 1.5],
      ['a negative number', -1]
    ])('reports reason "malformed" for %s, not the unknown-version text', (_name, input) => {
      try {
        protocolVersionToLedger(input);
        expect.fail('expected protocolVersionToLedger to throw UnknownProtocolVersionError');
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownProtocolVersionError);
        const error = e as UnknownProtocolVersionError;
        expect(error.reason).toBe('malformed');
        expect(error.message).toMatch(/malformed/i);
        expect(error.message).not.toMatch(/upgrade midnight-js/);
      }
    });

    it('reports reason "unknown" for a well-formed but unsupported version', () => {
      try {
        protocolVersionToLedger(3_000_000);
        expect.fail('expected protocolVersionToLedger to throw UnknownProtocolVersionError');
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownProtocolVersionError);
        const error = e as UnknownProtocolVersionError;
        expect(error.reason).toBe('unknown');
        expect(error.message).toMatch(/upgrade midnight-js/);
      }
    });
  });
});

describe('sourcing helpers', () => {
  describe('versionOfRecord', () => {
    it.each([
      [{ protocolVersion: 1_000_000 }, 'v8'],
      [{ protocolVersion: 2_000_000 }, 'v9']
    ])('resolves %j to %s', (record, expected) => {
      expect(versionOfRecord(record)).toBe(expected);
    });

    it('uses the read path code on failure', () => {
      try {
        versionOfRecord({ protocolVersion: 9_000_000 });
        expect.fail('expected versionOfRecord to throw UnknownProtocolVersionError');
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownProtocolVersionError);
        expect((e as UnknownProtocolVersionError).code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ);
      }
    });
  });

  describe('networkHeadVersion', () => {
    it('resolves to the mapped ledger version and queries the source exactly once', async () => {
      const source = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(2_000_000) };

      await expect(networkHeadVersion(source)).resolves.toBe('v9');

      expect(source.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    });

    it('rejects with the construct-path code when the source reports an unknown version', async () => {
      const source = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(9_000_000) };

      await expect(networkHeadVersion(source)).rejects.toMatchObject({
        code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT
      });
    });

    it('propagates the source rejection unchanged', async () => {
      const sourceError = new Error('network unreachable');
      const source = { queryLatestProtocolVersion: vi.fn().mockRejectedValue(sourceError) };

      await expect(networkHeadVersion(source)).rejects.toBe(sourceError);
    });
  });
});

describe('LEDGER_VERSIONS', () => {
  it('is exactly the closed two-version set', () => {
    expect([...LEDGER_VERSIONS].sort()).toEqual(['v8', 'v9']);
  });
});
