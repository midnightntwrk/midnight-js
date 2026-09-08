#!/usr/bin/env node
// This file is part of midnight-js.
// Copyright (C) 2025-2026 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Packs every publishable workspace into `packaging/.tarballs/` and writes a
// manifest of name -> tarball path.
//
// This is what makes the personas *consumers* rather than workspace members.
// A workspace link resolves through the monorepo's single hoisted tree, which
// is exactly the topology the split-topology milestone exists to stop assuming:
// it cannot show that two personas each resolve their own Compact runtime major,
// because in the monorepo there is only ever one.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PACKAGING_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(PACKAGING_DIR, '..');
const TARBALL_DIR = path.join(PACKAGING_DIR, '.tarballs');
const MANIFEST_PATH = path.join(TARBALL_DIR, 'manifest.json');

/** Workspaces that ship to a registry. `private: true` ones are not consumable. */
const publishableWorkspaces = () => {
  const listed = execFileSync('yarn', ['workspaces', 'list', '--json'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8'
  });
  return listed
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.location !== '.')
    .map((entry) => ({
      name: entry.name,
      location: entry.location,
      manifest: JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, entry.location, 'package.json'), 'utf8'))
    }))
    .filter((entry) => entry.manifest.private !== true);
};

const tarballName = (name) => `${name.replace('@', '').replace('/', '-')}.tgz`;

const main = () => {
  rmSync(TARBALL_DIR, { recursive: true, force: true });
  mkdirSync(TARBALL_DIR, { recursive: true });

  const workspaces = publishableWorkspaces();
  if (workspaces.length === 0) {
    throw new Error('No publishable workspaces found; refusing to write an empty manifest');
  }

  const manifest = {};
  for (const { name } of workspaces) {
    const target = path.join(TARBALL_DIR, tarballName(name));
    // `yarn pack` resolves `workspace:*` dependency ranges to the concrete
    // versions the release would carry, which is what makes the tarball a
    // faithful stand-in for the published artifact.
    execFileSync('yarn', ['workspace', name, 'pack', '--out', target], {
      cwd: REPOSITORY_ROOT,
      stdio: 'inherit'
    });
    manifest[name] = path.relative(PACKAGING_DIR, target);
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify({ packages: manifest }, null, 2)}\n`, 'utf8');
  process.stdout.write(`Packed ${workspaces.length} workspaces into ${path.relative(REPOSITORY_ROOT, TARBALL_DIR)}\n`);
};

main();
