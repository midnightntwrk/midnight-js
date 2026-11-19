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
// Publishes every non-private workspace under MIDNIGHT_WORKSPACE_DIR, in
// dependency order, to @midnightntwrk on registry.npmjs.org (OIDC trusted
// publishing + provenance). Each workspace is packed with `yarn pack`, which
// resolves `workspace:*`.
//
// A version already on the registry is skipped, so re-running a failed publish
// finishes it.
//
// With MIDNIGHT_PUBLISHED_MANIFEST set, one line `<sha512 integrity>
// <name>@<version>  <status>` is appended per @midnightntwrk package; status is
// published, skipped or dry-run. The integrity has the format of `npm view
// <pkg>@<ver> dist.integrity`; in a dry run it is the local tarball's hash.
//
// npmjs trusted publishing checks the calling workflow (ci.yml for the reusable
// prerelease workflows) and its environment; every @midnightntwrk package needs
// those registered on npmjs.com.
//
// Env:
//   MIDNIGHT_WORKSPACE_DIR    workspace dir to publish ("packages" | "testkit-js")
//   MIDNIGHT_PUBLISH_DRY_RUN  "true" => npm publish --dry-run
//   MIDNIGHT_PUBLISHED_MANIFEST  optional file for the integrity lines

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_SCOPE = '@midnightntwrk';
const NPMJS = 'https://registry.npmjs.org/';
const MIN_NPM_FOR_OIDC = '11.5.1';

const TARGET = { scope: CANONICAL_SCOPE, registry: NPMJS, provenance: true };

const WORKSPACE_DIR = process.env.MIDNIGHT_WORKSPACE_DIR || 'packages';
const DRY_RUN = process.env.MIDNIGHT_PUBLISH_DRY_RUN === 'true';
const PUBLISHED_MANIFEST = process.env.MIDNIGHT_PUBLISHED_MANIFEST;

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const assertNpmSupportsOidc = () => {
  const have = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  const [a, b] = [have, MIN_NPM_FOR_OIDC].map((v) => v.split('.').map(Number));
  const tooOld = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  if (tooOld < 0) {
    throw new Error(`npm ${have} < ${MIN_NPM_FOR_OIDC}: OIDC trusted publishing unsupported. Bump the pin in .github/actions/setup-npm.`);
  }
  return have;
};

// CI prereleases are `<base>-pre.<sha>` and the base may itself carry `rc`, so
// `-pre.` must win before the alpha/beta/rc match.
const distTagFor = (version) => {
  if (!version.includes('-')) return 'latest';
  if (/-pre\./.test(version)) return 'pre';
  const m = version.match(/-(alpha|beta|rc)\b/i);
  return m ? m[1].toLowerCase() : 'prerelease';
};

const listWorkspaces = () =>
  execFileSync('yarn', ['workspaces', 'list', '--json', '--verbose'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

// Dependencies first, so a dist-tag never points at a package whose sibling
// dependency is not on the registry yet.
const inDependencyOrder = (workspaces) => {
  const byLocation = new Map(workspaces.map((w) => [w.location, w]));
  const ordered = [];
  const seen = new Set();
  const visit = (location) => {
    if (seen.has(location) || !byLocation.has(location)) return;
    seen.add(location);
    byLocation.get(location).workspaceDependencies.forEach(visit);
    ordered.push(byLocation.get(location));
  };
  workspaces.forEach((w) => visit(w.location));
  return ordered;
};

const registryArgs = (target) => ['--registry', target.registry, `--${target.scope}:registry=${target.registry}`];

const isNotFound = (err) => err.status === 1 && /npm error code E404/.test(String(err.stderr ?? ''));

const isPublished = (name, version, target) => {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version', ...registryArgs(target)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return out.trim() === version;
  } catch (err) {
    const stderr = String(err.stderr ?? '');
    if (isNotFound(err)) return false;
    throw new Error(`npm view ${name}@${version} on ${target.registry} failed:\n${stderr}`, { cause: err });
  }
};

export const tarballIntegrity = (file) => `sha512-${createHash('sha512').update(readFileSync(file)).digest('base64')}`;

const SHA512_INTEGRITY = /^sha512-[A-Za-z0-9+/]+={0,2}$/;

export const recordIntegrity = (manifestPath, { integrity, name, version, status }) => {
  if (!SHA512_INTEGRITY.test(integrity)) {
    throw new Error(`${name}@${version}: "${integrity}" is not a sha512 integrity`);
  }
  appendFileSync(manifestPath, `${integrity}  ${name}@${version}  ${status}\n`);
};

const npmViewIntegrity = (name, version, target) =>
  execFileSync('npm', ['view', `${name}@${version}`, 'dist.integrity', ...registryArgs(target)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// A skipped package may come from an earlier run, so only the registry knows its
// bytes. Right after a publish conflict npmjs may still answer "not found".
export const registryIntegrity = (name, version, target, { view = npmViewIntegrity, attempts = 10, waitMs = 30_000 } = {}) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return view(name, version, target);
    } catch (err) {
      if (attempt >= attempts || !isNotFound(err)) {
        throw new Error(
          `npm view ${name}@${version} dist.integrity on ${target.registry} failed after ${attempt} attempt(s):\n${String(err.stderr ?? '')}`,
          { cause: err }
        );
      }
      sleep(waitMs);
    }
  }
};

const pack = (dir) => {
  const tarball = join(mkdtempSync(join(tmpdir(), 'mn-pub-')), 'package.tgz');
  run('yarn', ['pack', '--out', tarball], { cwd: dir });
  return tarball;
};

// npmjs can serve a stale "not found" for minutes after a publish; the
// registry's own conflict answer is authoritative.
const PUBLISH_CONFLICT = /EPUBLISHCONFLICT|cannot publish over the previously published versions/;

const publishArtifact = (artifact, name, version, tag, target) => {
  const where = `${name}@${version} -> ${target.registry} (tag: ${tag})`;
  if (isPublished(name, version, target)) {
    console.log(`  skip (already published): ${where}`);
    return 'skipped';
  }
  const args = ['publish', artifact, ...registryArgs(target), '--access', 'public', '--tag', tag, '--ignore-scripts'];
  if (target.provenance) args.push('--provenance');
  if (DRY_RUN) args.push('--dry-run');
  console.log(`  publish: ${where}`);
  try {
    execFileSync('npm', args, { stdio: ['ignore', 'inherit', 'pipe'] });
  } catch (err) {
    const stderr = String(err.stderr ?? '');
    process.stderr.write(stderr);
    if (PUBLISH_CONFLICT.test(stderr)) {
      console.log(`  skip (registry reports already published): ${where}`);
      return 'skipped';
    }
    throw err;
  }
  return DRY_RUN ? 'dry-run' : 'published';
};

const publishWorkspace = (workspace, results) => {
  const { name, version, private: isPrivate } = JSON.parse(readFileSync(join(workspace.location, 'package.json'), 'utf8'));
  if (isPrivate) {
    console.log(`\nskip (private): ${name}`);
    return;
  }
  console.log(`\n=== ${name}@${version} ===`);
  const tag = distTagFor(version);
  const tarball = pack(workspace.location);
  const status = publishArtifact(tarball, name, version, tag, TARGET);
  results.push({ name, version, registry: TARGET.registry, status });
  if (PUBLISHED_MANIFEST) {
    const integrity = status === 'skipped' ? registryIntegrity(name, version, TARGET) : tarballIntegrity(tarball);
    recordIntegrity(PUBLISHED_MANIFEST, { integrity, name, version, status });
  }
};

const printSummary = (results) => {
  console.log('\nSummary:');
  for (const r of results) console.log(`  ${r.status.padEnd(9)} ${r.name}@${r.version} -> ${r.registry}`);
  if (DRY_RUN) console.log('::warning::DRY RUN - nothing was published');
};

const main = () => {
  const npmVersion = assertNpmSupportsOidc();
  console.log(`Publishing ./${WORKSPACE_DIR}/* | dry-run: ${DRY_RUN} | npm ${npmVersion}`);
  const workspaces = listWorkspaces();
  const toPublish = inDependencyOrder(workspaces).filter((w) => w.location.startsWith(`${WORKSPACE_DIR}/`));
  if (toPublish.length === 0) throw new Error(`No workspaces found under ./${WORKSPACE_DIR}`);

  const results = [];
  try {
    for (const workspace of toPublish) publishWorkspace(workspace, results);
  } finally {
    printSummary(results);
  }
};

const runDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runDirectly) main();
