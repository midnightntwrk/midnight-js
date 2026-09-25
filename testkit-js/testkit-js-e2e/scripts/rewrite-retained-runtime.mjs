#!/usr/bin/env node
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

// Points a retained-era twin at the retained Compact runtime.
//
// `compactc` emits the bare `@midnight-ntwrk/compact-runtime` specifier, which the
// root `resolutions` pin to the CURRENT runtime, so an untouched twin throws on
// import. `compact-runtime-ledger8` is this repository's alias for the retained
// one.
//
// @see docs/architecture/retained-era-coverage.md

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/** The specifier `compactc` emits, which the workspace pins to the current runtime. */
export const BARE_SPECIFIER = '@midnight-ntwrk/compact-runtime';

/** This repository's alias for the retained runtime. */
export const RETAINED_SPECIFIER = 'compact-runtime-ledger8';

/** The runtime version a retained-era artifact set must declare. */
export const RETAINED_RUNTIME_VERSION = '0.16.0';

/** The emitted files that name the runtime: the module and its declaration. */
const REWRITTEN_FILES = ['index.js', 'index.d.ts'];

/**
 * Rewrites one file's runtime specifier.
 *
 * Throws when the file names neither specifier, so a compiler that stopped
 * emitting the bare import cannot make this a silent no-op, and throws again when
 * the bare name survives in a form the replacement does not match — a differently
 * quoted import, or a subpath — rather than reporting the file as already done.
 *
 * @param file Absolute path of the emitted file.
 * @returns Whether the file had to be changed.
 */
const rewriteFile = (file) => {
  const before = readFileSync(file, 'utf8');
  if (!before.includes(`'${BARE_SPECIFIER}'`)) {
    if (before.includes(BARE_SPECIFIER)) {
      throw new Error(`${file} names '${BARE_SPECIFIER}' in a form this rewrite does not match`);
    }
    if (before.includes(`'${RETAINED_SPECIFIER}'`)) {
      return false;
    }
    throw new Error(`${file} names neither '${BARE_SPECIFIER}' nor '${RETAINED_SPECIFIER}'`);
  }
  const after = before.replaceAll(`'${BARE_SPECIFIER}'`, `'${RETAINED_SPECIFIER}'`);
  writeFileSync(file, after);
  // Compared whole rather than re-scanned for the specifier: `replaceAll` already
  // guarantees the specifier is gone, so re-checking it proves nothing, while a
  // truncated or partially flushed write passes that check and fails this one.
  const verified = readFileSync(file, 'utf8');
  if (verified !== after) {
    throw new Error(`${file} does not match what was written (${after.length} bytes out, ${verified.length} back)`);
  }
  return true;
};

/**
 * Refuses an artifact set the CURRENT toolchain produced: `resolveArtifactEra`
 * reads the era off this field.
 *
 * @param twinDir Absolute path of one twin's artifact set.
 */
const assertRetainedArtifacts = (twinDir) => {
  const infoFile = path.join(twinDir, 'compiler', 'contract-info.json');
  let info;
  try {
    info = JSON.parse(readFileSync(infoFile, 'utf8'));
  } catch (error) {
    throw new Error(`${infoFile} is not readable as JSON`, { cause: error });
  }
  if (typeof info !== 'object' || info === null) {
    throw new Error(`${infoFile} does not hold a JSON object`);
  }
  const declared = info['runtime-version'];
  if (declared !== RETAINED_RUNTIME_VERSION) {
    throw new Error(`${infoFile} declares runtime-version ${declared}, expected ${RETAINED_RUNTIME_VERSION}`);
  }
};

/**
 * Refuses a twin where any emitted file still names the bare specifier.
 *
 * {@link REWRITTEN_FILES} is a fixed list, and `compactc` is not a compiler this
 * repository controls: a version that emits one more module under `contract/`
 * would leave it resolving the current runtime while every guard above reported
 * success. This asks the directory rather than the list.
 *
 * @param twinDir Absolute path of one twin's artifact set.
 */
const assertNoBareSpecifierLeft = (twinDir) => {
  const contractDir = path.join(twinDir, 'contract');
  for (const entry of readdirSync(contractDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }
    const file = path.join(entry.parentPath, entry.name);
    if (readFileSync(file, 'utf8').includes(BARE_SPECIFIER)) {
      throw new Error(`${file} still names '${BARE_SPECIFIER}'; ${REWRITTEN_FILES.join(', ')} are not the whole set`);
    }
  }
};

/**
 * Rewrites every twin under a directory.
 *
 * @param root Directory holding one subdirectory per twin.
 * @returns The files that were changed.
 */
export const rewriteRetainedTwins = (root) => {
  const twins = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
  if (twins.length === 0) {
    throw new Error(`${root} holds no retained twins`);
  }
  const rewritten = [];
  for (const twinDir of twins) {
    assertRetainedArtifacts(twinDir);
    for (const name of REWRITTEN_FILES) {
      const file = path.join(twinDir, 'contract', name);
      if (!statSync(file, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`${twinDir} emitted no ${name}; compactc did not produce a complete artifact set`);
      }
      if (rewriteFile(file)) {
        rewritten.push(file);
      }
    }
    assertNoBareSpecifierLeft(twinDir);
  }
  return rewritten;
};

const main = () => {
  const [root] = process.argv.slice(2);
  if (root === undefined) {
    process.stderr.write('Usage: rewrite-retained-runtime.mjs <retained-twin-directory>\n');
    process.exit(1);
  }
  const rewritten = rewriteRetainedTwins(path.resolve(root));
  process.stdout.write(
    rewritten.length === 0
      ? `Every twin in ${root} already names ${RETAINED_SPECIFIER}\n`
      : `Pointed ${rewritten.length} file(s) at ${RETAINED_SPECIFIER}\n`
  );
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
