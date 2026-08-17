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

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// Self-test for scripts/check-casts.sh: exercises the real script binary via
// spawnSync with argument arrays (never string-interpolated shell commands),
// against both the real repo (clean tree) and an isolated temp git repo
// (fresh unsafe cast) using the script's CHECK_CASTS_* env overrides.
const REPO_ROOT = join(__dirname, '../../../..');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/check-casts.sh');

const runScript = (env: Record<string, string | undefined>): ReturnType<typeof spawnSync> =>
  spawnSync('bash', [SCRIPT_PATH], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf-8'
  });

const tempDirs: string[] = [];

const makeTempGitRepo = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'check-casts-test-'));
  tempDirs.push(dir);
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/check-casts.sh', () => {
  it('exits 0 against the real, clean repository tree', () => {
    const result = runScript({});

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no new unsafe cast occurrences');
  });

  it('exits 1 and names the new hit when a fresh unsafe cast is introduced', () => {
    const repoDir = makeTempGitRepo();
    mkdirSync(join(repoDir, 'packages/example-pkg/src'), { recursive: true });
    mkdirSync(join(repoDir, 'scripts'), { recursive: true });
    writeFileSync(join(repoDir, 'packages/example-pkg/src/bad.ts'), 'const x = 1 as any;\n');
    writeFileSync(join(repoDir, 'scripts/cast-baseline.txt'), '');
    spawnSync('git', ['add', '-A'], { cwd: repoDir });

    const result = runScript({ CHECK_CASTS_ROOT_DIR: repoDir });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('packages/example-pkg/src/bad.ts');
    expect(result.stderr).toContain('as any');
  });
});
