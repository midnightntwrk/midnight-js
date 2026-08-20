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

import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Canary tests for the protocol ACL and v8 gates in eslint.config.mjs — one
// case per config artifact, nothing more. A selector or glob with a typo
// matches nothing and disables its gate silently (ESLint reports no error for
// a dead selector), and `yarn lint` in CI only fails on violations, never on
// a weakened rule. These canaries are the only automated signal for that
// failure mode; exhaustive permutations add no further signal and are
// deliberately absent.
const MONOREPO_ROOT = resolve(__dirname, '../../../..');
const CONFIG_FILE = resolve(MONOREPO_ROOT, 'eslint.config.mjs');

const CONSUMER_PATH = 'packages/contracts/src/some-consumer.ts';
const PROTOCOL_INTERNAL_PATH = 'packages/protocol/src/some-reexport.ts';
const PACKAGE_TEST_PATH = 'packages/contracts/src/test/some-consumer.test.ts';
const TESTKIT_PATH = 'testkit-js/testkit-js/src/some-helper.ts';
const ACL_REPLACEMENT_PREFIX = '@midnight-ntwrk/midnight-js-protocol';
const RULE_ID = 'no-restricted-imports';
const TS_RULE_ID = '@typescript-eslint/no-restricted-imports';
const SYNTAX_RULE_ID = 'no-restricted-syntax';
const EXPLICIT_ANY_RULE_ID = '@typescript-eslint/no-explicit-any';
const V8_SUBPATH = `${ACL_REPLACEMENT_PREFIX}/v8`;
const DIST_IMPORT_MESSAGE = 'Direct imports from dist folders';
const ERROR_SEVERITY = 2;

// The ESLint constructor only stores options — config resolution happens
// lazily inside `lintText` — so eager initialisation here is cheap and lets
// `eslint` stay a module-level `const`.
const eslint = new ESLint({
  overrideConfigFile: CONFIG_FILE,
  cwd: MONOREPO_ROOT
});

const importStatement = (moduleSpecifier: string): string => `import { foo } from '${moduleSpecifier}';\n`;
const typeImportStatement = (moduleSpecifier: string): string => `import type { Foo } from '${moduleSpecifier}';\n`;
const dynamicImportStatement = (moduleSpecifier: string): string => `export const load = () => import('${moduleSpecifier}');\n`;

const lintMessagesFor = async (code: string, filePath: string, ruleId: string): Promise<Linter.LintMessage[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === ruleId);
};

const lintRestricted = async (code: string, filePath: string): Promise<Linter.LintMessage[]> =>
  lintMessagesFor(code, filePath, RULE_ID);

// The first `lintText` call pays a one-time cost: loading the root ESLint
// config, instantiating plugins, and warming `eslint-import-resolver-typescript`
// which reads every `tsconfig.json` across the monorepo. Under parallel CI
// load that can exceed the 5s per-test default. Warming once in a hook keeps
// individual tests fast and deterministic.
beforeAll(async () => {
  await eslint.lintText(importStatement('@midnightntwrk/ledger-v9'), { filePath: CONSUMER_PATH });
}, 60_000);

describe('Protocol ACL: no-restricted-imports canaries', () => {
  // One case per restricted-pattern entry in the config.
  it.each([
    '@midnightntwrk/ledger-v9',
    '@midnight-ntwrk/compact-runtime',
    '@midnight-ntwrk/compact-js',
    '@midnightntwrk/onchain-runtime-v4',
    '@midnight-ntwrk/platform-js'
  ])('flags direct import of %s from a consumer package', async (restricted) => {
    const messages = await lintMessagesFor(importStatement(restricted), CONSUMER_PATH, RULE_ID);

    expect(messages).toHaveLength(1);
  });

  it('allows a consumer package to import via the protocol ACL subpath', async () => {
    const messages = await lintMessagesFor(importStatement(`${ACL_REPLACEMENT_PREFIX}/ledger`), CONSUMER_PATH, RULE_ID);

    expect(messages).toEqual([]);
  });

  it('allows a direct protocol-package import inside packages/protocol/src/', async () => {
    const messages = await lintMessagesFor(importStatement('@midnightntwrk/ledger-v9'), PROTOCOL_INTERNAL_PATH, RULE_ID);

    expect(messages).toEqual([]);
  });

  it('still forbids dist imports inside packages/protocol/src/', async () => {
    const messages = await lintMessagesFor(importStatement('../dist/whatever'), PROTOCOL_INTERNAL_PATH, RULE_ID);

    expect(messages).toHaveLength(1);
  });
});

describe('protocol/v8 gate canaries', () => {
  it('flags a runtime import of protocol/v8 from a consumer package', async () => {
    const messages = await lintMessagesFor(importStatement(V8_SUBPATH), CONSUMER_PATH, TS_RULE_ID);

    expect(messages).toHaveLength(1);
  });

  it('allows a type-only import of protocol/v8 from a consumer package', async () => {
    const messages = await lintMessagesFor(typeImportStatement(V8_SUBPATH), CONSUMER_PATH, TS_RULE_ID);

    expect(messages).toEqual([]);
  });

  it('allows a runtime import of protocol/v8 inside packages/protocol/src/', async () => {
    const messages = await lintMessagesFor(importStatement(V8_SUBPATH), PROTOCOL_INTERNAL_PATH, TS_RULE_ID);

    expect(messages).toEqual([]);
  });

  it('flags a dynamic import of protocol/v8 from a consumer package', async () => {
    const messages = await lintMessagesFor(dynamicImportStatement(V8_SUBPATH), CONSUMER_PATH, SYNTAX_RULE_ID);

    expect(messages).toHaveLength(1);
  });

  it('allows a dynamic import of protocol/v8 inside packages/protocol/src/', async () => {
    const messages = await lintMessagesFor(dynamicImportStatement(V8_SUBPATH), PROTOCOL_INTERNAL_PATH, SYNTAX_RULE_ID);

    expect(messages).toEqual([]);
  });

  // The exemption above must come from `ignores` on the block that adds the v8
  // selectors, never from switching the rule off for protocol sources. Both
  // rules are shared: an `'off'` override drops every OTHER selector another
  // block adds to them too, and it does so silently, because an absent rule
  // reports nothing. That is not hypothetical — the unsafe-cast gate on `main`
  // rides on `no-restricted-syntax`, so an `'off'` here would leave the whole
  // protocol package, the largest body of new hard-fork code, without it.
  it.each([SYNTAX_RULE_ID, TS_RULE_ID])('never disables %s outright for protocol sources', async (ruleId) => {
    const { rules } = await eslint.calculateConfigForFile(PROTOCOL_INTERNAL_PATH);
    const entry = rules?.[ruleId];

    // Absent is correct (the v8 block simply does not apply here). Present
    // means another block set it, and then it must be enabled, not disabled.
    if (entry !== undefined) {
      expect(Array.isArray(entry) ? entry[0] : entry).not.toBe(0);
      expect(Array.isArray(entry) ? entry[0] : entry).not.toBe('off');
    }
  });
});

// Canaries for the unsafe-cast gate. A typo in an AST selector matches nothing
// and disables its half of the gate silently — ESLint reports no error for a
// dead selector — so each selector half gets exactly one case.
describe('Unsafe-cast gate: no-restricted-syntax canaries', () => {
  describe('flags unsafe casts in package sources', () => {
    it.each([
      ['as any', 'export const y = 0 as any;\n'],
      ['angle-bracket any', 'export const y = <any>0;\n'],
      ['as unknown', 'export const y = 0 as unknown;\n'],
      ['angle-bracket unknown', 'export const y = <unknown>0;\n'],
      ['as never', 'export const y = 0 as never;\n'],
      ['angle-bracket never', 'export const y = <never>0;\n']
    ])('flags %s', async (_name, code) => {
      const messages = await lintMessagesFor(code, CONSUMER_PATH, SYNTAX_RULE_ID);

      expect(messages).toHaveLength(1);
      expect(messages[0].severity).toBe(ERROR_SEVERITY);
    });
  });

  describe('does not flag safe code', () => {
    it('allows a cast to a precise type', async () => {
      const messages = await lintMessagesFor('export const y = 0 as number;\n', CONSUMER_PATH, SYNTAX_RULE_ID);

      expect(messages).toEqual([]);
    });
  });

  describe('exempts test files and testkit-js', () => {
    it.each([
      ['a package test file', PACKAGE_TEST_PATH],
      ['a testkit-js file', TESTKIT_PATH]
    ])('allows an unsafe cast in %s', async (_name, filePath) => {
      const messages = await lintMessagesFor('export const y = 0 as any;\n', filePath, SYNTAX_RULE_ID);

      expect(messages).toEqual([]);
    });
  });
});

// `no-restricted-syntax` carries two gates with different exemptions, and flat
// config replaces a rule's options wholesale: if one block matching a file were
// to shadow another, the shadowed gate would vanish with no lint error to show
// for it. One case per scope region, asserting exactly which gates are live
// there — an ordering mistake in eslint.config.mjs cannot pass all four.
describe('both no-restricted-syntax gates survive together', () => {
  const UNSAFE_CAST = 'export const y = 0 as any;\n';

  it('flags a cast and a dynamic v8 import in one package source file', async () => {
    const messages = await lintMessagesFor(dynamicImportStatement(V8_SUBPATH) + UNSAFE_CAST, CONSUMER_PATH, SYNTAX_RULE_ID);

    expect(messages).toHaveLength(2);
  });

  it('keeps the cast gate in protocol sources, where the v8 gate is exempt', async () => {
    const messages = await lintMessagesFor(UNSAFE_CAST, PROTOCOL_INTERNAL_PATH, SYNTAX_RULE_ID);

    expect(messages).toHaveLength(1);
  });

  it.each([
    ['a package test file', PACKAGE_TEST_PATH],
    ['a testkit-js file', TESTKIT_PATH]
  ])('keeps the v8 gate in %s, where the cast gate is exempt', async (_name, filePath) => {
    const messages = await lintMessagesFor(dynamicImportStatement(V8_SUBPATH), filePath, SYNTAX_RULE_ID);

    expect(messages).toHaveLength(1);
  });
});

describe('no-explicit-any canaries', () => {
  // Explicit 'any' is an error everywhere, tests included — a reviewed
  // exception needs an inline eslint-disable, keeping each occurrence visible
  // at the point of use.
  it.each([
    ['package sources', CONSUMER_PATH],
    ['a package test file', PACKAGE_TEST_PATH],
    ['a testkit-js file', TESTKIT_PATH]
  ])('flags an explicit any as an error in %s', async (_name, filePath) => {
    const messages = await lintMessagesFor('export const f = (x: any): number => 0;\n', filePath, EXPLICIT_ANY_RULE_ID);

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(ERROR_SEVERITY);
  });
});

describe('unused eslint-disable directives', () => {
  it('reports an unused disable directive as an error', async () => {
    const code = '// eslint-disable-next-line no-restricted-syntax\nexport const y = 0;\n';

    const [result] = await eslint.lintText(code, { filePath: CONSUMER_PATH });
    const unused = result.messages.filter((m) => m.message.includes('Unused eslint-disable directive'));

    expect(unused).toHaveLength(1);
    expect(unused[0].severity).toBe(ERROR_SEVERITY);
  });
});
