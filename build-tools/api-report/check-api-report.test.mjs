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

// Run with: node --test build-tools/api-report/check-api-report.test.mjs

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { parseAllowlistEntries } from './check-api-report.mjs';

test('parses entries listed under the "## Entries" heading', () => {
  const content = [
    '# Allowed breaking API changes',
    '',
    '## Format',
    '',
    '- One entry per line.',
    '',
    '## Entries',
    '',
    '- someRealExport',
    '- anotherExport',
  ].join('\n');

  assert.deepEqual(parseAllowlistEntries(content), ['someRealExport', 'anotherExport']);
});

test('ignores bulleted prose in the "## Format" section above the heading', () => {
  const content = [
    '## Format',
    '',
    '- e.g. `someRealExport` is a valid entry.',
    '- Another format bullet, not a live entry.',
    '',
    '## Entries',
    '',
    '- onlyThisIsALiveEntry',
  ].join('\n');

  assert.deepEqual(parseAllowlistEntries(content), ['onlyThisIsALiveEntry']);
});

test('ignores blank lines and non-bullet lines within the "## Entries" section', () => {
  const content = [
    '## Entries',
    '',
    'Some prose explaining the entries below.',
    '',
    '- firstEntry',
    '',
    '- secondEntry',
  ].join('\n');

  assert.deepEqual(parseAllowlistEntries(content), ['firstEntry', 'secondEntry']);
});

test('returns an empty list when the "## Entries" section has no bullets', () => {
  const content = ['## Format', '', '- some format bullet', '', '## Entries', '', '<!-- Empty -->'].join('\n');

  assert.deepEqual(parseAllowlistEntries(content), []);
});

test('throws when the "## Entries" heading is missing', () => {
  const content = '## Format\n\n- some format bullet\n';

  assert.throws(() => parseAllowlistEntries(content), /Missing required "## Entries" heading/);
});
