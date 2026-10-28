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

import { contracts, type protocol, PROTOCOL_ERROR_CODES, types, utils } from '../index';

// The positive compile assertions for the migration guide's recipes. Each recipe
// below is real code reaching the framework only through this barrel, so
// `yarn typecheck:tests` is what proves the guide's instructions compile for a
// reader who follows them.
//
// The recipes are not executed: each is a declaration or a function nobody calls.
// The v8 transaction class is a WASM class from `protocol/v8`, which this package
// may reference in a type position but not import at runtime.

// #region guide:narrowing-recipe
declare const describeNative: (tx: types.LedgerTransactionTypes['v9']['Finalized']) => string;
declare const describeRetained: (tx: types.LedgerTransactionTypes['v8']['Finalized']) => string;

const summarize = (record: types.VersionedFinalizedTxData): string => {
  switch (record.version) {
    case 'v9':
      return `native ${record.txId}: ${describeNative(types.LedgerTransaction.unwrap(record.tx, record.version))}`;
    case 'v8':
      return `retained ${record.txId}: ${describeRetained(types.LedgerTransaction.unwrap(record.tx, record.version))}`;
    default:
      return utils.assertNever(record, 'summarize');
  }
};
// #endregion guide:narrowing-recipe

// #region guide:read-record-tx
declare const publicDataProvider: types.PublicDataProvider;

const readIdentifiers = async (txId: string): Promise<string[]> => {
  const record = await publicDataProvider.watchForTxData(txId);
  const tx = types.LedgerTransaction.unwrap(record.tx, record.version);
  return tx.identifiers();
};
// #endregion guide:read-record-tx

// #region guide:submit-tx
declare const providers: types.MidnightProviders;
declare const ledgerUnprovenTx: types.LedgerTransactionTypes['v9']['Unproven'];

const submitBuiltTransaction = async (): Promise<types.VersionedFinalizedTxData> => {
  const unprovenTx = types.LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx);
  return contracts.submitTx(providers, { unprovenTx });
};
// #endregion guide:submit-tx

// #region guide:private-unproven-tx
type AnyContract = protocol.Contract.Any;
declare const callTx: contracts.UnsubmittedCallTxData<AnyContract, protocol.Contract.ProvableCircuitId<AnyContract>>;
declare const proofProvider: types.ProofProvider;
declare const inspect: (tx: types.LedgerTransactionTypes['v9']['Unproven']) => void;

const proveCall = async (): Promise<types.UnboundTx> => {
  const { unprovenTx } = callTx.private;
  if (unprovenTx.era === 'v9') {
    inspect(types.LedgerTransaction.unwrap(unprovenTx, 'v9'));
  }
  return proofProvider.proveTx(unprovenTx);
};
// #endregion guide:private-unproven-tx

// #region guide:per-era-handlers
declare const proveOnLedger8: (
  tx: types.LedgerTransactionTypes['v8']['Unproven']
) => Promise<types.LedgerTransactionTypes['v8']['Unbound']>;
declare const proveOnLedger9: (
  tx: types.LedgerTransactionTypes['v9']['Unproven']
) => Promise<types.LedgerTransactionTypes['v9']['Unbound']>;

const buildProofProvider = (): types.ProofProvider =>
  types.createProofProviderFromHandlers({
    v8: (tx) => proveOnLedger8(tx),
    v9: (tx) => proveOnLedger9(tx)
  });
// #endregion guide:per-era-handlers

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

const RECIPES = [
  { region: 'guide:narrowing-recipe', marker: 'const summarize', imports: 'types, utils' },
  { region: 'guide:read-record-tx', marker: 'const readIdentifiers', imports: 'types' },
  { region: 'guide:submit-tx', marker: 'const submitBuiltTransaction', imports: 'contracts, types' },
  { region: 'guide:private-unproven-tx', marker: 'const proveCall', imports: 'contracts, type protocol, types' },
  { region: 'guide:per-era-handlers', marker: 'const buildProofProvider', imports: 'types' }
] as const;

describe('migration guide recipes', () => {
  test.each(RECIPES)('the guide prints $region byte-identical to the code that compiles', ({ region, marker, imports }) => {
    // Arrange: a package cannot import itself by name, so the fence is asserted to be
    // exactly that import, a blank line, then the region this file compiles.
    const compiled = regionSource(region);
    const importLine = `import { ${imports} } from '${packageName()}';`;

    // Act.
    const printed = guideTypeScriptBlocks().filter((block) => block.includes(marker));

    // Assert.
    expect(printed).toEqual([`${importLine}\n\n${compiled}`]);
  });

  test('the compiled regions are the whole recipes, not emptied placeholders', () => {
    // Arrange / Act: guards the equality above passing on '' if both were emptied.
    const narrowing = regionSource('guide:narrowing-recipe');
    const recipes = [summarize, readIdentifiers, submitBuiltTransaction, proveCall, buildProofProvider];

    // Assert: both variants present, each unwrapping its own era's `tx`, closed by the
    // helper the chapter is about; and every other recipe reads or makes a handle.
    expect(narrowing).toContain('describeNative(types.LedgerTransaction.unwrap(record.tx, record.version))');
    expect(narrowing).toContain('describeRetained(types.LedgerTransaction.unwrap(record.tx, record.version))');
    expect(narrowing).toContain("utils.assertNever(record, 'summarize')");
    expect(regionSource('guide:read-record-tx')).toContain('types.LedgerTransaction.unwrap(record.tx, record.version)');
    expect(regionSource('guide:submit-tx')).toContain("types.LedgerTransaction.seal('v9', 'Unproven', ledgerUnprovenTx)");
    expect(regionSource('guide:private-unproven-tx')).toContain('callTx.private');
    expect(regionSource('guide:per-era-handlers')).toContain('v8: (tx) => proveOnLedger8(tx)');
    expect(recipes.map((recipe) => typeof recipe)).toEqual(recipes.map(() => 'function'));
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
