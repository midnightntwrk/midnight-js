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

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// The guard inspects the git *index* (`git show :<file>`) of the repo it runs
// in, keyed off `git diff --cached`, both resolved against the child's working
// directory — so each test runs the real script with `cwd` pointed at a
// throwaway git repo. (No need to copy the script into the fixture: unlike the
// inject script, this one resolves nothing from its own location.)
const SCRIPT = path.join(fileURLToPath(new URL('.', import.meta.url)), 'check-no-source-leak.js');

const LEAK_MARKER = 'file:./.compact-runtime-home';
const LEAKY_PKG = JSON.stringify({ name: 'x', resolutions: { '@midnight-ntwrk/compact-runtime': LEAK_MARKER } }, null, 2);
const CLEAN_PKG = JSON.stringify({ name: 'x' }, null, 2);

let repo: string;

function git(...args: string[]): void {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
}

/** Write a file (creating parent dirs) relative to the repo root. */
function put(relPath: string, content: string): void {
  const full = path.join(repo, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function runGuard(cwd: string = repo): { status: number | null; stderr: string } {
  const result = spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr ?? '' };
}

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'no-source-leak-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('commit', '--allow-empty', '-q', '-m', 'init');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('check-no-source-leak.js', () => {
  it('passes (exit 0) when a clean package.json is staged', () => {
    put('package.json', CLEAN_PKG);
    git('add', 'package.json');

    expect(runGuard().status).toBe(0);
  });

  it('blocks (exit 1) when the staged root package.json carries the leak marker', () => {
    put('package.json', LEAKY_PKG);
    git('add', 'package.json');

    const { status, stderr } = runGuard();
    expect(status).toBe(1);
    expect(stderr).toContain('Refusing to commit package.json');
    expect(stderr).toContain(LEAK_MARKER);
  });

  it('passes when no checkable files are staged', () => {
    put('README.md', 'hello');
    git('add', 'README.md');

    expect(runGuard().status).toBe(0);
  });

  it('blocks when a staged yarn.lock carries the leak marker', () => {
    put('yarn.lock', `__metadata:\n  version: 8\n# ${LEAK_MARKER}\n`);
    git('add', 'yarn.lock');

    const { status, stderr } = runGuard();
    expect(status).toBe(1);
    expect(stderr).toContain('yarn.lock');
  });

  it('blocks when a staged workspace package.json carries the leak marker', () => {
    put('packages/foo/package.json', LEAKY_PKG);
    git('add', 'packages/foo/package.json');

    const { status, stderr } = runGuard();
    expect(status).toBe(1);
    expect(stderr).toContain('packages/foo/package.json');
  });

  it('ignores a leak that exists only in the working tree, not the index', () => {
    // Written but never `git add`-ed: the guard reads the index, so an unstaged
    // edit must not block the commit.
    put('package.json', LEAKY_PKG);

    expect(runGuard().status).toBe(0);
  });

  it('does not block a staged deletion (diff-filter excludes D)', () => {
    put('package.json', CLEAN_PKG);
    git('add', 'package.json');
    git('commit', '-q', '-m', 'add package.json');
    git('rm', '-q', 'package.json');

    expect(runGuard().status).toBe(0);
  });

  it('fails closed (exit 1) when git cannot be queried (not a repository)', () => {
    // The guard must never silently pass when its git query errors out; a
    // regression to exit 0 here is the failure mode the whole guard guards.
    const nonRepo = mkdtempSync(path.join(tmpdir(), 'no-source-leak-nongit-'));
    try {
      const { status, stderr } = runGuard(nonRepo);
      expect(status).toBe(1);
      expect(stderr).toContain('failed to list staged files');
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});
