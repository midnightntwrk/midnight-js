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
 * DELIBERATELY NOT WIRED INTO `generate-all.mjs`. Running this is not a way to
 * fix a failing test -- it is how a maintainer ACCEPTS a persistence-format
 * break, after deciding that private state written by older releases may stop
 * being readable. Read `../pre-fork-private-state-store/ENVELOPE.md` first; it
 * has to be updated in the same change, and the consuming test enforces that.
 */

import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

const HERE = dirname(fileURLToPath(import.meta.url));
const STORE = resolve(HERE, '../pre-fork-private-state-store/store');

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

rmSync(STORE, { recursive: true, force: true });

const provider = levelPrivateStateProvider({
  midnightDbName: STORE,
  privateStoragePasswordProvider: () => PASSWORD,
  accountId: ACCOUNT_ID
});
provider.setContractAddress(CONTRACT_ADDRESS);
await provider.set(STATE_ID, PRIVATE_STATE);

console.log(`minted ${STORE}`);
