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

import { describe, expect, it } from 'vitest';

import * as contracts from '../contracts';
import type {
  LedgerVersion,
  ProtocolVersionSource,
  ProtocolVersionUnknownReason,
  VersionedRecord,
  VersionResolutionPath
} from '../index';
import * as midnightJs from '../index';
import * as networkId from '../network-id';
import * as types from '../types';
import * as utils from '../utils';

// The barrel's published surface, asserted by strict equality below: a name
// added here without a matching export -- or exported without being listed --
// fails the test. That equality is what keeps a provider package, or any other
// unintended re-export, off the barrel.
//
// Runtime names only. The five type-only exports (`LedgerVersion`,
// `ProtocolVersionSource`, `VersionedRecord`, `VersionResolutionPath`,
// `ProtocolVersionUnknownReason`) never appear in `Object.keys`; each is
// instead load-bearing in a type annotation below, so `typecheck:tests:core`
// fails if the barrel drops one.
const EXPECTED_BARREL_EXPORTS = [
  'LEDGER_VERSIONS',
  'PROTOCOL_ERROR_CODES',
  'UnknownProtocolVersionError',
  'contracts',
  'networkHeadVersion',
  'networkId',
  'protocolVersionToLedger',
  'types',
  'utils',
  'versionOfRecord'
];

// Returns what `run` threw. Throws itself when `run` returns instead, so a
// test that stops throwing fails loudly rather than asserting on `undefined`.
const captureThrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw, but it returned normally');
};

describe('barrel exports', () => {
  it('should export contracts namespace', () => {
    expect(midnightJs.contracts).toBeDefined();
    expect(typeof midnightJs.contracts).toBe('object');
  });

  it('should export networkId namespace', () => {
    expect(midnightJs.networkId).toBeDefined();
    expect(typeof midnightJs.networkId.setNetworkId).toBe('function');
    expect(typeof midnightJs.networkId.getNetworkId).toBe('function');
  });

  it('should export types namespace', () => {
    expect(midnightJs.types).toBeDefined();
    expect(typeof midnightJs.types).toBe('object');
  });

  it('should export utils namespace', () => {
    expect(midnightJs.utils).toBeDefined();
    expect(typeof midnightJs.utils).toBe('object');
  });

  it('should export exactly the published surface, and nothing else', () => {
    expect(Object.keys(midnightJs).sort()).toEqual([...EXPECTED_BARREL_EXPORTS].sort());
  });
});

describe('ledger version vocabulary', () => {
  it('should export the closed set of ledger versions', () => {
    const eras: readonly LedgerVersion[] = midnightJs.LEDGER_VERSIONS;
    expect(eras).toEqual(['v8', 'v9']);
  });

  it('should map a raw protocolVersion onto its ledger era', () => {
    expect(midnightJs.protocolVersionToLedger(1_000_000)).toBe('v8');
    expect(midnightJs.protocolVersionToLedger(2_000_000)).toBe('v9');
  });

  it('should resolve the era a record was written under', () => {
    const record: VersionedRecord = { protocolVersion: 1_000_000 };
    expect(midnightJs.versionOfRecord(record)).toBe('v8');
  });

  it('should resolve the era at the network head', async () => {
    const source: ProtocolVersionSource = { queryLatestProtocolVersion: () => Promise.resolve(2_000_000) };
    await expect(midnightJs.networkHeadVersion(source)).resolves.toBe('v9');
  });
});

describe('ledger version failures', () => {
  it('should let a caller tell the read path from the construct path by code', () => {
    const fromRead = captureThrown(() => midnightJs.versionOfRecord({ protocolVersion: 9_000_000 }));
    const fromConstruct = captureThrown(() => midnightJs.protocolVersionToLedger(9_000_000));

    expect(
      midnightJs.utils.hasErrorCode(fromRead, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(fromConstruct, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT)
    ).toBe(true);
    // Both negatives are load-bearing, not decoration. `hasErrorCode(e, code)`
    // falls back to "carries any registered code" when `code` is `undefined`,
    // so a positive assertion alone would still pass if the member it names
    // vanished. Each member therefore appears once expected true and once
    // expected false, which no `undefined` can satisfy at the same time.
    expect(
      midnightJs.utils.hasErrorCode(fromRead, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT)
    ).toBe(false);
    expect(
      midnightJs.utils.hasErrorCode(fromConstruct, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)
    ).toBe(false);
  });

  it('should throw the error class the barrel publishes, carrying the path and reason', () => {
    const thrown = captureThrown(() => midnightJs.protocolVersionToLedger(1.5));
    expect(thrown).toBeInstanceOf(midnightJs.UnknownProtocolVersionError);
    // Narrows without a cast, and only succeeds if the class the barrel
    // publishes is the same module instance the thrown error was built from.
    if (!(thrown instanceof midnightJs.UnknownProtocolVersionError)) {
      throw new Error(`expected an UnknownProtocolVersionError, got ${String(thrown)}`);
    }

    const path: VersionResolutionPath = thrown.path;
    const reason: ProtocolVersionUnknownReason = thrown.reason;
    expect(path).toBe('construct');
    expect(reason).toBe('malformed');
  });
});

describe('sub-path exports', () => {
  it('should export contracts sub-path with same members as namespace', () => {
    expect(contracts).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.contracts).sort();
    const subpathKeys = Object.keys(contracts).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export network-id sub-path with same members as namespace', () => {
    expect(networkId).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.networkId).sort();
    const subpathKeys = Object.keys(networkId).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export types sub-path with same members as namespace', () => {
    expect(types).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.types).sort();
    const subpathKeys = Object.keys(types).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });

  it('should export utils sub-path with same members as namespace', () => {
    expect(utils).toBeDefined();
    const namespaceKeys = Object.keys(midnightJs.utils).sort();
    const subpathKeys = Object.keys(utils).sort();
    expect(subpathKeys).toEqual(namespaceKeys);
  });
});
