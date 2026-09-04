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

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type Manifest = {
  documentation: string;
  baseCommit: string;
  classificationRule: string;
  versionedSeamTouchingFiles: string[];
  excludedFiles: string[];
  untouchedFiles: Record<string, string>;
  goldenFixtureInputHashes: Record<string, string>;
};

// Resolved relative to this file, which lives at packages/contracts/src/test/, three
// directories under the monorepo root -- matching the repo-relative paths recorded in
// the manifest (e.g. "packages/contracts/src/test/...").
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const MANIFEST_PATH = fileURLToPath(new URL('./non-regression-baseline-manifest.json', import.meta.url));

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;

// Sentinel returned in place of a sha256 when the file does not exist, so a deleted file
// fails through the same object-equality matcher as a changed one (a named diff), instead
// of throwing ENOENT before any matcher runs.
const FILE_MISSING = 'FILE-MISSING-see-non-regression-baseline-gate.test.ts';

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && 'code' in error;

const sha256OrMissing = (repoRelativePath: string): string => {
  try {
    const bytes = readFileSync(`${REPO_ROOT}${repoRelativePath}`);
    return createHash('sha256').update(bytes).digest('hex');
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') return FILE_MISSING;
    throw error;
  }
};

/** sha256 of every entry in `paths`, keyed by path, so a mismatch's `toEqual` diff names the file. */
const sha256MapOf = (paths: readonly string[]): Record<string, string> =>
  Object.fromEntries(paths.map((repoRelativePath) => [repoRelativePath, sha256OrMissing(repoRelativePath)]));

/** Recursively lists every `.ts` file under `dir`, as POSIX repo-relative paths from `REPO_ROOT`. */
const listTsFilesRecursively = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listTsFilesRecursively(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(absolutePath.slice(REPO_ROOT.length).split(path.sep).join('/'));
    }
  }
  return results;
};

// The six identifiers that put a file in `versionedSeamTouchingFiles` when its own import
// list names them (see manifest.classificationRule). Kept in sync with the manifest's prose
// by the equality assertions below, not by hand.
const VERSIONED_SEAM_IDENTIFIERS = [
  'FinalizedTxData',
  'VersionedFinalizedTxData',
  'VersionedTx',
  'unwrapV9',
  'requireV9',
  'requireV9Record'
];

const TEST_MOCKS_IMPORT_PATTERN = /from\s+'\.\.?\/test-mocks'/;

/**
 * Extracts every `import` statement from a source file's text -- not just a leading window --
 * so the classification below reads only "the file's own import list" (not a matching
 * identifier mentioned in a comment or string elsewhere in the file) without silently
 * truncating at the first comment or blank line that happens to sit between two imports.
 *
 * Tracks brace depth (so a multi-line `import { ... } from '...'` is captured whole) and
 * comment state, so both `//` line comments and block comments (from an opening `/*` marker
 * through its closing marker) are skipped rather than mistaken for the end of the import
 * list -- including the file's own license-header block comment, and a plain comment added
 * later between two real imports. Stops at the first top-level line that is genuinely none of:
 * blank, a comment, or an `import`.
 *
 * This split (a pure string -> string function, plus the thin file-reading wrapper below) is
 * deliberate: it lets the regression test below exercise the scanning logic directly against
 * a fixture string, instead of only ever seeing it run against files that happen not to have a
 * comment in this position today.
 */
const extractImportSection = (source: string): string => {
  const importLines: string[] = [];
  let braceDepth = 0;
  let inBlockComment = false;

  for (const line of source.split('\n')) {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    if (braceDepth === 0) {
      if (trimmed.length === 0) continue;
      if (trimmed.startsWith('//')) continue;
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlockComment = true;
        continue;
      }
      if (!trimmed.startsWith('import ')) break;
    }

    importLines.push(line);
    braceDepth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
  }

  return importLines.join('\n');
};

const importSectionOf = (repoRelativePath: string): string =>
  extractImportSection(readFileSync(`${REPO_ROOT}${repoRelativePath}`, 'utf8'));

/**
 * Re-derives, from an import section's text, whether it names one of the six versioned-seam
 * identifiers or imports from `./test-mocks` / `../test-mocks` (see manifest.classificationRule).
 * Split out from `isVersionedSeamTouching` below for the same testability reason as
 * `extractImportSection`.
 */
const isImportSectionVersionedSeamTouching = (importSection: string): boolean => {
  if (TEST_MOCKS_IMPORT_PATTERN.test(importSection)) return true;
  return VERSIONED_SEAM_IDENTIFIERS.some((identifier) => new RegExp(`\\b${identifier}\\b`).test(importSection));
};

/**
 * Re-derives, from a file's OWN import text, whether it belongs in `versionedSeamTouchingFiles`
 * (see manifest.classificationRule). This is deliberately NOT a manifest lookup: the whole
 * point of re-deriving is that moving a path between the manifest's two buckets, without
 * touching the file's actual imports, must not change this function's answer for that file.
 */
const isVersionedSeamTouching = (repoRelativePath: string): boolean =>
  isImportSectionVersionedSeamTouching(importSectionOf(repoRelativePath));

// Files this same task (3.1) adds to packages/contracts/src/test/** -- this gate test itself
// and the golden-fixture test that captures Step 2's deterministic stages. Neither existed at
// the manifest's base commit, so neither is walked into any of the manifest's buckets, and
// neither is a candidate for re-classification below.
const THIS_TASK_NEW_FILES = new Set(
  ['./non-regression-baseline-gate.test.ts', './non-regression-golden.test.ts'].map((relative) =>
    fileURLToPath(new URL(relative, import.meta.url)).slice(REPO_ROOT.length)
  )
);

const candidateFiles = (): string[] => {
  const excluded = new Set(manifest.excludedFiles);
  return listTsFilesRecursively(`${REPO_ROOT}packages/contracts/src/test`).filter(
    (repoRelativePath) => !excluded.has(repoRelativePath) && !THIS_TASK_NEW_FILES.has(repoRelativePath)
  );
};

/**
 * Guards the non-regression baseline captured for packages/contracts/src/test/** at base
 * commit 025133dbeec3d2aed32e335a55cde2853ee3fc12 (see non-regression-baseline-manifest.json
 * for the full classification rule and documentation).
 *
 * If the untouched-hash test fails on a file listed in `untouchedFiles`, that file changed
 * unexpectedly -- either revert the change, or, if the change is real and intended,
 * re-baseline: regenerate the manifest's sha256 values and land that as its own, dedicated,
 * no-production-change commit. Never edit this test to skip or weaken the check.
 *
 * If either classification test fails, a file's own imports no longer match where the
 * manifest says it belongs. Fix the manifest to match reality -- move the path to the bucket
 * its current imports actually put it in -- and, if it moved into `untouchedFiles`, hash it
 * too, in that same re-baselining commit. Editing only the manifest's bucket lists can never
 * make this pass without the file's own imports actually changing to match: both tests
 * re-derive each bucket from the files' own import text at runtime, not from the manifest.
 *
 * If the golden-fixture-input hash test fails, one of the compiled `shielded-map` inputs the
 * Step 2 golden fixture depends on changed (most likely: the contract was recompiled). Check
 * that first, and re-baseline both this manifest and the golden fixture together if so --
 * a stale, unhashed input would otherwise make a golden-stage failure look like a composition
 * regression when it is really just a moved input.
 */
describe('packages/contracts/src/test non-regression baseline gate', () => {
  it('every untouched file matches its recorded sha256 exactly, by name (a deletion fails through this matcher too, not a thrown ENOENT)', () => {
    // Guards against Minor 2: an emptied untouchedFiles would make this comparison
    // vacuously pass (`{}` equals `{}`), so the bucket's non-emptiness is asserted first.
    expect(Object.keys(manifest.untouchedFiles).length).toBeGreaterThan(0);

    const actual = sha256MapOf(Object.keys(manifest.untouchedFiles));
    expect(actual).toEqual(manifest.untouchedFiles);
  });

  it('the golden-fixture inputs (the compiled contract and its verifier key) match their recorded sha256', () => {
    const paths = Object.keys(manifest.goldenFixtureInputHashes);
    expect(paths.length).toBeGreaterThan(0);

    const actual = sha256MapOf(paths);
    expect(actual).toEqual(manifest.goldenFixtureInputHashes);
  });

  it('versionedSeamTouchingFiles matches what each candidate file\'s own imports actually say (re-derived, not read from the manifest)', () => {
    const derivedTouching = candidateFiles().filter(isVersionedSeamTouching);

    expect(derivedTouching.sort()).toEqual([...manifest.versionedSeamTouchingFiles].sort());
  });

  it('untouchedFiles is exactly the candidate files the re-derived classification does not call touching (catches new/removed/reclassified files)', () => {
    const derivedTouching = new Set(candidateFiles().filter(isVersionedSeamTouching));
    const derivedUntouched = candidateFiles().filter((repoRelativePath) => !derivedTouching.has(repoRelativePath));

    // A new file dropped into packages/contracts/src/test/** is, by construction, either
    // touching or untouched here -- there is no third "unclassified" outcome to slip past.
    expect(derivedUntouched.sort()).toEqual(Object.keys(manifest.untouchedFiles).sort());
  });

  describe('extractImportSection (regression: a comment between two imports must not truncate the scan)', () => {
    it('keeps scanning past a line comment interleaved between two imports', () => {
      const source = [
        "import { describe, expect, it } from 'vitest';",
        '',
        '// a comment sitting between two imports -- an ordinary, unremarkable edit',
        "import { createMockProviders } from './test-mocks';",
        '',
        "describe('example', () => {});"
      ].join('\n');

      const importSection = extractImportSection(source);

      // The second import, past the comment, must have been seen -- a truncated scan would
      // silently misclassify this file as NOT touching, even though it plainly imports
      // ./test-mocks.
      expect(importSection).toContain("from './test-mocks'");
      expect(isImportSectionVersionedSeamTouching(importSection)).toBe(true);
    });

    it('keeps scanning past a multi-line block comment interleaved between two imports', () => {
      const source = [
        "import { describe, expect, it } from 'vitest';",
        '/*',
        ' * a block comment sitting between two imports, spanning several lines',
        ' */',
        "import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';",
        '',
        "describe('example', () => {});"
      ].join('\n');

      const importSection = extractImportSection(source);

      expect(importSection).toContain('FinalizedTxData');
      expect(isImportSectionVersionedSeamTouching(importSection)).toBe(true);
    });

    it('still stops at the first real code line, so a matching identifier in a comment AFTER the imports is not picked up', () => {
      const source = [
        "import { describe, expect, it } from 'vitest';",
        '',
        '// see FinalizedTxData for context on why this test exists',
        "describe('example', () => {});"
      ].join('\n');

      const importSection = extractImportSection(source);

      // The comment above is not part of "the file's own import list" -- it comes after the
      // last real import, once the scan has already reached top-level code. Confirms this fix
      // tolerates a comment WITHIN the import list without regressing into scanning the whole
      // file (which would produce false positives from comments or strings in test bodies).
      expect(importSection).not.toContain('FinalizedTxData');
      expect(isImportSectionVersionedSeamTouching(importSection)).toBe(false);
    });
  });
});
