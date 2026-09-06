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

/**
 * Typed access to the hard-fork state fixtures shipped with this package.
 *
 * The fixture bytes live next to this module, under `fixtures/hf/`, and are
 * copied verbatim into `dist` by the build. Paths are resolved relative to this
 * module's own URL, so the same code reaches `src/fixtures/hf` when running
 * from source and `dist/fixtures/hf` when running from the published package.
 *
 * Every accessor throws on anything it cannot serve. None of them returns empty
 * bytes, a missing-file placeholder or a partially decoded buffer.
 */

import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The nine hard-fork state fixtures, by file name. Provenance and the exact
 * tampering applied to each are documented in `fixtures/hf/README.md`, which
 * ships alongside the bytes.
 */
export const HF_FIXTURE_NAMES = [
  'state-v8.hex',
  'state-v8-v6-envelope.hex',
  'state-migrated-v9.hex',
  'state-migrated-v9-merkle.hex',
  'state-tampered-keyset-v8to9.hex',
  'state-tampered-keyset-v9to8.hex',
  'state-tampered-bytes.hex',
  'state-both-keys.hex',
  'state-co-v2-only-foreign.hex'
] as const;

/** One of the {@link HF_FIXTURE_NAMES}. */
export type HfFixtureName = (typeof HF_FIXTURE_NAMES)[number];

/**
 * What a fixture is good for.
 *
 * - `valid` — a real state that deserializes cleanly on the ledger matching
 *   its `protocolVersion`, and is fit to use as a known-good input.
 * - `synthetic` — hand-built rather than produced by a real migration, but
 *   still a valid state on its ledger.
 * - `tampered` — deliberately corrupt; expected to be rejected at decode.
 * - `foreign-key` — decodes cleanly, but carries a deliberately foreign
 *   verifier key, so it fails only later at execution. Deliberately kept out
 *   of `valid`: filtering on `valid` must never hand back a poisoned state.
 */
export const HF_FIXTURE_STATUSES = ['valid', 'synthetic', 'tampered', 'foreign-key'] as const;

/** One of the {@link HF_FIXTURE_STATUSES}. */
export type HfFixtureStatus = (typeof HF_FIXTURE_STATUSES)[number];

/** The subset of a fixture's manifest entry this package promises to keep. */
export interface HfFixtureEntry {
  /**
   * The indexer/node `protocolVersion` integer this fixture belongs to, or
   * `null` where no single version applies by construction.
   */
  readonly protocolVersion: number | null;
  readonly status: HfFixtureStatus;
}

const FIXTURES_DIR = fileURLToPath(new URL('./fixtures/hf/', import.meta.url));

const MANIFEST_FILE = 'fixtures.json';

const HEX_TEXT = /^[0-9a-f]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFixtureStatus = (value: unknown): value is HfFixtureStatus =>
  HF_FIXTURE_STATUSES.some((status) => status === value);

const isProtocolVersion = (value: unknown): value is number | null => value === null || Number.isInteger(value);

/**
 * Resolves a path inside the shipped fixture tree, for assets this module
 * exposes no dedicated reader for: every compiled contract and its sources,
 * the golden and recorded transcripts, the two `coin-receiver-016` state
 * envelopes, the manifest and the README. Deliberately not enumerated
 * fixture-by-fixture -- that list has gone stale before. What each asset is,
 * and which of them are reachable only this way, is documented in
 * `fixtures/hf/README.md`.
 *
 * @param relativePath Path relative to the fixture directory, e.g.
 *   `twin-contract/counter.compact`.
 * @returns The absolute path to an existing file.
 * @throws If the path escapes the fixture directory, or names no shipped file.
 */
export const hfFixturePath = (relativePath: string): string => {
  const path = resolve(FIXTURES_DIR, relativePath);
  const inside = relative(FIXTURES_DIR, path);
  if (inside.startsWith('..') || isAbsolute(inside)) {
    throw new Error(`${relativePath} resolves outside the hard-fork fixture directory ${FIXTURES_DIR}`);
  }
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`no such hard-fork fixture file: ${relativePath} (looked in ${FIXTURES_DIR})`);
  }
  return path;
};

const parseEntry = (name: HfFixtureName, value: unknown): HfFixtureEntry => {
  if (!isRecord(value)) {
    throw new Error(`${MANIFEST_FILE} entry ${name} is not an object`);
  }
  const { protocolVersion, status } = value;
  if (!isProtocolVersion(protocolVersion)) {
    throw new Error(`${MANIFEST_FILE} entry ${name} has a protocolVersion that is neither an integer nor null`);
  }
  if (!isFixtureStatus(status)) {
    throw new Error(
      `${MANIFEST_FILE} entry ${name} has status ${JSON.stringify(status)}, expected one of ${HF_FIXTURE_STATUSES.join(', ')}`
    );
  }
  return { protocolVersion, status };
};

const readManifest = (): Readonly<Record<HfFixtureName, HfFixtureEntry>> => {
  const parsed: unknown = JSON.parse(readFileSync(hfFixturePath(MANIFEST_FILE), 'utf8'));
  if (!isRecord(parsed) || !isRecord(parsed.fixtures)) {
    throw new Error(`${MANIFEST_FILE} declares no "fixtures" object`);
  }
  const { fixtures } = parsed;
  const declared = Object.keys(fixtures).sort().join();
  const expected = [...HF_FIXTURE_NAMES].sort().join();
  if (declared !== expected) {
    throw new Error(`${MANIFEST_FILE} declares [${declared}], expected [${expected}]`);
  }
  const entry = (name: HfFixtureName): HfFixtureEntry => parseEntry(name, fixtures[name]);
  // Spelled out rather than folded from `HF_FIXTURE_NAMES`, so the compiler
  // checks the key set instead of a cast asserting it: adding a name to
  // `HF_FIXTURE_NAMES` is a type error here until it is listed.
  return {
    'state-v8.hex': entry('state-v8.hex'),
    'state-v8-v6-envelope.hex': entry('state-v8-v6-envelope.hex'),
    'state-migrated-v9.hex': entry('state-migrated-v9.hex'),
    'state-migrated-v9-merkle.hex': entry('state-migrated-v9-merkle.hex'),
    'state-tampered-keyset-v8to9.hex': entry('state-tampered-keyset-v8to9.hex'),
    'state-tampered-keyset-v9to8.hex': entry('state-tampered-keyset-v9to8.hex'),
    'state-tampered-bytes.hex': entry('state-tampered-bytes.hex'),
    'state-both-keys.hex': entry('state-both-keys.hex'),
    'state-co-v2-only-foreign.hex': entry('state-co-v2-only-foreign.hex')
  };
};

/**
 * The shipped `fixtures.json`, keyed by fixture name and validated on load, so
 * a manifest that has drifted from {@link HF_FIXTURE_NAMES} fails at import
 * rather than at the first lookup.
 *
 * Only the fields this package promises are exposed here. The full per-fixture
 * provenance stays in the shipped manifest, reachable via
 * `hfFixturePath('fixtures.json')`.
 */
export const hfFixturesManifest: Readonly<Record<HfFixtureName, HfFixtureEntry>> = readManifest();

/**
 * Reads one hard-fork state fixture as raw bytes, ready to hand to a ledger's
 * `ContractState.deserialize`.
 *
 * @param name One of {@link HF_FIXTURE_NAMES}.
 * @returns The decoded fixture bytes.
 * @throws If the name is not a shipped fixture, or its file is not whole hex —
 *   a truncated decode would look like a valid but different state.
 */
export const readHfFixture = (name: HfFixtureName): Uint8Array => {
  if (!HF_FIXTURE_NAMES.includes(name)) {
    throw new Error(`unknown hard-fork fixture: ${name} (expected one of ${HF_FIXTURE_NAMES.join(', ')})`);
  }
  const text = readFileSync(hfFixturePath(name), 'utf8').trim();
  if (text.length === 0 || text.length % 2 !== 0 || !HEX_TEXT.test(text)) {
    throw new Error(`hard-fork fixture ${name} is not whole lower-case hex`);
  }
  return Uint8Array.from(Buffer.from(text, 'hex'));
};
