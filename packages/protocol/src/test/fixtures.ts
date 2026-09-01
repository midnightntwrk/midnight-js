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

import type { ZswapLocalState } from 'compact-runtime-ledger8';

// Not a `*.test.ts` file, so vitest does not collect it, and it sits under
// `test/`, which the coverage config excludes.
//
// The hex fixtures live in testkit-js because that is where they are produced
// and where the e2e suites consume them. Reading them from here is a
// cross-package path, which is why it is written down ONCE: seven copies of it
// meant seven places to update when the fixture directory moves, and one of
// them had already drifted into inlining the path at its call site.
const FIXTURES_DIR = resolve(__dirname, '../../../../testkit-js/testkit-js/src/fixtures/hf');

/**
 * Reads a hex-encoded fixture into the bytes it encodes.
 *
 * The length check is the point: `Buffer.from(text, 'hex')` stops at the first
 * non-hex character and returns the prefix it managed to decode, so a truncated
 * or accidentally-edited fixture would otherwise arrive as a short byte string
 * and be tested as though it were the whole thing.
 */
export const readHexFixture = (name: string): Uint8Array => {
  const text = readFileSync(resolve(FIXTURES_DIR, name), 'utf8').trim();
  const bytes = Uint8Array.from(Buffer.from(text, 'hex'));
  if (bytes.length * 2 !== text.length) {
    throw new Error(`fixture ${name} is not valid hex in full: ${text.length} chars decoded to ${bytes.length} bytes`);
  }
  return bytes;
};

/** Resolves a path inside the shared hf fixture tree, for fixtures that are not hex. */
export const fixturePath = (...segments: string[]): string => resolve(FIXTURES_DIR, ...segments);

/**
 * The Zswap local state a coin-FREE circuit leaves behind, as the retained 0.16
 * runtime decodes it.
 *
 * Written down once because `TranscriptPojo` requires the member: a hand-built
 * transcript fixture that omits it is not one `executeCircuit` could produce,
 * and every leg that consumes a transcript without reading its coin movements
 * (`wrapKeepStateCall`, `composeV8CallTx`) needs the same filler. Those legs
 * never read the key either, so it is a well-formed 32-byte placeholder rather
 * than a parameter each fixture has to invent a value for.
 */
export const emptyZswapLocalState = (): ZswapLocalState => ({
  coinPublicKey: 'ca'.repeat(32),
  currentIndex: 0n,
  inputs: [],
  outputs: []
});
