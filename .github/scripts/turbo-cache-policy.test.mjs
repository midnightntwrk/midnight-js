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
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

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

const SETUP_BUILD_ENV = path.join(REPO_ROOT, '.github', 'actions', 'setup-build-env', 'action.yml');

const readYaml = (file) => parse(readFileSync(file, 'utf8'));

const workflowSteps = () => {
  const workflowDir = path.join(REPO_ROOT, '.github', 'workflows');
  const actionDir = path.join(REPO_ROOT, '.github', 'actions');
  const workflows = readdirSync(workflowDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({ name, document: readYaml(path.join(workflowDir, name)) }));
  const actions = readdirSync(actionDir).map((name) => ({
    name: `${name}/action.yml`,
    document: readYaml(path.join(actionDir, name, 'action.yml'))
  }));
  return [
    ...workflows.flatMap(({ name, document }) =>
      Object.values(document.jobs ?? {}).flatMap((job) => (job.steps ?? []).map((step) => ({ file: name, step })))
    ),
    ...actions.flatMap(({ name, document }) => (document.runs?.steps ?? []).map((step) => ({ file: name, step })))
  ];
};

const cacheSteps = () =>
  (readYaml(SETUP_BUILD_ENV).runs.steps ?? []).filter(({ uses }) => uses?.startsWith('actions/cache'));

describe('CI cache wiring', () => {
  it('lets turbo write to the directory CI caches', () => {
    const overridden = workflowSteps()
      .filter(({ step }) => step.run?.includes('--cache-dir'))
      .map(({ file, step }) => `${file}: ${step.name ?? step.run}`);
    const turboCache = cacheSteps().filter(({ with: options }) => options.path.split('\n').includes('.turbo/cache'));

    expect(overridden).toEqual([]);
    expect(turboCache).toHaveLength(1);
  });

  it('builds every published package from source', () => {
    const workflowDir = path.join(REPO_ROOT, '.github', 'workflows');
    const publishJobsReadingTurboCache = readdirSync(workflowDir)
      .filter((name) => name.endsWith('.yml'))
      .flatMap((name) =>
        Object.entries(readYaml(path.join(workflowDir, name)).jobs ?? {})
          .filter(([, job]) => (job.steps ?? []).some(({ run }) => run?.includes('yarn deploy')))
          .filter(([, job]) =>
            (job.steps ?? []).some(
              ({ uses, with: options }) =>
                uses === './.github/actions/setup-build-env' && options?.['turbo-cache'] !== 'false'
            )
          )
          .map(([jobName]) => `${name}: ${jobName}`)
      );

    expect(publishJobsReadingTurboCache).toEqual([]);
  });

  it('caches node_modules under one key shared by every job', () => {
    const [dependencies] = cacheSteps().filter(({ with: options }) =>
      options.path.split('\n').includes('**/node_modules')
    );

    expect(dependencies.with.key).not.toContain('inputs.cache-key-prefix');
    expect(dependencies.with.key).toContain("hashFiles('.nvmrc')");
    expect(dependencies.with.key).toContain("hashFiles('yarn.lock')");
    expect(dependencies.with.path.split('\n')).not.toContain('~/.yarn');
  });
});

describe('build hash', () => {
  const buildTasks = () => dryRun(['build']).tasks.filter(({ task }) => task === 'build');

  it(
    'hashes the compiler configuration',
    () => {
      const { globalCacheInputs } = dryRun(['build']);

      const missing = buildTasks()
        .filter(({ inputs }) => 'rollup.config.mjs' in inputs)
        .filter(({ inputs }) => !('tsconfig.json' in inputs && 'tsconfig.build.json' in inputs))
        .map(({ taskId }) => taskId);

      expect(Object.keys(globalCacheInputs.files)).toEqual(
        expect.arrayContaining(['tsconfig.base.json', 'scripts/check-compiled.js'])
      );
      expect(missing).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'hashes the compiled contracts that testkit-js-e2e copies into dist',
    () => {
      const e2eBuild = buildTasks().find(({ taskId }) => taskId === '@midnight-ntwrk/testkit-js-e2e#build');

      const compiledKinds = new Set(
        Object.keys(e2eBuild.inputs)
          .filter((file) => file.startsWith('src/contract/compiled/'))
          .map((file) => path.extname(file))
      );

      expect([...compiledKinds]).toEqual(expect.arrayContaining(['.js', '.prover', '.verifier', '.zkir']));
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'does not rebuild when a test or fixture changes',
    () => {
      const testInputs = buildTasks().flatMap(({ taskId, inputs }) =>
        Object.keys(inputs)
          .filter((file) => /(^|\/)test\//.test(file) || file.endsWith('.test.ts'))
          .map((file) => `${taskId}: ${file}`)
      );

      expect(testInputs).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );
});
