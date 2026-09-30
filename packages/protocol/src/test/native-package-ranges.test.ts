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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// A consumer's install carries none of the root `resolutions`, therefore it resolves each range on its
// own: two ranges for one native package become two copies once a release matches only one of them,
// and each copy's WASM classes reject the other's objects ("expected instance of StateValue"). This
// reads what the published packages declare, because this repo's lockfile is forced to one copy anyway.

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly isPrivate: boolean;
  readonly dependencies: ReadonlyMap<string, string>;
}

const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? new Map<string, unknown>(Object.entries(value)).get(key) : undefined;

const readJson = (filePath: string): unknown => JSON.parse(readFileSync(filePath, 'utf8'));

const readManifest = (manifestPath: string): Manifest => {
  const parsed = readJson(manifestPath);
  const name = fieldOf(parsed, 'name');
  const version = fieldOf(parsed, 'version');
  if (typeof name !== 'string' || typeof version !== 'string') {
    throw new Error(`${manifestPath} declares no string \`name\` and \`version\``);
  }
  const declared = fieldOf(parsed, 'dependencies');
  const dependencies = new Map<string, string>();
  if (typeof declared === 'object' && declared !== null) {
    for (const [dependency, range] of new Map<string, unknown>(Object.entries(declared))) {
      if (typeof range === 'string') {
        dependencies.set(dependency, range);
      }
    }
  }
  return { name, version, isPrivate: fieldOf(parsed, 'private') === true, dependencies };
};

/** The workspace directories the root manifest's `<dir>/*` globs name. */
const workspaceDirs = (): string[] => {
  const globs = fieldOf(readJson(path.join(repoRoot, 'package.json')), 'workspaces');
  if (!Array.isArray(globs)) {
    throw new Error('The root package.json declares no `workspaces` array');
  }
  return globs.flatMap((glob: unknown) => {
    if (typeof glob !== 'string' || !glob.endsWith('/*')) {
      throw new Error(`Workspace glob ${String(glob)} is not of the \`<dir>/*\` form this test reads`);
    }
    const parent = path.join(repoRoot, glob.slice(0, -2));
    return readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(parent, entry.name, 'package.json')))
      .map((entry) => path.join(parent, entry.name));
  });
};

/** The manifest Node loads for `name` from `fromDir`: the nearest `node_modules/<name>` up the tree. */
const installedManifest = (name: string, fromDir: string): Manifest => {
  let dir = fromDir;
  while (!existsSync(path.join(dir, 'node_modules', name, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`${name} is not installed anywhere ${fromDir} resolves from`);
    }
    dir = parent;
  }
  return readManifest(path.join(dir, 'node_modules', name, 'package.json'));
};

/**
 * Every range the published workspaces, and the packages they depend on, ask for `native` with,
 * mapped to who asks. One level down is where compact-runtime, compact-js and the wallet SDK sit.
 */
const rangesAskedFor = (native: string): Map<string, string[]> => {
  const askers = new Map<string, string[]>();
  const record = (range: string, asker: string): void => {
    askers.set(range, [...(askers.get(range) ?? []), asker]);
  };
  for (const dir of workspaceDirs()) {
    const workspace = readManifest(path.join(dir, 'package.json'));
    if (workspace.isPrivate) {
      continue;
    }
    for (const [dependency, range] of workspace.dependencies) {
      if (dependency === native) {
        record(range, workspace.name);
      } else if (!range.startsWith('workspace:')) {
        const upstream = installedManifest(dependency, dir);
        const upstreamRange = upstream.dependencies.get(native);
        if (upstreamRange !== undefined) {
          record(upstreamRange, `${dependency}@${upstream.version}`);
        }
      }
    }
  }
  return askers;
};

const expectOneRange = (native: string): void => {
  const askers = rangesAskedFor(native);
  const summary = [...askers].map(([range, who]) => `"${range}" from ${who.join(', ')}`).join('; ');

  expect(askers.size, summary).toBe(1);
};

describe('native package ranges a consumer resolves', () => {
  it.each(['@midnightntwrk/onchain-runtime-v4', '@midnight-ntwrk/onchain-runtime-v3', '@midnightntwrk/ledger-v8'])(
    'asks for %s with one range everywhere',
    (native) => {
      expectOneRange(native);
    }
  );

  // compact-js 3.0.0-rc.3 asks for `^1.0.0-rc.5` but protocol and the wallet SDK pin `1.0.0-rc.5`, therefore
  // moving protocol would only move the split. Expected to fail until compact-js pins it too; flip it then.
  it.fails('asks for @midnightntwrk/ledger-v9 with one range everywhere', () => {
    expectOneRange('@midnightntwrk/ledger-v9');
  });
});
