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

import { loadLedger8Protocol } from '@midnight-ntwrk/midnight-js-protocol';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/v9';
import {
  ledgerVersionOfLedgerParameters,
  parseSerializedTag,
  toHex
} from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, test } from 'vitest';

import {
  mintLedger8LedgerParametersBytes,
  mintLedger8ZswapChainStateBytes,
  mintLedger9LedgerParametersBytes,
  mintLedger9ZswapChainStateBytes
} from './state-fixtures';

const tagOf = (bytes: Uint8Array): string => parseSerializedTag(bytes).tag;

// ---------------------------------------------------------------------------
// What the two runtimes actually write. Everything the parameters path does
// rests on these four facts, so they are measured against real minted bytes
// rather than assumed from the shape of the contract-state family.
// ---------------------------------------------------------------------------

describe('the ledger parameters each runtime writes', () => {
  test('the retained era writes the envelope this client maps onto v8', async () => {
    const bytes = await mintLedger8LedgerParametersBytes();

    expect(tagOf(bytes)).toBe('midnight:ledger-parameters[v5]');
    expect(ledgerVersionOfLedgerParameters(bytes)).toBe('v8');
  });

  test('the current era writes the envelope this client maps onto v9', () => {
    const bytes = mintLedger9LedgerParametersBytes();

    expect(tagOf(bytes)).toBe('midnight:ledger-parameters[v8]');
    expect(ledgerVersionOfLedgerParameters(bytes)).toBe('v9');
  });

  test('neither era can read the other era’s parameters', async () => {
    const v8 = await loadLedger8Protocol();
    const ledger8Bytes = await mintLedger8LedgerParametersBytes();
    const ledger9Bytes = mintLedger9LedgerParametersBytes();

    // Both directions, and matched on the message rather than a class: the runtimes throw a plain
    // `Error`, so `.toThrow(Error)` would also pass for a fixture mistake that never reached a
    // deserializer at all. The message is the only evidence that the refusal is on the HEADER TAG,
    // before any body is read -- which is why dating the bytes first turns an unclassified decoder
    // failure into a decision.
    expect(() => ledger.LedgerParameters.deserialize(ledger8Bytes)).toThrow(/expected header tag/);
    expect(() => v8.LedgerParameters.deserialize(ledger9Bytes)).toThrow(/expected header tag/);
  });
});

// ---------------------------------------------------------------------------
// The zswap chain state, by contrast, is NOT era-tagged. This is the measured
// reason the third field of the triple gets no dating step -- stated here as a
// test rather than as a comment, so a runtime that starts versioning this
// payload turns up as a red test instead of as a silent wrong decode.
// ---------------------------------------------------------------------------

describe('the zswap chain state each runtime writes', () => {
  test.each([
    ['empty', false],
    ['carrying retained past roots', true]
  ])('is byte-identical across the eras when %s', async (_label, populated) => {
    const ledger8Bytes = await mintLedger8ZswapChainStateBytes(populated);
    const ledger9Bytes = mintLedger9ZswapChainStateBytes(populated);

    expect(tagOf(ledger8Bytes)).toBe('midnight:zswap-ledger-state[v5]');
    expect(tagOf(ledger9Bytes)).toBe('midnight:zswap-ledger-state[v5]');
    expect(toHex(ledger8Bytes)).toBe(toHex(ledger9Bytes));
  });

  test('each era reads the other era’s bytes, so the payload carries no era to date', async () => {
    const v8 = await loadLedger8Protocol();
    const ledger8Bytes = await mintLedger8ZswapChainStateBytes(true);
    const ledger9Bytes = mintLedger9ZswapChainStateBytes(true);

    // Re-serialized rather than merely constructed: proves the bytes went through the other era's
    // runtime and came back unchanged, not that a constructor tolerated them.
    expect(toHex(ledger.ZswapChainState.deserialize(ledger8Bytes).serialize())).toBe(toHex(ledger9Bytes));
    expect(toHex(v8.ZswapChainState.deserialize(ledger9Bytes).serialize())).toBe(toHex(ledger8Bytes));
  });
});

// ---------------------------------------------------------------------------
// The decoder itself.
// ---------------------------------------------------------------------------
