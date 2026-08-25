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

import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import { describe, expect, it } from 'vitest';

import { ComposeFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import { aggregateUnshieldedOffers, extractUserAddressedOutputs } from '../lib/era/unshielded';

const EMPTY_EFFECTS: ledgerV9.Effects = {
  claimedNullifiers: [],
  claimedShieldedReceives: [],
  claimedShieldedSpends: [],
  claimedContractCalls: [],
  shieldedMints: new Map(),
  unshieldedMints: new Map(),
  unshieldedInputs: new Map(),
  unshieldedOutputs: new Map(),
  claimedUnshieldedSpends: new Map()
};

// A `Transcript` is a plain record in the ledger's declared algebra, so a
// realistic one can be built here without running a circuit.
const transcriptWithSpends = (
  spends: readonly (readonly [[ledgerV9.TokenType, ledgerV9.PublicAddress], bigint])[]
): ledgerV9.Transcript<ledgerV9.AlignedValue> => ({
  gas: { readTime: 0n, computeTime: 0n, bytesWritten: 0n, bytesDeleted: 0n },
  effects: { ...EMPTY_EFFECTS, claimedUnshieldedSpends: new Map(spends) },
  program: []
});

const USER = ledgerV9.sampleUserAddress();
const OTHER_USER = ledgerV9.sampleUserAddress();
const CONTRACT = ledgerV9.sampleContractAddress();
const TOKEN = ledgerV9.sampleRawTokenType();

const userSpend = (
  owner: string,
  value: bigint
): readonly [[ledgerV9.TokenType, ledgerV9.PublicAddress], bigint] => [
  [
    { tag: 'unshielded', raw: TOKEN },
    { tag: 'user', address: owner }
  ],
  value
];

describe('extractUserAddressedOutputs', () => {
  // The two composition legs both reach for a segment that may not exist. An
  // absent transcript is the normal shape of a call with no fallible half, not
  // an error, so it must produce no outputs rather than throw.
  it('reads no outputs from an absent transcript', () => {
    expect(extractUserAddressedOutputs(undefined, 'v9', 'increment')).toEqual([]);
  });

  // A contract-addressed spend is settled between contracts and never paid out
  // to a UTXO, so it is skipped rather than emitted: an output the transaction
  // cannot cover unbalances it, and the node rejects the whole thing.
  it('keeps the user-addressed spends and skips the contract-addressed ones', () => {
    const transcript = transcriptWithSpends([
      userSpend(USER, 42n),
      [
        [
          { tag: 'unshielded', raw: TOKEN },
          { tag: 'contract', address: CONTRACT }
        ],
        7n
      ]
    ]);

    const outputs = extractUserAddressedOutputs(transcript, 'v9', 'increment');

    expect(outputs).toEqual([{ value: 42n, owner: USER, type: TOKEN }]);
  });

  // Dust is the case that is REFUSED rather than skipped. The claim names a
  // user and there is no raw token type to pay them in, so dropping it would
  // compose a transaction telling the user they were paid while paying nothing.
  it('refuses a user-addressed dust spend rather than dropping the payout', () => {
    const transcript = transcriptWithSpends([[[{ tag: 'dust' }, { tag: 'user', address: USER }], 9n]]);

    let caught: unknown;
    try {
      extractUserAddressedOutputs(transcript, 'v9', 'increment');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ComposeFailedError);
    expect(caught).toMatchObject({
      code: PROTOCOL_ERROR_CODES.COMPOSE_FAILED,
      stage: 'call-dust-payout',
      version: 'v9',
      circuitId: 'increment'
    });
  });
});

describe('aggregateUnshieldedOffers', () => {
  // A user-addressed output can be produced by ANY call in the tree, not just
  // the root, and the transaction carries a single offer per segment. Building
  // the offer from the root call alone would drop a callee's payout and leave
  // the transaction unbalanced.
  it('spans every call in the tree rather than only the root', () => {
    const callee = { circuitId: 'callee', guaranteed: transcriptWithSpends([userSpend(OTHER_USER, 5n)]) };
    const middle = { circuitId: 'middle' };
    const root = { circuitId: 'increment', guaranteed: transcriptWithSpends([userSpend(USER, 11n)]) };

    const offers = aggregateUnshieldedOffers([callee, middle, root], ledgerV9, 'v9');

    expect(offers.guaranteed?.outputs).toEqual([
      { value: 5n, owner: OTHER_USER, type: TOKEN },
      { value: 11n, owner: USER, type: TOKEN }
    ]);
    expect(offers.fallible).toBeUndefined();
  });

  it('keeps the two segments apart', () => {
    const call = {
      circuitId: 'increment',
      guaranteed: transcriptWithSpends([userSpend(USER, 1n)]),
      fallible: transcriptWithSpends([userSpend(OTHER_USER, 2n)])
    };

    const offers = aggregateUnshieldedOffers([call], ledgerV9, 'v9');

    expect(offers.guaranteed?.outputs).toEqual([{ value: 1n, owner: USER, type: TOKEN }]);
    expect(offers.fallible?.outputs).toEqual([{ value: 2n, owner: OTHER_USER, type: TOKEN }]);
  });

  // An empty offer is not the same as no offer: attaching one would declare a
  // segment that pays out nothing, where the ledger expects the field left
  // unset entirely.
  it('produces no offer at all for a segment with nothing to pay out', () => {
    const offers = aggregateUnshieldedOffers([{ circuitId: 'increment', guaranteed: transcriptWithSpends([]) }], ledgerV9, 'v9');

    expect(offers.guaranteed).toBeUndefined();
    expect(offers.fallible).toBeUndefined();
  });
});
