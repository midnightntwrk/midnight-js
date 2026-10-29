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

import { namingViolations, publishedNames } from '../../../../build-tools/published-names.mjs';

const names = publishedNames(resolve(__dirname, '../..'), {
    // These entry points re-export the ledger, runtime and platform packages under their own names.
    skipSubpaths: [
      './v9',
      './v9/compact-runtime',
      './v9/compact-js',
      './v9/compact-js/effect',
      './v9/compact-js/effect/Contract',
      './compact-js/v8/effect',
      './v9/onchain-runtime',
      './platform-js',
      './platform-js/effect/Configuration',
      './platform-js/effect/ContractAddress'
    ]
  });

describe('published names', () => {
  it('reads every entry point the package publishes', () => {
    expect(names).toContain('proveLedger8Transaction');
  });

  it('follow the naming rules of the public API', () => {
    expect(namingViolations(names)).toEqual([]);
  });
});
