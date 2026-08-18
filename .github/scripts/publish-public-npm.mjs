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
// Publish the built workspaces to the public npm registry under a *target* scope
// (default @midnightntwrk) via npm OIDC trusted publishing — additive to, and
// independent of, the existing @midnight-ntwrk GitHub-registry publish.
//
// Strategy (Option A): for each publishable workspace,
//   1. `yarn pack` it — Yarn resolves `workspace:*` deps to concrete versions,
//   2. rewrite the scope in the packed package.json (own name + internal deps),
//   3. re-tar and `npm publish <tarball>` to registry.npmjs.org with --provenance.
//
// Publishing a tarball (not a directory) means no prepare/prepack lifecycle
// scripts run at publish time — they already ran during `yarn pack`. This mirrors
// how midnight-ntwrk/artifacts publishes a packed .tgz.
//
// OIDC: no NPM_TOKEN is used. When this runs in GitHub Actions with
// `id-token: write` and the target package has this repo+workflow registered as a
// Trusted Publisher on npmjs.com, npm performs the OIDC token exchange itself.
//
// Env:
//   MIDNIGHT_SOURCE_SCOPE     source scope to rewrite from   (default "@midnight-ntwrk")
//   MIDNIGHT_TARGET_SCOPE     target scope to publish under  (default "@midnightntwrk")
//   MIDNIGHT_WORKSPACE_GLOB   workspace dir to scan          (default "packages")
//   MIDNIGHT_PUBLISH_DRY_RUN  "true" => npm publish --dry-run (no upload)
//   MIDNIGHT_NPM_REGISTRY     public registry                (default "https://registry.npmjs.org")

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE_SCOPE = process.env.MIDNIGHT_SOURCE_SCOPE || '@midnight-ntwrk';
const TARGET_SCOPE = process.env.MIDNIGHT_TARGET_SCOPE || '@midnightntwrk';
const WORKSPACE_GLOB = process.env.MIDNIGHT_WORKSPACE_GLOB || 'packages';
const NPM_REGISTRY = process.env.MIDNIGHT_NPM_REGISTRY || 'https://registry.npmjs.org';
const DRY_RUN = process.env.MIDNIGHT_PUBLISH_DRY_RUN === 'true';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const runCapture = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

// release version -> "latest"; pre-release -> alpha/beta/rc tag; otherwise "prerelease".
const distTagFor = (version) => {
  if (!version.includes('-')) return 'latest';
  const m = version.match(/-(alpha|beta|rc)\b/i);
  return m ? m[1].toLowerCase() : 'prerelease';
};

// Rewrite SOURCE_SCOPE -> TARGET_SCOPE in the package name and every dependency key.
const rewriteScope = (pkg) => {
  if (typeof pkg.name === 'string' && pkg.name.startsWith(`${SOURCE_SCOPE}/`)) {
    pkg.name = pkg.name.replace(`${SOURCE_SCOPE}/`, `${TARGET_SCOPE}/`);
  }
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const key of Object.keys(deps)) {
      if (key.startsWith(`${SOURCE_SCOPE}/`)) {
        const newKey = key.replace(`${SOURCE_SCOPE}/`, `${TARGET_SCOPE}/`);
        deps[newKey] = deps[key];
        delete deps[key];
      }
    }
  }
  return pkg;
};

// Rewrite SOURCE_SCOPE -> TARGET_SCOPE inside built JS/DTS files. Compiled
// bundles carry literal import specifiers — including the protocol package's
// self-reference used by loadV8() — which must match the rewritten package
// names or they fail to resolve in the published copy.
const rewriteScopeInFiles = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteScopeInFiles(fullPath);
    } else if (/\.(m|c)?[jt]s$/.test(entry.name)) {
      const content = readFileSync(fullPath, 'utf8');
      if (content.includes(`${SOURCE_SCOPE}/`)) {
        writeFileSync(fullPath, content.replaceAll(`${SOURCE_SCOPE}/`, `${TARGET_SCOPE}/`));
      }
    }
  }
};

const discoverWorkspaces = () => {
  const root = join(process.cwd(), WORKSPACE_GLOB);
  if (!existsSync(root)) {
    throw new Error(`Workspace dir not found: ${root}`);
  }
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(root, d.name))
    .filter((dir) => existsSync(join(dir, 'package.json')));
};

const publishWorkspace = (dir) => {
  const pkgJsonPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  if (pkg.private) {
    console.log(`  skip (private): ${pkg.name}`);
    return { skipped: true };
  }

  const sourceName = pkg.name;
  const version = pkg.version;
  const targetName = sourceName.replace(`${SOURCE_SCOPE}/`, `${TARGET_SCOPE}/`);
  const tag = distTagFor(version);
  console.log(`\n=== ${sourceName}@${version} -> ${targetName} (tag: ${tag}) ===`);

  const work = mkdtempSync(join(tmpdir(), 'mn-pub-'));
  const tgz = join(work, 'pack.tgz');

  // 1. Pack the workspace (Yarn resolves workspace:* -> concrete versions).
  run('yarn', ['pack', '--out', tgz], { cwd: dir });

  // 2. Extract; npm tarballs nest everything under "package/".
  run('tar', ['-xzf', tgz, '-C', work]);
  const extractedPkgJson = join(work, 'package', 'package.json');
  const packed = JSON.parse(readFileSync(extractedPkgJson, 'utf8'));

  // 3. Rewrite scope on name + internal deps, write back; then rewrite the
  //    specifiers baked into the built files so they match the new names.
  rewriteScope(packed);
  writeFileSync(extractedPkgJson, `${JSON.stringify(packed, null, 2)}\n`);
  rewriteScopeInFiles(join(work, 'package'));

  // 4. Re-tar preserving the "package/" prefix.
  const rewrittenTgz = join(work, 'publish.tgz');
  run('tar', ['-czf', rewrittenTgz, '-C', work, 'package']);

  // 5. Publish via npm (OIDC trusted publishing — no token).
  const publishArgs = [
    'publish',
    rewrittenTgz,
    '--registry',
    NPM_REGISTRY,
    '--access',
    'public',
    '--provenance',
    '--tag',
    tag
  ];
  if (DRY_RUN) publishArgs.push('--dry-run');

  console.log(`  npm ${publishArgs.join(' ')}`);
  run('npm', publishArgs);
  return { published: targetName, version, tag };
};

const main = () => {
  console.log('='.repeat(70));
  console.log(`Publish ${SOURCE_SCOPE}/* -> ${TARGET_SCOPE}/* on ${NPM_REGISTRY}`);
  console.log(`Workspaces: ./${WORKSPACE_GLOB}/*  |  dry-run: ${DRY_RUN}`);
  console.log(`npm: ${runCapture('npm', ['--version'])}`);
  console.log('='.repeat(70));

  const results = [];
  for (const dir of discoverWorkspaces()) {
    results.push(publishWorkspace(dir));
  }

  const published = results.filter((r) => r.published);
  console.log(`\nDone. Published ${published.length} package(s) to ${TARGET_SCOPE}:`);
  for (const r of published) console.log(`  ${r.published}@${r.version} (${r.tag})`);
};

main();
