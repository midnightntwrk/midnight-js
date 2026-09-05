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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as codec from '../codec';
import { EraUnresolvableError } from '../errors';
import type { RegularTransaction } from '../gen/schema-types';
import { toFinalizedDeployTxData, toFinalizedTxData } from '../mapping';

// The era dispatcher is stubbed so these tests can use a fixture that varies
// only in `protocolVersion`, with no real transaction bytes and no ledger
// runtime involved. What the stub makes observable is the one thing a real
// decode would hide: WHICH era the record-building path asked the decoder for.
//
// Declared via `vi.hoisted` because `vi.mock`'s factory is hoisted above the
// imports, so a plain `const` here would be in the temporal dead zone when the
// factory runs.
const { decodeVersionedTransaction } = vi.hoisted(() => ({
  decodeVersionedTransaction: vi.fn(() => Promise.resolve({ version: 'v9', tx: 'decoded-tx' }))
}));

vi.mock('../codec', async (importOriginal) => ({
  ...(await importOriginal<typeof codec>()),
  decodeVersionedTransaction
}));

// Node major 2 -> the v9 ledger era; node major 1 -> v8; 22_xxx is a 0.x
// network, which this framework deliberately does not map.
const V9_PROTOCOL_VERSION = 2_000_000;
const V8_PROTOCOL_VERSION = 1_000_000;
const UNMAPPED_PROTOCOL_VERSION = 22_001;

const CONTRACT_ADDRESS = '0200deadbeef' as ContractAddress;
const TX_ID = 'id-1';
const RAW = '00';

const transactionAt = (protocolVersion: number): RegularTransaction & { hash: string; identifiers: string[] } =>
  ({
    hash: 'tx-hash',
    identifiers: [TX_ID],
    block: { height: 1, hash: 'block-hash', author: null, timestamp: 0 },
    raw: RAW,
    id: 1,
    protocolVersion,
    fees: { estimatedFees: '0', paidFees: '0' },
    transactionResult: { status: 'SUCCESS' as const, segments: null },
    // One action at the address under test, so `correlateDeployTxId` finds
    // the identifier at the matching positional index and the record is built
    // to completion. The era failure below never reaches it.
    contractActions: [{ address: CONTRACT_ADDRESS }],
    unshieldedCreatedOutputs: [],
    unshieldedSpentOutputs: []
  }) as unknown as RegularTransaction & { hash: string; identifiers: string[] };

beforeEach(() => {
  decodeVersionedTransaction.mockClear();
});

// `resolveReadEra` is tested in isolation in era.test.ts, and the decoders in
// dual-decode.test.ts. What these tests pin is the *wiring*: that the
// record-building path resolves the era from the record and dispatches the
// decode on exactly that answer. Without them, hardcoding `'v9'` at the
// dispatch passes both other suites — which is precisely the mislabelling the
// derived discriminant exists to prevent.
describe('finalized-record era wiring', () => {
  it.each([
    ['v9', V9_PROTOCOL_VERSION],
    ['v8', V8_PROTOCOL_VERSION]
  ])('dispatches the decode on the %s era the record itself reports', async (era, protocolVersion) => {
    await toFinalizedTxData(TX_ID, transactionAt(protocolVersion));

    expect(decodeVersionedTransaction).toHaveBeenCalledTimes(1);
    expect(decodeVersionedTransaction).toHaveBeenCalledWith(RAW, era, {
      seam: 'watchForTxData',
      protocolVersion,
      recordRef: `txId ${TX_ID}`
    });
  });

  it('names the deploy seam and the contract address on the deploy path', async () => {
    await toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(V8_PROTOCOL_VERSION));

    expect(decodeVersionedTransaction).toHaveBeenCalledWith(RAW, 'v8', {
      seam: 'watchForDeployTxData',
      protocolVersion: V8_PROTOCOL_VERSION,
      recordRef: `contractAddress ${CONTRACT_ADDRESS}`
    });
  });

  it('carries the decoded transaction and its era straight onto the record', async () => {
    const record = await toFinalizedTxData(TX_ID, transactionAt(V9_PROTOCOL_VERSION));

    expect(record.version).toBe('v9');
    expect(record.protocolVersion).toBe(V9_PROTOCOL_VERSION);
  });

  // The guarantee the whole design rests on: which runtime reads the bytes is
  // settled before any decoder is reached, so a record this client cannot place
  // on the era timeline never reaches one at all.
  it.each([
    ['watchForTxData', () => toFinalizedTxData(TX_ID, transactionAt(UNMAPPED_PROTOCOL_VERSION))],
    ['watchForDeployTxData', () => toFinalizedDeployTxData(CONTRACT_ADDRESS, transactionAt(UNMAPPED_PROTOCOL_VERSION))]
  ])('refuses an unmapped protocolVersion on %s before any decoder runs', async (_seam, read) => {
    await expect(read()).rejects.toThrow(EraUnresolvableError);

    expect(decodeVersionedTransaction).not.toHaveBeenCalled();
  });
});
