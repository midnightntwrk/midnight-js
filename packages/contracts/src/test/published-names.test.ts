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

import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { namingViolations, publishedNames, unprefixedLedger9Types } from '../../../../build-tools/published-names.mjs';

const PACKAGE_ROOT = resolve(__dirname, '../..');
const NAMING_FIXTURE = resolve(__dirname, '../../../../build-tools/test-fixtures/ledger9-naming');
const ALIAS_FILES = ['era-aliases.ts'];

const names = publishedNames(PACKAGE_ROOT);

describe('published names', () => {
  it('reads every entry point the package publishes', () => {
    expect(names).toContain('ProviderFailedError');
  });

  it('follow the naming rules of the public API', () => {
    expect(namingViolations(names)).toEqual([]);
  });

  it('flag an exported type constrained to Contract.Any that has no ledger prefix and does not pick the era', () => {
    expect(unprefixedLedger9Types(NAMING_FIXTURE, { aliasFiles: ALIAS_FILES })).toEqual([
      'FlaggedAlias',
      'FlaggedInterface',
      'ReExportedFlagged',
      'ViaLedger9Contract'
    ]);
  });

  it('name every exported type bound to ledger 9 after its ledger', () => {
    expect(unprefixedLedger9Types(PACKAGE_ROOT, { aliasFiles: ALIAS_FILES })).toEqual([]);
  });
});
