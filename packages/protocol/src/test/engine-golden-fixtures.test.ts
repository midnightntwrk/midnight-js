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


import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import { describe, expect, it } from 'vitest';

import { DownConvertFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import { extractEncodedStateValue, extractV9EncodedStateValue } from '../lib/era/envelope';
import { checkRoot, downConvertForExecution } from '../lib/v8/down-convert';
import { readHexFixture } from './fixtures';

// The engine's own suite (engine-down-convert.test.ts) builds its envelopes
// in-process, so it never touches these files. What it cannot prove is what
// this suite exists for: that a *real* migrated on-chain state down-converts
// to data byte-identical with its pre-migration form, and that the deliberately
// tampered envelopes fail closed. Only committed goldens minted from the real
// ledgers can establish that.
//
// The fixtures are read by path rather than through testkit-js's typed
// accessor because testkit-js depends on midnight-js-protocol — a devDependency
// back would close a workspace cycle. packages/protocol/turbo.json therefore
// declares the fixture directory as a test input, so editing a golden
// invalidates this package's test cache.

/**
 * Reads a hex fixture, failing if the file did not decode in full.
 * `Buffer.from(_, 'hex')` stops silently at the first non-hex character, so
 * without this length check a truncated or corrupted golden would still make
 * every negative test below pass — for the wrong reason.
 */

describe('down-converting a real migrated state', () => {
  it('yields data byte-identical with the pre-migration v8 state', () => {
    const v9Encoded = extractEncodedStateValue(readHexFixture('state-migrated-v9.hex'), 'v9', ocrt3.ContractState);
    const v8Encoded = extractEncodedStateValue(readHexFixture('state-v8.hex'), 'v8', ocrt3.ContractState);

    const downConverted = downConvertForExecution(v9Encoded, ocrt3);

    expect(downConverted.data.state.encode()).toEqual(v8Encoded);
  });

  it('reads the pre-fork tag-v6 envelope to the same state the post-fork envelope carries', () => {
    const fromLedger8 = extractEncodedStateValue(readHexFixture('state-v8-v6-envelope.hex'), 'v8', ocrt3.ContractState);
    const fromLedger9 = extractEncodedStateValue(readHexFixture('state-migrated-v9.hex'), 'v9', ocrt3.ContractState);

    expect(fromLedger8).toEqual(fromLedger9);
  });

  it('leaves a golden Merkle state with a readable root', () => {
    const encoded = extractEncodedStateValue(readHexFixture('state-migrated-v9-merkle.hex'), 'v9', ocrt3.ContractState);

    const downConverted = downConvertForExecution(encoded, ocrt3);
    const tree = downConverted.data.state.asBoundedMerkleTree();
    if (tree === undefined) {
      throw new Error('test fixture invariant violated: expected a boundedMerkleTree StateValue');
    }

    expect(() => checkRoot(tree)).not.toThrow();
  });
});

describe('tampered goldens', () => {
  it('rejects an envelope whose bytes were corrupted', () => {
    expect(() =>
      extractEncodedStateValue(readHexFixture('state-tampered-bytes.hex'), 'v9', ocrt3.ContractState)
    ).toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED }));
  });

  it('never leaks a raw hex/byte dump when it rejects one', () => {
    try {
      extractEncodedStateValue(readHexFixture('state-tampered-bytes.hex'), 'v9', ocrt3.ContractState);
      expect.unreachable('extraction of tampered bytes must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DownConvertFailedError);
      expect((error as DownConvertFailedError).message).not.toMatch(/[0-9a-f]{16,}/i);
    }
  });

  // These two carry an envelope tag deliberately flipped to the *other* ledger
  // version's tag (fixtures/hf/README.md, "Tampered fixtures"). Each must fail
  // when read with the version its tag now falsely claims.
  it.each([
    { fixture: 'state-tampered-keyset-v8to9.hex', version: 'v9' as const },
    { fixture: 'state-tampered-keyset-v9to8.hex', version: 'v8' as const }
  ])('rejects $fixture read as $version', ({ fixture, version }) => {
    expect(() => extractEncodedStateValue(readHexFixture(fixture), version, ocrt3.ContractState)).toThrowError(
      expect.objectContaining({ code: PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED })
    );
  });
});

// The dispatching `extractEncodedStateValue` requires the pre-fork
// `ContractState` for EVERY version, deliberately — a v9 caller that drifted
// into a v8 read would otherwise have no runtime to reach for. That makes the
// v9 read unavailable to anything that has not already paid for the pre-fork
// WASM. The standalone decoder is the same read without that requirement.
describe('extractV9EncodedStateValue', () => {
  it('reads a real migrated envelope to exactly what the dispatching entry produces', () => {
    const raw = readHexFixture('state-migrated-v9.hex');

    expect(extractV9EncodedStateValue(raw)).toEqual(extractEncodedStateValue(raw, 'v9', ocrt3.ContractState));
  });

  it('rejects a corrupted envelope with the same code and stage the dispatching entry reports', () => {
    let caught: unknown;
    try {
      extractV9EncodedStateValue(readHexFixture('state-tampered-bytes.hex'));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DownConvertFailedError);
    const failure = caught as DownConvertFailedError;
    expect(failure.code).toBe(PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
    expect(failure.stage).toBe('v9 envelope extraction');
  });

  // The dispatching entry delegates to this function rather than duplicating
  // the decode, so its own try/catch would wrap an already-wrapped failure —
  // burying the runtime's diagnosis one level deeper on every read.
  it('is not double-wrapped when reached through the dispatching entry', () => {
    let caught: unknown;
    try {
      extractEncodedStateValue(readHexFixture('state-tampered-bytes.hex'), 'v9', ocrt3.ContractState);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DownConvertFailedError);
    expect((caught as DownConvertFailedError).cause).not.toBeInstanceOf(DownConvertFailedError);
  });
});
