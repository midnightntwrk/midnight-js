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

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { hasErrorCode, PROVIDER_ERROR_CODES } from '@midnight-ntwrk/midnight-js-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as codec from '../codec';
import { EraUnresolvableError, EraUnsupportedError } from '../errors';
import type { RegularTransaction } from '../gen/schema-types';
import { toFinalizedDeployTxData } from '../mapping';

// `parseHexTransaction` deserializes with the v9-only ledger runtime and needs
// real transaction bytes. It is stubbed so these tests can use a fixture that
// varies only in `protocolVersion` — and so the spy can prove the era check
// runs *before* the decoder, which is the property that makes a v8-era record
// surface as a named era error instead of a codec failure.
//
// Declared via `vi.hoisted` because `vi.mock`'s factory is hoisted above the
// imports, so a plain `const` here would be in the temporal dead zone when the
// factory runs.
const { parseHexTransaction } = vi.hoisted(() => ({ parseHexTransaction: vi.fn(() => 'decoded-v9-tx') }));

vi.mock('../codec', async (importOriginal) => ({
  ...(await importOriginal<typeof codec>()),
  parseHexTransaction
}));

// Node major 2 -> the v9 ledger era; node major 1 -> v8; 22_xxx is a 0.x
// network, which this framework deliberately does not map.
const V9_PROTOCOL_VERSION = 2_000_000;
const V8_PROTOCOL_VERSION = 1_000_000;
const UNMAPPED_PROTOCOL_VERSION = 22_001;

const CONTRACT_ADDRESS = '0200deadbeef' as ContractAddress;

const transactionAt = (protocolVersion: number): RegularTransaction =>
  ({
    hash: 'tx-hash',
    identifiers: ['id-1'],
    block: { height: 1, hash: 'block-hash', author: null, timestamp: 0 },
    raw: '00',
    id: 1,
    protocolVersion,
    fees: { estimatedFees: '0', paidFees: '0' },
    transactionResult: { status: 'SUCCESS' as const, segments: null },
    // One action at the address under test, so `correlateDeployTxId` finds
    // the identifier at the matching positional index and the v9 path runs to
    // completion. The era failures below never reach it.
    contractActions: [{ address: CONTRACT_ADDRESS }],
    unshieldedCreatedOutputs: [],
    unshieldedSpentOutputs: []
  }) as unknown as RegularTransaction;

beforeEach(() => {
  parseHexTransaction.mockClear();
});

// `requireV9Era` is tested in isolation in era.test.ts. What these tests pin is
// the *wiring*: that the record-building path actually calls it and uses what
// it returns. Without them, replacing the call with a hardcoded
// `version: 'v9'` passes the whole suite — which is precisely the mislabelling
// the derived discriminant exists to prevent.
describe('toFinalizedDeployTxData era wiring', () => {
  it('derives the version from the record rather than stamping a literal', () => {
    const record = toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V9_PROTOCOL_VERSION));

    expect(record.version).toBe('v9');
    expect(record.protocolVersion).toBe(V9_PROTOCOL_VERSION);
  });

  it('rejects a v8-era record instead of labelling it v9', () => {
    const thrown = (): unknown => toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V8_PROTOCOL_VERSION));

    expect(thrown).toThrow(EraUnsupportedError);
  });

  it('names the era, the raw protocolVersion, the seam and the contract address', () => {
    let error: unknown;
    try {
      toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V8_PROTOCOL_VERSION));
    } catch (caught: unknown) {
      error = caught;
    }

    expect(hasErrorCode(error, PROVIDER_ERROR_CODES.ERA_UNSUPPORTED)).toBe(true);
    const eraError = error as EraUnsupportedError;
    expect(eraError.era).toBe('v8');
    expect(eraError.protocolVersion).toBe(V8_PROTOCOL_VERSION);
    expect(eraError.seam).toBe('watchForDeployTxData');
    expect(eraError.recordRef).toContain(CONTRACT_ADDRESS);
  });

  // The guarantee the whole design rests on: a record from an era this
  // provider cannot decode never reaches the v9-only deserializer, so the
  // failure names the era instead of surfacing from inside the codec.
  it('fails before the v9-only decoder runs', () => {
    expect(() => toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V8_PROTOCOL_VERSION))).toThrow();

    expect(parseHexTransaction).not.toHaveBeenCalled();
  });

  it('decodes only once the era has been confirmed', () => {
    toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V9_PROTOCOL_VERSION));

    expect(parseHexTransaction).toHaveBeenCalledTimes(1);
  });

  it('reports an unmapped protocolVersion as an unresolvable era, without decoding', () => {
    const thrown = (): unknown => toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(UNMAPPED_PROTOCOL_VERSION));

    expect(thrown).toThrow(EraUnresolvableError);
    expect(parseHexTransaction).not.toHaveBeenCalled();
  });
});
