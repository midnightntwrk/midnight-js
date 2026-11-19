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

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { recordIntegrity, registryIntegrity, tarballIntegrity } from './publish-packages.mjs';

describe('package integrity', () => {
  let workDir;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'integrity-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('computes the same integrity npm records for the tarball', () => {
    writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({ name: 'tiny', version: '1.0.0' }));
    writeFileSync(path.join(workDir, 'index.js'), 'export {};\n');
    const pack = spawnSync('npm', ['pack', '--json', '--pack-destination', workDir], { cwd: workDir, encoding: 'utf8' });
    expect(pack.status).toBe(0);
    const [{ filename, integrity }] = Object.values(JSON.parse(pack.stdout));

    const computed = tarballIntegrity(path.join(workDir, filename));

    expect(computed).toBe(integrity);
  });

  it('appends one line per package, so both publish runs end up in one file', () => {
    const manifest = path.join(workDir, 'published-packages.txt');

    recordIntegrity(manifest, { integrity: 'sha512-a', name: '@midnightntwrk/midnight-js', version: '5.1.0', status: 'published' });
    recordIntegrity(manifest, { integrity: 'sha512-b', name: '@midnightntwrk/testkit-js', version: '5.1.0', status: 'skipped' });

    expect(readFileSync(manifest, 'utf8')).toBe(
      'sha512-a  @midnightntwrk/midnight-js@5.1.0  published\nsha512-b  @midnightntwrk/testkit-js@5.1.0  skipped\n'
    );
  });

  it('refuses a value that is not a sha512 integrity and writes nothing', () => {
    const manifest = path.join(workDir, 'published-packages.txt');

    const record = () =>
      recordIntegrity(manifest, { integrity: '', name: '@midnightntwrk/midnight-js', version: '5.1.0', status: 'skipped' });

    expect(record).toThrow('@midnightntwrk/midnight-js@5.1.0: "" is not a sha512 integrity');
    expect(existsSync(manifest)).toBe(false);
  });
});

describe('registryIntegrity', () => {
  const NPMJS = { registry: 'https://registry.npmjs.org/' };
  const notFound = () => Object.assign(new Error('npm view failed'), { status: 1, stderr: 'npm error code E404' });

  it('asks again while the registry still answers not found after a publish', () => {
    let calls = 0;
    const view = () => {
      calls += 1;
      if (calls < 3) throw notFound();
      return 'sha512-abc';
    };

    const integrity = registryIntegrity('@midnightntwrk/midnight-js', '5.1.0', NPMJS, { view, attempts: 3, waitMs: 0 });

    expect({ integrity, calls }).toEqual({ integrity: 'sha512-abc', calls: 3 });
  });

  it('fails with the package and registry once every attempt answered not found', () => {
    let calls = 0;
    const view = () => {
      calls += 1;
      throw notFound();
    };

    const lookup = () => registryIntegrity('@midnightntwrk/midnight-js', '5.1.0', NPMJS, { view, attempts: 3, waitMs: 0 });

    expect(lookup).toThrow(
      'npm view @midnightntwrk/midnight-js@5.1.0 dist.integrity on https://registry.npmjs.org/ failed after 3 attempt(s)'
    );
    expect(calls).toBe(3);
  });

  it('does not ask again after an error other than not found', () => {
    let calls = 0;
    const view = () => {
      calls += 1;
      throw Object.assign(new Error('npm view failed'), { status: 1, stderr: 'npm error code E401' });
    };

    const lookup = () => registryIntegrity('@midnightntwrk/midnight-js', '5.1.0', NPMJS, { view, attempts: 3, waitMs: 0 });

    expect(lookup).toThrow('failed after 1 attempt(s)');
    expect(calls).toBe(1);
  });
});
