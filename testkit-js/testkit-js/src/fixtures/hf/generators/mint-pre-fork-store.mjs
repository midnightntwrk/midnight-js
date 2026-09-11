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

/**
 * Mints `pre-fork-private-state-store/`: one private state, written by THIS
 * checkout's provider, frozen so a later reader has bytes it did not write.
 *
 * DELIBERATELY NOT WIRED INTO `generate-all.mjs`, and it refuses to run without
 * `--accept-envelope-break`. Running this is not a way to fix a failing test --
 * it is how a maintainer ACCEPTS a persistence-format break, after deciding that
 * private state written by older releases may stop being readable. Read
 * `../pre-fork-private-state-store/ENVELOPE.md` first; it has to be updated in
 * the same change, and the consuming test enforces that.
 *
 * On the accepted path it verifies the state reads back before the bytes become
 * a fixture, removes LevelDB's runtime files, and prints the digest to record.
 */

import { deepStrictEqual } from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

import { digestDirectory } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STORE = resolve(HERE, '../pre-fork-private-state-store/store');
const ENVELOPE = resolve(HERE, '../pre-fork-private-state-store/ENVELOPE.md');

// LevelDB's own runtime files. Not part of the fixture: `LOG` carries wall-clock
// timestamps, so committing one would freeze a single machine's run log into a
// store whose entire value is byte determinism.
const RUNTIME_FILES = ['LOCK', 'LOG', 'LOG.old'];

// Every one of these is duplicated, on purpose, by the consuming test: the
// store is only readable when all four agree, so they are part of the fixture.
const PASSWORD = 'Fork-Window-Pass9!';
const ACCOUNT_ID = 'cross-window-account';
const CONTRACT_ADDRESS = `02${'1d'.repeat(31)}`;
const STATE_ID = 'private-counter-frozen';

// Synthetic. Nothing here is a real key, a real nullifier or a real balance --
// see the fixture's own README before mistaking it for a captured artifact.
const PRIVATE_STATE = {
  step: 7n,
  callCount: 1n,
  secretKey: Uint8Array.from({ length: 32 }, (_, index) => index),
  nullifiers: new Map([
    ['0xfeed', 3n],
    ['0xbeef', 9n]
  ])
};

// The destructive path is opt-in. Re-minting destroys the only evidence that a
// persistence-format break happened, so running this script to see what it does
// -- or reaching for it because a test went red -- must not take the fixture
// with it. The flag is the point at which a maintainer states they have read
// ENVELOPE.md and decided to accept the break.
const ACCEPT = '--accept-envelope-break';
if (!process.argv.includes(ACCEPT)) {
  console.error(
    [
      `Refusing to re-mint ${STORE}`,
      '',
      'Re-minting is how a maintainer ACCEPTS that private state written by earlier',
      'releases may stop being readable. It is NOT a way to make a failing test pass:',
      'doing that discards the only evidence the break occurred.',
      '',
      `Read ${ENVELOPE} first. If the break is intended, re-run with ${ACCEPT}.`
    ].join('\n')
  );
  process.exit(1);
}

rmSync(STORE, { recursive: true, force: true });

const openProvider = () => {
  const provider = levelPrivateStateProvider({
    midnightDbName: STORE,
    privateStoragePasswordProvider: () => PASSWORD,
    accountId: ACCOUNT_ID
  });
  provider.setContractAddress(CONTRACT_ADDRESS);
  return provider;
};

const provider = openProvider();
await provider.set(STATE_ID, PRIVATE_STATE);

// Read the state back before these bytes are treated as a fixture. `level.open()`
// creates CURRENT, MANIFEST-* and the log before anything is written, so a `set`
// that failed part-way leaves a structurally COMPLETE but empty store -- one that
// sails through the suite's digest gate and then fails its read as though the
// envelope had broken. Verified here so an empty mint never reaches a commit.
const verifier = openProvider();
await verifier.invalidateEncryptionCache();
const readBack = await verifier.get(STATE_ID);
if (readBack === null) {
  throw new Error(`minted ${STORE} but read back no state under "${STATE_ID}" -- refusing to leave an empty fixture`);
}
deepStrictEqual(readBack, PRIVATE_STATE, `state read back from ${STORE} is not the state written`);

// Drop LevelDB's runtime files BEFORE digesting, so the value printed is the one
// the suite will compute over the committed bytes. Doing this here rather than in
// a manual instruction also stops a stray `git add -A` sweeping them in.
for (const runtimeFile of RUNTIME_FILES) {
  rmSync(resolve(STORE, runtimeFile), { force: true });
}

console.log(`minted ${STORE}`);
console.log('');
console.log('Record this in a NEW generation section at the TOP of ENVELOPE.md,');
console.log('directly under "## Regenerating this store is not a fix", above the');
console.log('existing "## Generation N" headings -- the suite reads the FIRST');
console.log('"- digest:" line in the file:');
console.log('');
console.log(`- digest: ${digestDirectory(STORE)}`);
