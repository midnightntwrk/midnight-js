/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

const MONOREPO_ROOT = resolve(__dirname, '../../../..');
const CONFIG_FILE = resolve(MONOREPO_ROOT, 'eslint.config.mjs');

// File paths used to exercise the rule. The ESLint rule's override applies to
// files matching `packages/protocol/src/**/*.ts`; everything else is a
// "consumer" and must go through the protocol ACL.
const CONSUMER_PATH = 'packages/contracts/src/some-consumer.ts';
const PROTOCOL_INTERNAL_PATH = 'packages/protocol/src/some-reexport.ts';
const TYPED_WRAPPERS_PATH = 'packages/utils/src/deserialization/typed-wrappers.ts';
const TEST_FILE_PATH = 'packages/contracts/src/test/some.test.ts';
const ACL_REPLACEMENT_PREFIX = '@midnight-ntwrk/midnight-js-protocol';
const RULE_ID = 'no-restricted-imports';
const SYNTAX_RULE_ID = 'no-restricted-syntax';
const DIST_IMPORT_MESSAGE = 'Direct imports from dist folders';

// The ESLint constructor only stores options — config resolution happens
// lazily inside `lintText` — so eager initialisation here is cheap and lets
// `eslint` stay a module-level `const`.
const eslint = new ESLint({
  overrideConfigFile: CONFIG_FILE,
  cwd: MONOREPO_ROOT
});

const importStatement = (moduleSpecifier: string): string => `import { foo } from '${moduleSpecifier}';\n`;

const lintRestricted = async (code: string, filePath: string): Promise<Linter.LintMessage[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === RULE_ID);
};

const lintSyntaxRestricted = async (code: string, filePath: string): Promise<Linter.LintMessage[]> => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === SYNTAX_RULE_ID);
};

// The first `lintText` call pays a one-time cost: loading the root ESLint
// config, instantiating plugins, and warming `eslint-import-resolver-typescript`
// which reads every `tsconfig.json` across the monorepo. Under parallel CI
// load that can exceed the 5s per-test default. Warming once in a hook keeps
// individual tests fast and deterministic.
beforeAll(async () => {
  await eslint.lintText(importStatement('@midnight-ntwrk/ledger-v8'), { filePath: CONSUMER_PATH });
}, 60_000);

describe('Protocol ACL: no-restricted-imports rule', () => {
  describe('flags direct imports from consumer packages', () => {
    it.each([
      ['@midnight-ntwrk/ledger-v8', `${ACL_REPLACEMENT_PREFIX}/ledger`],
      ['@midnight-ntwrk/compact-runtime', `${ACL_REPLACEMENT_PREFIX}/compact-runtime`],
      ['@midnight-ntwrk/compact-js', `${ACL_REPLACEMENT_PREFIX}/compact-js`],
      ['@midnight-ntwrk/compact-js/effect', `${ACL_REPLACEMENT_PREFIX}/compact-js`],
      ['@midnight-ntwrk/onchain-runtime-v3', `${ACL_REPLACEMENT_PREFIX}/onchain-runtime`],
      ['@midnight-ntwrk/platform-js', `${ACL_REPLACEMENT_PREFIX}/platform-js`],
      ['@midnight-ntwrk/platform-js/effect/Configuration', `${ACL_REPLACEMENT_PREFIX}/platform-js`]
    ])('flags direct import of %s and points to %s', async (restricted, expectedReplacement) => {
      const messages = await lintRestricted(importStatement(restricted), CONSUMER_PATH);

      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain(restricted);
      expect(messages[0].message).toContain(expectedReplacement);
    });

    // Future-proofing: if a new ledger major version is added (e.g. ledger-v9),
    // the rule's wildcard pattern must still flag it. This guards the wildcard.
    it.each([
      ['ledger', '@midnight-ntwrk/ledger-v99'],
      ['onchain-runtime', '@midnight-ntwrk/onchain-runtime-v99']
    ])('flags hypothetical future %s majors via the wildcard pattern', async (_name, futureSpecifier) => {
      const messages = await lintRestricted(importStatement(futureSpecifier), CONSUMER_PATH);
      expect(messages).toHaveLength(1);
    });
  });

  describe('allows imports via the protocol ACL', () => {
    it.each([
      ACL_REPLACEMENT_PREFIX,
      `${ACL_REPLACEMENT_PREFIX}/ledger`,
      `${ACL_REPLACEMENT_PREFIX}/compact-runtime`,
      `${ACL_REPLACEMENT_PREFIX}/compact-js`,
      `${ACL_REPLACEMENT_PREFIX}/compact-js/effect`,
      `${ACL_REPLACEMENT_PREFIX}/compact-js/effect/Contract`,
      `${ACL_REPLACEMENT_PREFIX}/onchain-runtime`,
      `${ACL_REPLACEMENT_PREFIX}/platform-js`,
      `${ACL_REPLACEMENT_PREFIX}/platform-js/effect/Configuration`,
      `${ACL_REPLACEMENT_PREFIX}/platform-js/effect/ContractAddress`
    ])('allows consumer package to import from %s', async (protocolSubpath) => {
      const messages = await lintRestricted(importStatement(protocolSubpath), CONSUMER_PATH);
      expect(messages).toEqual([]);
    });
  });

  describe('override for packages/protocol/src/', () => {
    it.each([
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/compact-js/effect',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/platform-js'
    ])('allows direct import of %s inside packages/protocol/src/', async (pkg) => {
      const messages = await lintRestricted(importStatement(pkg), PROTOCOL_INTERNAL_PATH);
      expect(messages).toEqual([]);
    });

    it('still forbids dist imports inside packages/protocol/src/', async () => {
      const messages = await lintRestricted(importStatement('../dist/whatever'), PROTOCOL_INTERNAL_PATH);
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain(DIST_IMPORT_MESSAGE);
    });
  });
});

// Forbids raw `.deserialize`/`.decode` calls on ledger/runtime types from
// consumer packages — spec issue-816 §10.4 (D5/D13).
describe('Deserialization ACL: no-restricted-syntax rule', () => {
  describe('flags raw .deserialize calls on ledger/runtime types from consumer packages', () => {
    it.each([
      'ContractState',
      'LedgerContractState',
      'CompactContractState',
      'ZswapChainState',
      'Transaction',
      'LedgerTransaction',
      'LedgerParameters'
    ])('flags %s.deserialize(buf) from a consumer file', async (typeName) => {
      const code = `const x = ${typeName}.deserialize(new Uint8Array());\n`;

      const messages = await lintSyntaxRestricted(code, CONSUMER_PATH);

      expect(messages).toHaveLength(1);
      expect(messages[0].message).toMatch(/typed wrapper from @midnight-ntwrk\/midnight-js-utils/);
    });

    it.each(['StateValue', 'LedgerStateValue'])(
      'flags %s.decode(buf) from a consumer file',
      async (typeName) => {
        const code = `const x = ${typeName}.decode(new Uint8Array());\n`;

        const messages = await lintSyntaxRestricted(code, CONSUMER_PATH);

        expect(messages).toHaveLength(1);
        expect(messages[0].message).toMatch(/decodeLedgerStateValue/);
      }
    );

    it('does NOT flag .deserialize on unrelated types', async () => {
      const code = `const x = SomeUnrelatedClass.deserialize(new Uint8Array());\n`;

      const messages = await lintSyntaxRestricted(code, CONSUMER_PATH);

      expect(messages).toEqual([]);
    });
  });

  describe('allows raw calls inside the sanctioned typed-wrappers file', () => {
    it.each([
      'ContractState.deserialize(buf)',
      'ZswapChainState.deserialize(buf)',
      'LedgerStateValue.decode(buf)'
    ])('allows %s inside typed-wrappers.ts', async (call) => {
      const code = `const buf = new Uint8Array(); const x = ${call};\n`;

      const messages = await lintSyntaxRestricted(code, TYPED_WRAPPERS_PATH);

      expect(messages).toEqual([]);
    });
  });

  describe('allows raw calls inside test files (fixtures, canaries)', () => {
    it('allows ContractState.deserialize inside a *.test.ts file', async () => {
      const code = `const buf = new Uint8Array(); const x = ContractState.deserialize(buf);\n`;

      const messages = await lintSyntaxRestricted(code, TEST_FILE_PATH);

      expect(messages).toEqual([]);
    });
  });
});
