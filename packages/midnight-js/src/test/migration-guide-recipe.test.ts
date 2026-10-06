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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { PROTOCOL_ERROR_CODES, type types, utils } from '../index';

// The positive compile assertion for the migration guide's narrowing recipe. The
// recipe below is real code reaching the framework only through this barrel, so
// `yarn typecheck:tests` is what proves the guide's instructions compile for a
// reader who follows them.
//
// The recipe is not executed: the `v8` arm's `tx` is a WASM class from
// `protocol/v8`, which this package may reference in a type position but not
// import at runtime.

// #region guide:narrowing-recipe
declare const describeNative: (tx: types.FinalizedTxData['tx']) => string;
declare const describeRetained: (tx: types.FinalizedTxDataV8['tx']) => string;

const summarize = (record: types.VersionedFinalizedTxData): string => {
  switch (record.version) {
    case 'v9':
      return `native ${record.txId}: ${describeNative(record.tx)}`;
    case 'v8':
      return `retained ${record.txId}: ${describeRetained(record.tx)}`;
    default:
      return utils.assertNever(record, 'summarize');
  }
};
// #endregion guide:narrowing-recipe

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
const GUIDE_PATH = path.join(REPOSITORY_ROOT, 'docs', 'releases', 'v5.0.0', 'migration-guide.md');

/** This package's own npm name, so the guide's import line is not pinned to a scope. */
const packageName = (): string =>
  JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).name as string;

/**
 * Lifts a `#region <name>` .. `#endregion <name>` block out of this file's own
 * source, so the comparison below is against code the compiler has accepted
 * rather than against a second copy of it.
 */
const regionSource = (name: string): string => {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const opening = `// #region ${name}\n`;
  const start = source.indexOf(opening);
  const end = source.indexOf(`// #endregion ${name}`);
  if (start < 0 || end < 0) {
    throw new Error(`Region '${name}' is not present in this file`);
  }
  return source.slice(start + opening.length, end).trimEnd();
};

/** Every fenced ```ts block in the guide, in order. */
const guideTypeScriptBlocks = (): string[] => {
  const guide = readFileSync(GUIDE_PATH, 'utf8');
  return [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1].trimEnd());
};

describe('migration guide narrowing recipe', () => {
  test('the recipe the guide prints is byte-identical to the recipe that compiles', () => {
    // Arrange: a package cannot import itself by name, so the fence is asserted to be
    // exactly that import, a blank line, then the region this file compiles.
    const compiled = regionSource('guide:narrowing-recipe');
    const importLine = `import { types, utils } from '${packageName()}';`;

    // Act.
    const printed = guideTypeScriptBlocks().filter((block) => block.includes('const summarize'));

    // Assert.
    expect(printed).toHaveLength(1);
    expect(printed[0]).toBe(`${importLine}\n\n${compiled}`);
  });

  test('the compiled region is the whole recipe, not an emptied placeholder', () => {
    // Arrange / Act: guards the equality above passing on '' if both were emptied.
    const compiled = regionSource('guide:narrowing-recipe');

    // Assert: both arms present, each reading its own era's `tx`, and closed by the
    // helper the chapter is about.
    expect(compiled).toContain('describeNative(record.tx)');
    expect(compiled).toContain('describeRetained(record.tx)');
    expect(compiled).toContain("utils.assertNever(record, 'summarize')");
    expect(typeof summarize).toBe('function');
  });

  test('the helper the recipe calls is reachable through the barrel at runtime', () => {
    // Arrange / Act: the recipe is never executed and the byte-identity assertion
    // compares strings, so neither notices the barrel losing `assertNever`.
    const act = () => utils.assertNever('v10' as never, 'summarize');

    // Assert.
    expect(act).toThrow('summarize');
  });

  test('the guide discriminates on an error code that exists and does not over-match', () => {
    // Arrange: asserted by value, since `hasErrorCode(e, undefined)` degrades to
    // "carries any registered code".
    const code = PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ;
    const coded = Object.assign(new Error('a record this build cannot date'), { code });
    const foreign = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });

    // Act / Assert.
    expect(code).toBe('MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ');
    expect(utils.hasErrorCode(coded, code)).toBe(true);
    expect(utils.hasErrorCode(coded, PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT)).toBe(false);
    expect(utils.hasErrorCode(coded)).toBe(true);
    expect(utils.hasErrorCode(foreign)).toBe(false);
  });

  test('every in-document link in the guide resolves to a heading it contains', () => {
    // Arrange.
    const guide = readFileSync(GUIDE_PATH, 'utf8');
    const slug = (heading: string): string =>
      heading
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s/g, '-');
    const headings = new Set([...guide.matchAll(/^#{2,6} (.+)$/gm)].map((match) => slug(match[1])));

    // Act.
    const anchors = [...guide.matchAll(/\]\(#([^)]+)\)/g)].map((match) => match[1]);

    // Assert.
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors.filter((anchor) => !headings.has(anchor))).toEqual([]);
  });

  test('the guide names only error codes the registry actually carries', () => {
    // Arrange.
    const guide = readFileSync(GUIDE_PATH, 'utf8');
    const registry = new Set<string>(utils.MIDNIGHT_JS_ERROR_CODES);

    // Act.
    const named = [...new Set([...guide.matchAll(/\bMIDNIGHT_JS_[A-Z0-9_]+\b/g)].map((match) => match[0]))];

    // Assert.
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((code) => !registry.has(code))).toEqual([]);
  });
});
