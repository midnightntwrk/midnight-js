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

import type { CallOptions, FoundContract } from '../contracts';
import type { CompiledContract, Contract } from '../protocol';

// The positive compile assertion for the protocol-annotation recipe in
// llms.txt. The recipe below is real code reaching the framework only through
// this barrel's subpaths, so `yarn typecheck:tests` is what proves the
// documented annotations compile for a reader who follows them.
//
// The recipe is not executed: it declares the two operations rather than
// importing them, because naming the types is the whole subject.

// #region llms:protocol-annotations
type MyCompiled = CompiledContract.CompiledContract<Contract.Any, unknown>;
type MyHandle = FoundContract<Contract.Any>;

declare const findContract: (compiled: MyCompiled) => Promise<MyHandle>;
declare const optionsFor: (handle: MyHandle) => CallOptions<Contract.Any, string>;

const circuitCalledOn = async (compiled: MyCompiled): Promise<string> =>
  optionsFor(await findContract(compiled)).circuitId;
// #endregion llms:protocol-annotations

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const REPOSITORY_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
const LLMS_PATH = path.join(REPOSITORY_ROOT, 'llms.txt');

/** This package's own npm name, so the recipe's import lines are not pinned to a scope. */
const packageName = (): string =>
  (JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { name: string }).name;

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

/** Every fenced ```typescript block in llms.txt, in order. */
const documentedTypeScriptBlocks = (): string[] =>
  [...readFileSync(LLMS_PATH, 'utf8').matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) =>
    match[1].trimEnd()
  );

describe('llms.txt protocol annotation recipe', () => {
  test('the recipe llms.txt prints is byte-identical to the recipe that compiles', () => {
    // Arrange: a package cannot import itself by name, so the fence is asserted to be
    // exactly the two subpath imports, a blank line, then the region this file compiles.
    const compiled = regionSource('llms:protocol-annotations');
    const name = packageName();
    const importLines = [
      `import type { CompiledContract, Contract } from '${name}/protocol';`,
      `import type { CallOptions, FoundContract } from '${name}/contracts';`
    ].join('\n');

    // Act.
    const printed = documentedTypeScriptBlocks().filter((block) => block.includes('MyCompiled'));

    // Assert.
    expect(printed).toHaveLength(1);
    expect(printed[0]).toBe(`${importLines}\n\n${compiled}`);
  });

  test('the compiled region is the whole recipe, not an emptied placeholder', () => {
    // Arrange / Act: guards the equality above passing on '' if both were emptied.
    const compiled = regionSource('llms:protocol-annotations');

    // Assert: each of the four documented names is exercised, and the recipe closes
    // on the value it produces.
    expect(compiled).toContain('CompiledContract.CompiledContract<Contract.Any, unknown>');
    expect(compiled).toContain('FoundContract<Contract.Any>');
    expect(compiled).toContain("CallOptions<Contract.Any, string>");
    expect(typeof circuitCalledOn).toBe('function');
  });
});
