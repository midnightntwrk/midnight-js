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
// dependency order, to:
//   1. @midnightntwrk  on registry.npmjs.org  (OIDC trusted publishing + provenance)
//   2. @midnight-ntwrk on registry.npmjs.org  (transitional alias, OIDC + provenance)
//   3. @midnight-ntwrk on npm.pkg.github.com  (token from the .npmrc that
//      setup-build-env writes from NODE_AUTH_TOKEN)
//
// Each workspace is packed once with `yarn pack` (resolves `workspace:*`). The
// alias is that tarball unpacked with this repo's own package names renamed in
// package.json and in built files: bundles keep sibling import specifiers
// verbatim, so without it the alias would pull in the canonical packages.
// External dependencies keep their scope.
//
// A version already present on a target is skipped, so re-running a failed
// publish finishes it.
//
// npmjs trusted publishing checks the calling workflow (ci.yml for the reusable
// prerelease workflows) and its environment; every package in both scopes needs
// those registered on npmjs.com.
//
// Env:
//   MIDNIGHT_WORKSPACE_DIR    workspace dir to publish ("packages" | "testkit-js")
//   MIDNIGHT_PUBLISH_DRY_RUN  "true" => npm publish --dry-run

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_SCOPE = '@midnightntwrk';
const ALIAS_SCOPE = '@midnight-ntwrk';
const NPMJS = 'https://registry.npmjs.org/';
const GITHUB_PACKAGES = 'https://npm.pkg.github.com/';
const MIN_NPM_FOR_OIDC = '11.5.1';

const TARGETS = [
  { scope: CANONICAL_SCOPE, registry: NPMJS, provenance: true },
  { scope: ALIAS_SCOPE, registry: NPMJS, provenance: true },
  { scope: ALIAS_SCOPE, registry: GITHUB_PACKAGES, provenance: false }
];

const WORKSPACE_DIR = process.env.MIDNIGHT_WORKSPACE_DIR || 'packages';
const DRY_RUN = process.env.MIDNIGHT_PUBLISH_DRY_RUN === 'true';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const assertNpmSupportsOidc = () => {
  const have = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  const [a, b] = [have, MIN_NPM_FOR_OIDC].map((v) => v.split('.').map(Number));
  const tooOld = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  if (tooOld < 0) {
    throw new Error(`npm ${have} < ${MIN_NPM_FOR_OIDC}: OIDC trusted publishing unsupported. Bump .nvmrc.`);
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

// The capture is greedy, so `midnight-js-types` is never read as `midnight-js`.
const CANONICAL_REF = /@midnightntwrk\/([a-z0-9._-]+)/g;

export const aliasRewriter = (ownNames) => {
  const own = new Set(ownNames.map((n) => n.slice(CANONICAL_SCOPE.length + 1)));
  const alias = (text) =>
    text.replace(CANONICAL_REF, (match, bare) => (own.has(bare) ? `${ALIAS_SCOPE}/${bare}` : match));
  alias.leftoverIn = (text) =>
    [...text.matchAll(CANONICAL_REF)].filter(([, bare]) => own.has(bare)).map(([match]) => match);
  return alias;
};

const rewriteManifest = (pkg, alias) => {
  pkg.name = alias(pkg.name);
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    pkg[field] = Object.fromEntries(Object.entries(deps).map(([name, range]) => [alias(name), range]));
  }
  return pkg;
};

const BUILT_FILE = /\.(m|c)?[jt]s$/;

const forEachBuiltFile = (dir, fn) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) forEachBuiltFile(fullPath, fn);
    else if (BUILT_FILE.test(entry.name)) fn(fullPath);
  }
};

const rewriteBuiltFiles = (dir, alias) =>
  forEachBuiltFile(dir, (file) => {
    const content = readFileSync(file, 'utf8');
    const rewritten = alias(content);
    if (rewritten !== content) writeFileSync(file, rewritten);
  });

const assertFullyAliased = (dir, alias) => {
  const manifest = readFileSync(join(dir, 'package.json'), 'utf8');
  const leftovers = [manifest];
  forEachBuiltFile(dir, (file) => leftovers.push(readFileSync(file, 'utf8')));
  const found = leftovers.flatMap((text) => alias.leftoverIn(text));
  if (!JSON.parse(manifest).name.startsWith(`${ALIAS_SCOPE}/`) || found.length > 0) {
    throw new Error(`alias package in ${dir} still references canonical names: ${[...new Set(found)].join(', ')}`);
  }
};

const registryArgs = (target) => ['--registry', target.registry, `--${target.scope}:registry=${target.registry}`];

const isPublished = (name, version, target) => {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version', ...registryArgs(target)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return out.trim() === version;
  } catch (err) {
    const stderr = String(err.stderr ?? '');
    if (err.status === 1 && /npm error code E404/.test(stderr)) return false;
    throw new Error(`npm view ${name}@${version} on ${target.registry} failed:\n${stderr}`, { cause: err });
  }
};

const packArtifacts = (dir, alias) => {
  const work = mkdtempSync(join(tmpdir(), 'mn-pub-'));
  const canonical = join(work, 'canonical.tgz');
  run('yarn', ['pack', '--out', canonical], { cwd: dir });

  run('tar', ['-xzf', canonical, '-C', work]);
  const aliased = join(work, 'package');
  const manifestPath = join(aliased, 'package.json');
  const manifest = rewriteManifest(JSON.parse(readFileSync(manifestPath, 'utf8')), alias);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  rewriteBuiltFiles(aliased, alias);
  assertFullyAliased(aliased, alias);

  return { [CANONICAL_SCOPE]: canonical, [ALIAS_SCOPE]: aliased };
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

const publishWorkspace = (workspace, alias, results) => {
  const { name, version, private: isPrivate } = JSON.parse(readFileSync(join(workspace.location, 'package.json'), 'utf8'));
  if (isPrivate) {
    console.log(`\nskip (private): ${name}`);
    return;
  }
  console.log(`\n=== ${name}@${version} ===`);
  const tag = distTagFor(version);
  const artifacts = packArtifacts(workspace.location, alias);
  for (const target of TARGETS) {
    const targetName = target.scope === ALIAS_SCOPE ? alias(name) : name;
    const status = publishArtifact(artifacts[target.scope], targetName, version, tag, target);
    results.push({ name: targetName, version, registry: target.registry, status });
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
  const alias = aliasRewriter(workspaces.map((w) => w.name).filter((n) => n.startsWith(`${CANONICAL_SCOPE}/`)));
  const toPublish = inDependencyOrder(workspaces).filter((w) => w.location.startsWith(`${WORKSPACE_DIR}/`));
  if (toPublish.length === 0) throw new Error(`No workspaces found under ./${WORKSPACE_DIR}`);

  const results = [];
  try {
    for (const workspace of toPublish) publishWorkspace(workspace, alias, results);
  } finally {
    printSummary(results);
  }
};

const runDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runDirectly) main();
