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

import { ledger, loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import {
  DeserializationError,
  ledgerParametersEnvelopeVersion,
  parseSerializedTag,
  TagParseError,
  toHex
} from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, test } from 'vitest';

import { parseHexLedgerParameters, parseHexZswapState } from '../codec';
import { IndexerDataError } from '../errors';
import {
  mintV8LedgerParametersBytes,
  mintV8LedgerParametersHex,
  mintV8ZswapChainStateBytes,
  mintV9LedgerParametersBytes,
  mintV9LedgerParametersHex,
  mintV9ZswapChainStateBytes
} from './state-fixtures';

const tagOf = (bytes: Uint8Array): string => parseSerializedTag(bytes).tag;

// ---------------------------------------------------------------------------
// What the two runtimes actually write. Everything the parameters path does
// rests on these four facts, so they are measured against real minted bytes
// rather than assumed from the shape of the contract-state family.
// ---------------------------------------------------------------------------

describe('the ledger parameters each runtime writes', () => {
  test('the retained era writes the envelope this client maps onto v8', async () => {
    const bytes = await mintV8LedgerParametersBytes();

    expect(tagOf(bytes)).toBe('midnight:ledger-parameters[v5]');
    expect(ledgerParametersEnvelopeVersion(bytes)).toBe('v8');
  });

  test('the current era writes the envelope this client maps onto v9', () => {
    const bytes = mintV9LedgerParametersBytes();

    expect(tagOf(bytes)).toBe('midnight:ledger-parameters[v8]');
    expect(ledgerParametersEnvelopeVersion(bytes)).toBe('v9');
  });

  test('neither era can read the other era’s parameters', async () => {
    const v8 = await loadLedger8();
    const v8Bytes = await mintV8LedgerParametersBytes();
    const v9Bytes = mintV9LedgerParametersBytes();

    // Both directions, and matched on the message rather than a class: the runtimes throw a plain
    // `Error`, so `.toThrow(Error)` would also pass for a fixture mistake that never reached a
    // deserializer at all. The message is the only evidence that the refusal is on the HEADER TAG,
    // before any body is read -- which is why dating the bytes first turns an unclassified decoder
    // failure into a decision.
    expect(() => ledger.LedgerParameters.deserialize(v8Bytes)).toThrow(/expected header tag/);
    expect(() => v8.LedgerParameters.deserialize(v9Bytes)).toThrow(/expected header tag/);
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
    const v8Bytes = await mintV8ZswapChainStateBytes(populated);
    const v9Bytes = mintV9ZswapChainStateBytes(populated);

    expect(tagOf(v8Bytes)).toBe('midnight:zswap-ledger-state[v5]');
    expect(tagOf(v9Bytes)).toBe('midnight:zswap-ledger-state[v5]');
    expect(toHex(v8Bytes)).toBe(toHex(v9Bytes));
  });

  test('each era reads the other era’s bytes, so the payload carries no era to date', async () => {
    const v8 = await loadLedger8();
    const v8Bytes = await mintV8ZswapChainStateBytes(true);
    const v9Bytes = mintV9ZswapChainStateBytes(true);

    // Re-serialized rather than merely constructed: proves the bytes went through the other era's
    // runtime and came back unchanged, not that a constructor tolerated them.
    expect(toHex(ledger.ZswapChainState.deserialize(v8Bytes).serialize())).toBe(toHex(v9Bytes));
    expect(toHex(v8.ZswapChainState.deserialize(v9Bytes).serialize())).toBe(toHex(v8Bytes));
  });
});

// ---------------------------------------------------------------------------
// The decoder itself.
// ---------------------------------------------------------------------------

describe('parseHexLedgerParameters', () => {
  test('decodes the parameters of a block from the era it can read', () => {
    const hex = mintV9LedgerParametersHex();

    // Round-tripped rather than merely non-null: proves the bytes really went through the v9
    // runtime instead of being handed back untouched.
    expect(toHex(parseHexLedgerParameters(hex).serialize())).toBe(hex);
  });

  test('refuses the parameters of a pre-fork block by era, not by decoder failure', async () => {
    const hex = await mintV8LedgerParametersHex();

    let rejection: unknown;
    try {
      parseHexLedgerParameters(hex);
      expect.unreachable('retained-era parameters must be refused');
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(IndexerDataError);
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'unsupported-parameters-era', version: 'v8' });
    // The distinction this test exists for: previously these bytes reached the v9 deserializer and
    // came back as an unclassified DeserializationError naming neither the era nor the field.
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a payload that is not a parameter set at all, by tag rather than by decode', () => {
    // A contract state is a well-formed envelope of the WRONG family, so the tag parses and only
    // the era table can reject it. The v9 runtime writes `contract-state[v8]`, and `[v8]` is a
    // SUPPORTED number in the parameters family too -- so this passes only because the table keys
    // on the whole tag rather than on the bracketed number.
    let rejection: unknown;
    try {
      parseHexLedgerParameters(toHex(new ledger.ContractState().serialize()));
      expect.unreachable('a contract state must be refused as ledger parameters');
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(TagParseError);
    // Not converted to an `IndexerError`, and not reaching the deserializer either.
    expect(rejection).not.toBeInstanceOf(IndexerDataError);
    expect(rejection).not.toBeInstanceOf(DeserializationError);
  });

  test('refuses a payload that is not whole hex, rather than decoding a truncated prefix', () => {
    // `toByteArray` keeps only the leading run of whole hex bytes and discards the rest without
    // complaining, so the guard has to run before the bytes are taken.
    const truncated = `${mintV9LedgerParametersHex().slice(0, 20)}zz`;

    let rejection: unknown;
    try {
      parseHexLedgerParameters(truncated);
      expect.unreachable('a partly-hex payload must be refused');
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(IndexerDataError);
    // The kind matters: refused for its ENCODING, before any era decision was reachable.
    expect((rejection as IndexerDataError).context).toEqual({ kind: 'malformed-parameters-encoding' });
  });
});

describe('parseHexZswapState', () => {
  test('reads a zswap state either era wrote, because neither tags it with one', async () => {
    const v8Hex = toHex(await mintV8ZswapChainStateBytes(true));

    expect(toHex(parseHexZswapState(v8Hex).serialize())).toBe(v8Hex);
  });
});
