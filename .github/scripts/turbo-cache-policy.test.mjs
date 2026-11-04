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
const SETUP_BUILD_ENV = path.join(REPO_ROOT, '.github', 'actions', 'setup-build-env', 'action.yml');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const ACTION_DIR = path.join(REPO_ROOT, '.github', 'actions');
const TEST_TASKS = ['test', 'it', 'e2e', 'e2e-single', 'check', 'deploy'];
const UNCACHED_BUILDS = ['@midnight-ntwrk/testkit-js-e2e#build'];
const BUILDS_WITHOUT_ROLLUP = ['@midnight-ntwrk/midnight-js-compact#build'];
const PUBLISH_COMMAND = /\byarn (run )?deploy\b|\bnpm publish\b|publish-public-npm/;

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: DRY_RUN_TIMEOUT_MS - 5_000
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (status ${result.status}, signal ${result.signal}): ` +
        `${result.error?.message ?? result.stderr}`,
      { cause: result.error }
    );
  }
  return result.stdout;
};

const dryRun = (tasks) => {
  const args = ['run', ...tasks, '--dry=json'];
  const stdout = run(TURBO, args);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`turbo ${args.join(' ')} printed non-JSON output: ${stdout.slice(0, 500)}`, { cause: error });
  }
};

const readYaml = (file) => parse(readFileSync(file, 'utf8'));

const workflows = () =>
  readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({ name, document: readYaml(path.join(WORKFLOW_DIR, name)) }));

const actions = () =>
  readdirSync(ACTION_DIR).map((name) => ({
    name: `${name}/action.yml`,
    document: readYaml(path.join(ACTION_DIR, name, 'action.yml'))
  }));

const allSteps = () => [
  ...workflows().flatMap(({ name, document }) =>
    Object.values(document.jobs ?? {}).flatMap((job) => (job.steps ?? []).map((step) => ({ file: name, step })))
  ),
  ...actions().flatMap(({ name, document }) => (document.runs?.steps ?? []).map((step) => ({ file: name, step })))
];

const envBlocks = () => [
  ...workflows().flatMap(({ document }) => [
    document.env,
    ...Object.values(document.jobs ?? {}).flatMap((job) => [job.env, ...(job.steps ?? []).map(({ env }) => env)])
  ]),
  ...actions().flatMap(({ document }) => (document.runs?.steps ?? []).map(({ env }) => env))
];

const setupSteps = () => readYaml(SETUP_BUILD_ENV).runs.steps;

const pathsOf = (step) => step.with.path.split('\n').filter(Boolean);

const cacheSteps = () => setupSteps().filter(({ uses }) => uses?.startsWith('actions/cache'));

const buildTasks = () => {
  const tasks = dryRun(['build']).tasks.filter(({ task }) => task === 'build');
  expect(tasks.length).toBeGreaterThan(0);
  return tasks;
};

const trackedFiles = (...pathspecs) => run('git', ['ls-files', ...pathspecs]).split('\n').filter(Boolean);

describe('turbo cache policy', () => {
  it(
    'never caches a test or publish task',
    () => {
      const { tasks } = dryRun(TEST_TASKS);
      const nonBuild = tasks.filter(({ task }) => task !== 'build');

      const cached = nonBuild
        .filter(({ resolvedTaskDefinition }) => resolvedTaskDefinition.cache !== false)
        .map(({ taskId }) => taskId);

      expect([...new Set(nonBuild.map(({ task }) => task))].sort()).toEqual([...TEST_TASKS].sort());
      expect(cached).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'caches every build except testkit-js-e2e, whose output is mostly copied prover keys',
    () => {
      const uncached = buildTasks()
        .filter(({ resolvedTaskDefinition }) => resolvedTaskDefinition.cache !== true)
        .map(({ taskId }) => taskId);

      expect(uncached).toEqual(UNCACHED_BUILDS);
    },
    DRY_RUN_TIMEOUT_MS
  );
});

describe('CI routing', () => {
  it(
    'runs every lane when a file that decides every build hash changes',
    () => {
      const { globalCacheInputs } = dryRun(['build']);
      const ci = readYaml(path.join(WORKFLOW_DIR, 'ci.yml'));
      const filterStep = Object.values(ci.jobs)
        .flatMap((job) => job.steps ?? [])
        .find(({ uses }) => uses?.startsWith('dorny/paths-filter'));
      const { shared } = parse(filterStep.with.filters);
      const turboConfigs = trackedFiles('turbo.json', '**/turbo.json');

      const unrouted = [
        ...Object.keys(globalCacheInputs.files),
        ...turboConfigs,
        '.nvmrc',
        '.yarnrc.yml',
        'eslint.config.mjs'
      ].filter((file) => !shared.some((pattern) => path.matchesGlob(file, pattern)));

      expect(turboConfigs).toContain('turbo.json');
      expect(unrouted).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );
});

describe('CI cache wiring', () => {
  it('lets turbo write to the directory CI caches', () => {
    const turboConfig = readFileSync(path.join(REPO_ROOT, 'turbo.json'), 'utf8');
    const { scripts } = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    const envrc = readFileSync(path.join(REPO_ROOT, '.envrc'), 'utf8');

    const overrides = [
      ...allSteps()
        .filter(({ step }) => step.run?.includes('--cache-dir'))
        .map(({ file, step }) => `${file}: ${step.name ?? step.run}`),
      ...Object.entries(scripts)
        .filter(([, script]) => script.includes('--cache-dir'))
        .map(([name]) => `package.json: ${name}`),
      ...envBlocks()
        .filter((env) => env && 'TURBO_CACHE_DIR' in env)
        .map(() => 'env: TURBO_CACHE_DIR'),
      ...(envrc.includes('TURBO_CACHE_DIR') ? ['.envrc: TURBO_CACHE_DIR'] : []),
      ...(turboConfig.includes('"cacheDir"') ? ['turbo.json: cacheDir'] : [])
    ];
    const turboCaches = allSteps()
      .filter(({ step }) => step.uses?.startsWith('actions/cache'))
      .filter(({ step }) => pathsOf(step).some((entry) => entry.startsWith('.turbo')))
      .map(({ file, step }) => `${file}: ${pathsOf(step).join(',')}`);

    expect(overrides).toEqual([]);
    expect(turboCaches).toEqual(['setup-build-env/action.yml: .turbo/cache']);
  });

  it('drops turbo build entries older than a week right after restoring them', () => {
    const steps = setupSteps();
    const restore = steps.findIndex(({ name }) => name === 'Cache turbo build output');
    const prune = steps.findIndex(({ run: command }) => command?.includes('.turbo/cache') && command.includes('find'));

    expect(prune).toBe(restore + 1);
    expect(steps[prune].if).toBe(steps[restore].if);
    expect(steps[prune].run.trim()).toBe(
      'if [ -d .turbo/cache ]; then find .turbo/cache -type f -mtime +7 -delete; fi'
    );
  });

  it('builds every published package from source', () => {
    const publishJobs = workflows().flatMap(({ name, document }) =>
      Object.entries(document.jobs ?? {})
        .filter(([, job]) => (job.steps ?? []).some(({ run: command }) => PUBLISH_COMMAND.test(command ?? '')))
        .map(([jobName, job]) => ({ id: `${name}: ${jobName}`, job }))
    );

    const readingTurboCache = publishJobs
      .filter(({ job }) =>
        job.steps.some(
          ({ uses, with: options }) =>
            uses === './.github/actions/setup-build-env' && options?.['turbo-cache'] !== 'false'
        )
      )
      .map(({ id }) => id);

    expect(publishJobs.length).toBeGreaterThan(0);
    expect(readingTurboCache).toEqual([]);
  });

  it('caches node_modules under one key shared by every job', () => {
    const dependencies = cacheSteps().filter((step) => pathsOf(step).includes('**/node_modules'));

    expect(dependencies.map((step) => pathsOf(step))).toEqual([['**/node_modules']]);
    expect(dependencies.map(({ with: options }) => options.key)).toEqual([
      "deps-${{ runner.os }}-${{ runner.arch }}-${{ hashFiles('.nvmrc') }}-${{ hashFiles('yarn.lock') }}"
    ]);
  });
});

describe('build hash', () => {
  it(
    'hashes the compiler configuration and the compiled-contract check',
    () => {
      const { globalCacheInputs } = dryRun(['build']);

      const missing = buildTasks().flatMap(({ taskId, directory, inputs }) => {
        const tsconfigs = readdirSync(path.join(REPO_ROOT, directory)).filter(
          (file) => /^tsconfig.*\.json$/.test(file) && file !== 'tsconfig.docs.json'
        );
        const expected = BUILDS_WITHOUT_ROLLUP.includes(taskId) ? tsconfigs : [...tsconfigs, 'rollup.config.mjs'];
        return expected.filter((file) => !(file in inputs)).map((file) => `${taskId}: ${file}`);
      });

      expect(Object.keys(globalCacheInputs.files)).toEqual(
        expect.arrayContaining(['tsconfig.base.json', 'scripts/check-compiled.js'])
      );
      expect(missing).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'hashes every fixture that testkit-js copies into dist',
    () => {
      const testkit = buildTasks().find(({ directory }) => directory === 'testkit-js/testkit-js');
      const shipped = trackedFiles('testkit-js/testkit-js/src/fixtures/hf')
        .map((file) => path.relative(testkit.directory, file))
        .filter((file) => !file.startsWith('src/fixtures/hf/generators/'));

      const unhashed = shipped.filter((file) => !(file in testkit.inputs));

      expect(shipped.length).toBeGreaterThan(0);
      expect(unhashed).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'never replays a cached build that was meant to recreate compiled contracts',
    () => {
      const skippedPreparation = buildTasks()
        .filter(({ resolvedTaskDefinition }) => resolvedTaskDefinition.cache)
        .flatMap(({ taskId, directory, inputs }) => {
          const { scripts } = JSON.parse(readFileSync(path.join(REPO_ROOT, directory, 'package.json'), 'utf8'));
          const prepared = [...scripts.build.matchAll(/check-compiled\.js (\S+)/g)].map(([, dir]) => dir);
          return prepared
            .filter((dir) => !Object.keys(inputs).some((file) => file.startsWith(`${dir}/`)))
            .map((dir) => `${taskId}: ${dir}`);
        });

      expect(skippedPreparation).toEqual([]);
    },
    DRY_RUN_TIMEOUT_MS
  );

  it(
    'does not rebuild when a test file changes',
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
