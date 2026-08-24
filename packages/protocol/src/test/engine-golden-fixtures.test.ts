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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import { describe, expect, it } from 'vitest';

import { DownConvertFailedError, PROTOCOL_ERROR_CODES } from '../errors';
import { checkRoot, downConvertForExecution } from '../lib/engine/down-convert';
import { extractEncodedStateValue } from '../lib/engine/envelope';

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
const FIXTURES_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf');

/**
 * Reads a hex fixture, failing if the file did not decode in full.
 * `Buffer.from(_, 'hex')` stops silently at the first non-hex character, so
 * without this length check a truncated or corrupted golden would still make
 * every negative test below pass — for the wrong reason.
 */
const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim();
  const bytes = Uint8Array.from(Buffer.from(text, 'hex'));
  if (bytes.length * 2 !== text.length) {
    throw new Error(`fixture ${name} is not valid hex in full: ${text.length} chars decoded to ${bytes.length} bytes`);
  }
  return bytes;
};

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
