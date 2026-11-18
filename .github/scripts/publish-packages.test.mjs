// This file is part of midnight-js.
// Copyright (C) 2025-2026 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, expect, it } from 'vitest';

import { aliasRewriter } from './publish-packages.mjs';

const OWN_NAMES = ['@midnightntwrk/midnight-js', '@midnightntwrk/midnight-js-types', '@midnightntwrk/compact-js.utils'];

describe('aliasRewriter', () => {
  it('renames own packages in every specifier position', () => {
    const alias = aliasRewriter(OWN_NAMES);
    const source = [
      `import a from '@midnightntwrk/midnight-js';`,
      `import b from "@midnightntwrk/midnight-js-types/sub";`,
      'const c = `@midnightntwrk/compact-js.utils`;'
    ].join('\n');

    const rewritten = alias(source);

    expect(rewritten).toBe(
      [
        `import a from '@midnight-ntwrk/midnight-js';`,
        `import b from "@midnight-ntwrk/midnight-js-types/sub";`,
        'const c = `@midnight-ntwrk/compact-js.utils`;'
      ].join('\n')
    );
  });

  it('renames a bare name at the end of the text', () => {
    const alias = aliasRewriter(OWN_NAMES);

    expect(alias('@midnightntwrk/midnight-js-types')).toBe('@midnight-ntwrk/midnight-js-types');
  });

  it('renames own packages mentioned in comments', () => {
    const alias = aliasRewriter(OWN_NAMES);

    expect(alias('/** See @midnightntwrk/midnight-js for details. */')).toBe(
      '/** See @midnight-ntwrk/midnight-js for details. */'
    );
  });

  it('leaves external packages of the canonical scope untouched', () => {
    const alias = aliasRewriter(OWN_NAMES);
    const source = `import { x } from '@midnightntwrk/ledger-v8';`;

    expect(alias(source)).toBe(source);
  });

  it('does not rename an own name that is only a prefix of another package', () => {
    const alias = aliasRewriter(['@midnightntwrk/midnight-js']);
    const source = `import t from '@midnightntwrk/midnight-js-types';`;

    expect(alias(source)).toBe(source);
  });

  it('reports only own canonical names as leftovers', () => {
    const alias = aliasRewriter(OWN_NAMES);
    const text = `'@midnightntwrk/midnight-js-types' '@midnightntwrk/ledger-v8' '@midnight-ntwrk/midnight-js'`;

    expect(alias.leftoverIn(text)).toEqual(['@midnightntwrk/midnight-js-types']);
  });

  it('reports no leftovers in fully aliased text', () => {
    const alias = aliasRewriter(OWN_NAMES);

    expect(alias.leftoverIn(alias(`'@midnightntwrk/midnight-js' '@midnightntwrk/midnight-js-types'`))).toEqual([]);
  });
});
