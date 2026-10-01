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
// Publishes every non-private workspace under MIDNIGHT_WORKSPACE_GLOB to:
//   1. @midnightntwrk  on registry.npmjs.org  (OIDC trusted publishing + provenance)
//   2. @midnight-ntwrk on registry.npmjs.org  (transitional alias, OIDC + provenance)
//   3. @midnight-ntwrk on npm.pkg.github.com  (GitHub Packages, NODE_AUTH_TOKEN)
//
// Each workspace is packed once with `yarn pack` (resolves `workspace:*`). The
// alias is that tarball unpacked, with only this repo's own packages renamed;
// external dependencies keep their scope. A version already present on a target is skipped, so a
// failed run can be re-run safely.
//
// npmjs uses OIDC: the job needs `id-token: write` and every package must have
// this repository + the calling workflow registered as a Trusted Publisher.
//
// Env:
//   MIDNIGHT_WORKSPACE_GLOB   workspace dir to publish ("packages" | "testkit-js")
//   MIDNIGHT_PUBLISH_DRY_RUN  "true" => npm publish --dry-run

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANONICAL_SCOPE = '@midnightntwrk';
const ALIAS_SCOPE = '@midnight-ntwrk';
const NPMJS = 'https://registry.npmjs.org/';
const GITHUB_PACKAGES = 'https://npm.pkg.github.com/';

const TARGETS = [
  { scope: CANONICAL_SCOPE, registry: NPMJS, provenance: true },
  { scope: ALIAS_SCOPE, registry: NPMJS, provenance: true },
  { scope: ALIAS_SCOPE, registry: GITHUB_PACKAGES, provenance: false }
];

const WORKSPACE_GLOB = process.env.MIDNIGHT_WORKSPACE_GLOB || 'packages';
const DRY_RUN = process.env.MIDNIGHT_PUBLISH_DRY_RUN === 'true';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });

const distTagFor = (version) => {
  if (!version.includes('-')) return 'latest';
  if (/-pre\./.test(version)) return 'pre';
  const m = version.match(/-(alpha|beta|rc)\b/i);
  return m ? m[1].toLowerCase() : 'prerelease';
};

const ownPackageNames = () =>
  execFileSync('yarn', ['workspaces', 'list', '--json'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).name)
    .filter((name) => name.startsWith(`${CANONICAL_SCOPE}/`));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aliasRewriter = (ownNames) => {
  const bareNames = ownNames.map((n) => escapeRegExp(n.slice(CANONICAL_SCOPE.length + 1)));
  const pattern = new RegExp(`${escapeRegExp(CANONICAL_SCOPE)}/(${bareNames.join('|')})(?=$|[/'"\`])`, 'g');
  return (text) => text.replace(pattern, `${ALIAS_SCOPE}/$1`);
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

const rewriteBuiltFiles = (dir, alias) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteBuiltFiles(fullPath, alias);
    } else if (/\.(m|c)?[jt]s$/.test(entry.name)) {
      const content = readFileSync(fullPath, 'utf8');
      const rewritten = alias(content);
      if (rewritten !== content) writeFileSync(fullPath, rewritten);
    }
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
    if (/E404/.test(String(err.stderr))) return false;
    throw err;
  }
};

const discoverWorkspaces = () => {
  const root = join(process.cwd(), WORKSPACE_GLOB);
  if (!existsSync(root)) throw new Error(`Workspace dir not found: ${root}`);
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(root, d.name))
    .filter((dir) => existsSync(join(dir, 'package.json')));
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

  return { [CANONICAL_SCOPE]: canonical, [ALIAS_SCOPE]: aliased };
};

const publishArtifact = (artifact, name, version, tag, target) => {
  const where = `${name}@${version} -> ${target.registry} (tag: ${tag})`;
  if (isPublished(name, version, target)) {
    console.log(`  skip (already published): ${where}`);
    return { name, version, target, status: 'skipped' };
  }
  const args = ['publish', artifact, ...registryArgs(target), '--access', 'public', '--tag', tag, '--ignore-scripts'];
  if (target.provenance) args.push('--provenance');
  if (DRY_RUN) args.push('--dry-run');
  console.log(`  publish: ${where}`);
  run('npm', args);
  return { name, version, target, status: DRY_RUN ? 'dry-run' : 'published' };
};

const publishWorkspace = (dir, alias) => {
  const { name, version, private: isPrivate } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (isPrivate) {
    console.log(`\nskip (private): ${name}`);
    return [];
  }
  console.log(`\n=== ${name}@${version} ===`);
  const tag = distTagFor(version);
  const artifacts = packArtifacts(dir, alias);
  return TARGETS.map((target) =>
    publishArtifact(artifacts[target.scope], target.scope === ALIAS_SCOPE ? alias(name) : name, version, tag, target)
  );
};

const main = () => {
  const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  console.log(`Publishing ./${WORKSPACE_GLOB}/* | dry-run: ${DRY_RUN} | npm ${npmVersion}`);
  const alias = aliasRewriter(ownPackageNames());
  const results = discoverWorkspaces().flatMap((dir) => publishWorkspace(dir, alias));

  console.log('\nSummary:');
  for (const r of results) console.log(`  ${r.status.padEnd(9)} ${r.name}@${r.version} -> ${r.target.registry}`);
};

main();
