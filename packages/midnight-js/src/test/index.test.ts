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
  ComposeOption,
  ComposeStage,
  LedgerVersion,
  ProtocolVersionSource,
  ProtocolVersionUnknownReason,
  RetainedEraSubpath,
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
// Runtime names only -- a type-only export never appears in `Object.keys`, so
// this list cannot gate one. The eight type-only exports are gated instead by
// the `import type` above: dropping any of them from the barrel makes that
// statement unresolvable, and `typecheck:tests:core` fails. The annotations
// further down assert assignability on top of that.
const EXPECTED_BARREL_EXPORTS = [
  'ComposeFailedError',
  'ComposeOptionError',
  'LEDGER_VERSIONS',
  'Ledger8RuntimeMissingError',
  'PROTOCOL_ERROR_CODES',
  'PayloadNotATransactionError',
  'StateDecodeFailedError',
  'UnknownLedgerVersionError',
  'UnknownProtocolVersionError',
  'contracts',
  'networkHeadVersion',
  'networkId',
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

// The async sibling of `captureThrown`. `networkHeadVersion` is the barrel's
// only construct-path resolver, and it rejects rather than throws.
const captureRejected = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to reject, but it resolved normally');
};

const headSource = (protocolVersion: number): ProtocolVersionSource => ({
  queryLatestProtocolVersion: () => Promise.resolve(protocolVersion)
});

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

  it('should resolve the era a record was written under', () => {
    const record: VersionedRecord = { protocolVersion: 1_000_000 };
    expect(midnightJs.versionOfRecord(record)).toBe('v8');
  });

  it('should resolve the era at the network head', async () => {
    await expect(midnightJs.networkHeadVersion(headSource(2_000_000))).resolves.toBe('v9');
  });
});

describe('ledger version failures', () => {
  it('should let a caller tell the read path from the construct path by code', async () => {
    const fromRead = captureThrown(() => midnightJs.versionOfRecord({ protocolVersion: 9_000_000 }));
    const fromConstruct = await captureRejected(() => midnightJs.networkHeadVersion(headSource(9_000_000)));

    expect(
      midnightJs.utils.hasErrorCode(fromRead, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(fromConstruct, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT)
    ).toBe(true);
    // Both negatives are load-bearing, not decoration. A renamed member is a
    // compile error, but two members that accidentally share one string are
    // not, and `hasErrorCode(e, code)` falls back to "carries any registered
    // code" when `code` is `undefined`. Each member therefore appears once
    // expected true and once expected false, which neither a shared literal
    // nor an `undefined` can satisfy at the same time.
    expect(
      midnightJs.utils.hasErrorCode(fromRead, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT)
    ).toBe(false);
    expect(
      midnightJs.utils.hasErrorCode(fromConstruct, midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ)
    ).toBe(false);
  });

  it('should reject with the error class the barrel publishes, carrying the path and reason', async () => {
    const thrown = await captureRejected(() => midnightJs.networkHeadVersion(headSource(1.5)));
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

  it('should propagate a head-source rejection unchanged', async () => {
    const cause = new Error('indexer unreachable');
    const thrown = await captureRejected(() =>
      midnightJs.networkHeadVersion({ queryLatestProtocolVersion: () => Promise.reject(cause) })
    );

    expect(thrown).toBe(cause);
    expect(thrown).not.toBeInstanceOf(midnightJs.UnknownProtocolVersionError);
  });
});

describe('retained-era error classes', () => {
  // These codes were already reachable through `utils.MIDNIGHT_JS_ERROR_CODES`
  // before the classes were published; what a barrel consumer could not do was
  // `instanceof` the class or read its payload without a cast. Both halves are
  // asserted here, so publishing a code whose class stays behind -- or a class
  // whose payload type stays behind -- fails.
  it('should pair each published error class with its published code', () => {
    expect(
      midnightJs.utils.hasErrorCode(
        new midnightJs.Ledger8RuntimeMissingError('/engine', new Error('resolution failed')),
        midnightJs.PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING
      )
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(
        new midnightJs.ComposeFailedError('v9', 'call-empty', 'increment'),
        midnightJs.PROTOCOL_ERROR_CODES.COMPOSE_FAILED
      )
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(
        new midnightJs.ComposeOptionError('v8', 'ttl'),
        midnightJs.PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID
      )
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(
        new midnightJs.StateDecodeFailedError('v8', new Error('truncated')),
        midnightJs.PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED
      )
    ).toBe(true);
    expect(
      midnightJs.utils.hasErrorCode(
        new midnightJs.UnknownLedgerVersionError('v7'),
        midnightJs.PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION
      )
    ).toBe(true);
    // Built through a static factory, not `new`: the constructor is private,
    // because this one is published to be caught rather than constructed.
    expect(
      midnightJs.utils.hasErrorCode(
        midnightJs.PayloadNotATransactionError.notBytes('not bytes'),
        midnightJs.PROTOCOL_ERROR_CODES.PAYLOAD_NOT_A_TRANSACTION
      )
    ).toBe(true);
  });

  it('should let a caller read each error payload without a cast', () => {
    const subpath: RetainedEraSubpath = new midnightJs.Ledger8RuntimeMissingError('/v8', new Error('boom')).subpath;
    const stage: ComposeStage = new midnightJs.ComposeFailedError('v9', 'call-empty', 'increment').stage;
    const option: ComposeOption = new midnightJs.ComposeOptionError('v8', 'ttl').option;
    const decodedEra: LedgerVersion = new midnightJs.StateDecodeFailedError('v8', new Error('boom')).version;
    const requested: string = new midnightJs.UnknownLedgerVersionError('v7').requestedVersion;

    expect([subpath, stage, option, decodedEra, requested]).toEqual(['/v8', 'call-empty', 'ttl', 'v8', 'v7']);
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
