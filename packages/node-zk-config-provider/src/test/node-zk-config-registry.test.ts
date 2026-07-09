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

import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ZKConfigRegistry } from '@midnight-ntwrk/midnight-js-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeZkConfigRegistry } from '../node-zk-config-provider';

/** Creates a compiled-contract artifact bundle: a directory with both `keys/` and `zkir/`. */
const makeBundle = async (dir: string): Promise<void> => {
  await mkdir(join(dir, 'keys'), { recursive: true });
  await mkdir(join(dir, 'zkir'), { recursive: true });
};

/** The directories the registry bound as sources, sorted for order-independent comparison. */
const discoveredDirs = (registry: ZKConfigRegistry): string[] =>
  (registry as unknown as { sources: { directory: string }[] }).sources.map((s) => s.directory).sort();

describe('nodeZkConfigRegistry', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'node-zk-config-registry-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('discovers bundles nested at any depth under the root', async () => {
    await makeBundle(join(root, 'contract-a'));
    await makeBundle(join(root, 'managed', 'contract-b'));

    const registry = await nodeZkConfigRegistry(root);

    expect(discoveredDirs(registry)).toEqual([join(root, 'contract-a'), join(root, 'managed', 'contract-b')].sort());
  });

  it('stops at a bundle and does not descend into a nested bundle', async () => {
    await makeBundle(join(root, 'outer'));
    await makeBundle(join(root, 'outer', 'inner'));

    const registry = await nodeZkConfigRegistry(root);

    // `outer` is a bundle, so discovery stops there; `outer/inner` is not registered separately.
    expect(discoveredDirs(registry)).toEqual([join(root, 'outer')]);
  });

  it('skips node_modules and hidden directories', async () => {
    await makeBundle(join(root, 'real'));
    await makeBundle(join(root, 'node_modules', 'dep'));
    await makeBundle(join(root, '.cache'));

    const registry = await nodeZkConfigRegistry(root);

    expect(discoveredDirs(registry)).toEqual([join(root, 'real')]);
  });

  it('treats a keys-only or zkir-only directory as a non-bundle', async () => {
    await mkdir(join(root, 'keys-only', 'keys'), { recursive: true });
    await mkdir(join(root, 'zkir-only', 'zkir'), { recursive: true });
    await makeBundle(join(root, 'complete'));

    const registry = await nodeZkConfigRegistry(root);

    expect(discoveredDirs(registry)).toEqual([join(root, 'complete')]);
  });

  it('throws when no bundle exists under the root', async () => {
    await mkdir(join(root, 'just-some-dir'), { recursive: true });

    await expect(nodeZkConfigRegistry(root)).rejects.toThrow(/No compiled contract artifact bundles/);
  });
});
