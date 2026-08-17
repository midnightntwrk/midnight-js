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

  it('rejects non-integers and negatives', () => {
    expect(() => protocolVersionToLedger(1.5)).toThrow(UnknownProtocolVersionError);
    expect(() => protocolVersionToLedger(-1)).toThrow(UnknownProtocolVersionError);
  });

  it('names the int and the supported set in the message', () => {
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/3000000/);
    expect(() => protocolVersionToLedger(3_000_000)).toThrow(/v8.*v9|supported/i);
  });
});

describe('sourcing helpers', () => {
  it('versionOfRecord uses the read path code', () => {
    try {
      versionOfRecord({ protocolVersion: 9_000_000 });
      expect.fail('expected versionOfRecord to throw UnknownProtocolVersionError');
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownProtocolVersionError);
      expect((e as UnknownProtocolVersionError).code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ);
    }
  });

  it('networkHeadVersion queries the source exactly once and uses the construct code', async () => {
    const source = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(2_000_000) };
    await expect(networkHeadVersion(source)).resolves.toBe('v9');
    expect(source.queryLatestProtocolVersion).toHaveBeenCalledTimes(1);
    const bad = { queryLatestProtocolVersion: vi.fn().mockResolvedValue(9_000_000) };
    await expect(networkHeadVersion(bad)).rejects.toMatchObject({
      code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT
    });
  });
});

describe('LEDGER_VERSIONS', () => {
  it('is exactly the closed two-version set', () => {
    expect([...LEDGER_VERSIONS].sort()).toEqual(['v8', 'v9']);
  });
});
