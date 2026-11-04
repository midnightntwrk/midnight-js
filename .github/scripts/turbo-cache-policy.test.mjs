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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TURBO = path.join(REPO_ROOT, 'node_modules', '.bin', 'turbo');
const DRY_RUN_TIMEOUT_MS = 60_000;

const dryRun = (tasks) => {
  const result = spawnSync(TURBO, ['run', ...tasks, '--dry=json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`turbo run ${tasks.join(' ')} --dry=json exited ${result.status}: ${result.stderr}`, {
      cause: result.error
    });
  }
  return JSON.parse(result.stdout);
};

describe('turbo cache policy', () => {
  it(
    'never caches a test task',
    () => {
      const { tasks } = dryRun(['test', 'it', 'e2e', 'e2e-single', 'check']);

      const cached = tasks
        .filter(({ task }) => task !== 'build')
        .filter(({ resolvedTaskDefinition }) => resolvedTaskDefinition.cache !== false)
        .map(({ taskId }) => taskId);

      expect(tasks.length).toBeGreaterThan(0);
      expect(cached).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'caches build',
    () => {
      const { tasks } = dryRun(['build']);

      const uncached = tasks
        .filter(({ resolvedTaskDefinition }) => resolvedTaskDefinition.cache !== true)
        .map(({ taskId }) => taskId);

      expect(tasks.length).toBeGreaterThan(0);
      expect(uncached).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );
});
