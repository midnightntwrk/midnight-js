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

// Shared IO helpers for the hard-fork fixture generators. Every fixture is
// committed as lower-case hex text (no whitespace, no trailing newline) so it
// can be diffed and reviewed like source code.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = resolve(HERE, '..');

export const fixturePath = (name) => resolve(FIXTURES_DIR, name);

// Mirrors the whole-hex check in ../../../fixtures-hf.ts. `Buffer.from(..., 'hex')`
// stops at the first character it cannot decode and returns a SHORTER buffer
// without complaining, so an unvalidated read would mint every derived fixture
// from a silently truncated golden. These are plain Node scripts and cannot
// import the TypeScript accessor without a build, hence the duplicated check.
export const readHexFixture = (name) => {
  const path = fixturePath(name);
  const text = readFileSync(path, 'utf8').trim();
  if (text.length === 0 || text.length % 2 !== 0 || !/^[0-9a-f]+$/.test(text)) {
    throw new Error(`${path} is not whole lower-case hex; refusing to mint from a truncated decode`);
  }
  return Uint8Array.from(Buffer.from(text, 'hex'));
};

export const writeHexFixture = (name, bytes) => {
  writeFileSync(fixturePath(name), Buffer.from(bytes).toString('hex'));
};

export const asciiPrefix = (bytes, n = 32) =>
  Array.from(bytes.slice(0, n))
    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
    .join('');
