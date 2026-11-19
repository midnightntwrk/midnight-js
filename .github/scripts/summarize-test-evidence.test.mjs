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
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findTestedPackages, renderSummary, summarizeEvidence } from './summarize-test-evidence.mjs';

const SCRIPT = fileURLToPath(new URL('./summarize-test-evidence.mjs', import.meta.url));

const testcase = (name, body = '') => `<testcase classname="c" name="${name}" time="0.1">${body}</testcase>`;

const junit = (...cases) => `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="test/a.test.ts">
    ${cases.join('\n    ')}
  </testsuite>
</testsuites>`;

const PASSING = junit(testcase('passes'));

const TESTED_PACKAGES = [
  { name: 'contracts', allowEmpty: false },
  { name: 'types', allowEmpty: true }
];

const GREEN_JOBS = [
  { id: 1, name: 'Build Midnight.js / ci / Build, Lint and Unit/Integration Tests', conclusion: 'success' },
  { id: 2, name: 'Build Testkit.js / build / ci', conclusion: 'success' },
  { id: 3, name: 'Hard fork / simple', conclusion: 'success' },
  { id: 4, name: 'Consumer E2E / Isolated-linker install smoke', conclusion: 'success' }
];

let workDir;
let evidenceDir;

const write = (relativePath, content) => {
  const file = path.join(evidenceDir, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const writeCompleteEvidence = () => {
  write('evidence-unit-packages/contracts/reports/report/test-report.xml', PASSING);
  write('evidence-unit-packages/types/reports/report/test-report.xml', PASSING);
  write('evidence-unit-testkit/test-report.xml', PASSING);
  write('test-results-junit-summary-devnet/junit-test-results.xml', PASSING);
  write('test-results-junit-summary-v8era/junit-test-results.xml', PASSING);
  write('test-results-ctrf-summary-devnet/ctrf-report.json', '{}');
  write('test-results-ctrf-summary-v8era/ctrf-report.json', '{}');
  write('Coverage Report/coverage.zip', 'zip');
  write('job-logs/3.log', 'hard fork log');
  write('job-logs/4.log', 'consumer e2e log');
};

const problemsOf = (jobs = GREEN_JOBS) =>
  summarizeEvidence({ evidenceDir, jobs, testedPackages: TESTED_PACKAGES }).problems;

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'evidence-'));
  evidenceDir = path.join(workDir, 'evidence');
  mkdirSync(evidenceDir);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('summarizeEvidence', () => {
  it('reports no problem for complete, passing evidence', () => {
    writeCompleteEvidence();

    const problems = problemsOf();

    expect(problems).toEqual([]);
  });

  it('counts passed, failed, errored and skipped test cases across nested suites and files', () => {
    writeCompleteEvidence();
    write(
      'evidence-unit-packages/types/reports/report/test-report.xml',
      `<testsuites><testsuite name="outer"><testsuite name="inner">
        ${testcase('ok')}
        ${testcase('broken', '<failure message="boom"/>')}
        ${testcase('crashed', '<error message="boom"/>')}
        ${testcase('later', '<skipped/>')}
      </testsuite></testsuite></testsuites>`
    );

    const { suites } = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS, testedPackages: TESTED_PACKAGES });

    expect(suites.find((suite) => suite.artifact === 'evidence-unit-packages')).toMatchObject({
      tests: 5,
      passed: 2,
      failed: 1,
      errors: 1,
      skipped: 1
    });
  });

  it('keeps the two e2e lanes apart although both upload a file with the same name', () => {
    writeCompleteEvidence();
    write('test-results-junit-summary-v8era/junit-test-results.xml', junit(testcase('one'), testcase('two')));

    const { suites } = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS, testedPackages: TESTED_PACKAGES });

    expect(suites.map(({ artifact, tests }) => [artifact, tests])).toEqual([
      ['evidence-unit-packages', 2],
      ['evidence-unit-testkit', 1],
      ['test-results-junit-summary-devnet', 1],
      ['test-results-junit-summary-v8era', 2]
    ]);
  });

  it('reports a failed test case', () => {
    writeCompleteEvidence();
    write('test-results-junit-summary-devnet/junit-test-results.xml', junit(testcase('ok'), testcase('broken', '<failure/>')));

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-devnet: 1 failed and 0 errored test case(s)']);
  });

  it('reports an errored test case, as vitest writes an unhandled error', () => {
    writeCompleteEvidence();
    write(
      'test-results-junit-summary-devnet/junit-test-results.xml',
      `<testsuites>
        <testsuite name="test/a.test.ts">${testcase('ok')}</testsuite>
        <testsuite name="vitest unhandled errors">${testcase('Unhandled rejection', '<error message="boom"/>')}</testsuite>
      </testsuites>`
    );

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-devnet: 0 failed and 1 errored test case(s)']);
  });

  it('reports an artifact in which every test case was skipped', () => {
    writeCompleteEvidence();
    write(
      'test-results-junit-summary-v8era/junit-test-results.xml',
      junit(testcase('later', '<skipped/>'), testcase('also later', '<skipped/>'))
    );

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-v8era: no test case passed']);
  });

  it('reports an artifact in which every test case failed only as failed', () => {
    writeCompleteEvidence();
    write('test-results-junit-summary-v8era/junit-test-results.xml', junit(testcase('broken', '<failure/>')));

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-v8era: 1 failed and 0 errored test case(s)']);
  });

  it.each([
    'evidence-unit-testkit',
    'test-results-junit-summary-v8era',
    'test-results-ctrf-summary-devnet',
    'Coverage Report'
  ])('reports the artifact %s when it is missing', (artifact) => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, artifact), { recursive: true });

    const problems = problemsOf();

    expect(problems).toEqual([`${artifact}: artifact is missing or empty`]);
  });

  it('reports an artifact folder that holds no file', () => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, 'test-results-ctrf-summary-v8era'), { recursive: true });
    mkdirSync(path.join(evidenceDir, 'test-results-ctrf-summary-v8era'));

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-ctrf-summary-v8era: artifact is missing or empty']);
  });

  it('reports a junit file that is not well-formed XML', () => {
    writeCompleteEvidence();
    write('evidence-unit-testkit/test-report.xml', '<testsuites><testsuite>');

    const problems = problemsOf();

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^evidence-unit-testkit\/test-report\.xml: not valid XML/);
  });

  it('reports a junit artifact that holds no test case', () => {
    writeCompleteEvidence();
    write('evidence-unit-testkit/test-report.xml', '<testsuites></testsuites>');

    const problems = problemsOf();

    expect(problems).toEqual(['evidence-unit-testkit: no test case found']);
  });

  it('reports a tested package whose junit report is missing', () => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, 'evidence-unit-packages/contracts'), { recursive: true });

    const problems = problemsOf();

    expect(problems).toEqual(['evidence-unit-packages: no junit report for package "contracts"']);
  });

  it('reports a package with no test case unless its tests may be empty', () => {
    writeCompleteEvidence();
    write('evidence-unit-packages/contracts/reports/report/test-report.xml', '<testsuites></testsuites>');
    write('evidence-unit-packages/types/reports/report/test-report.xml', '<testsuites></testsuites>');
    write('evidence-unit-packages/utils/reports/report/test-report.xml', PASSING);
    const testedPackages = [...TESTED_PACKAGES, { name: 'utils', allowEmpty: false }];

    const { problems } = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS, testedPackages });

    expect(problems).toEqual(['evidence-unit-packages: no test case found for package "contracts"']);
  });

  it.each([
    ['failure', 'ended with failure'],
    ['cancelled', 'ended with cancelled'],
    [null, 'ended with no conclusion']
  ])('reports a required job that ended with %s', (conclusion, outcome) => {
    writeCompleteEvidence();
    const jobs = [...GREEN_JOBS, { id: 5, name: 'Hard fork / shielded', conclusion }];

    const problems = problemsOf(jobs);

    expect(problems).toEqual([`Hard fork: job "Hard fork / shielded" ${outcome}`]);
  });

  it('reports a required job group in which no job succeeded', () => {
    writeCompleteEvidence();
    const jobs = GREEN_JOBS.map((job) => (job.name.startsWith('Consumer E2E') ? { ...job, conclusion: 'skipped' } : job));

    const problems = problemsOf(jobs);

    expect(problems).toEqual(['Consumer E2E: no job succeeded']);
  });

  it('reports every required job group when the job list is empty', () => {
    writeCompleteEvidence();

    const problems = problemsOf([]);

    expect(problems).toEqual([
      'Build Midnight.js: no job succeeded',
      'Build Testkit.js: no job succeeded',
      'Hard fork: no job succeeded',
      'Consumer E2E: no job succeeded'
    ]);
  });

  it('accepts a skipped job next to a successful one in the same group', () => {
    writeCompleteEvidence();
    const jobs = [...GREEN_JOBS, { id: 6, name: 'Build Testkit.js / prerelease / publish', conclusion: 'skipped' }];

    const problems = problemsOf(jobs);

    expect(problems).toEqual([]);
  });

  it.each([
    ['3', 'Hard fork', 'Hard fork / simple'],
    ['4', 'Consumer E2E', 'Consumer E2E / Isolated-linker install smoke']
  ])('reports a missing log of job %s', (id, group, name) => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, `job-logs/${id}.log`));

    const problems = problemsOf();

    expect(problems).toEqual([`${group}: log of job "${name}" is missing or empty (job-logs/${id}.log)`]);
  });

  it('reports an empty job log', () => {
    writeCompleteEvidence();
    write('job-logs/3.log', '');

    const problems = problemsOf();

    expect(problems).toEqual(['Hard fork: log of job "Hard fork / simple" is missing or empty (job-logs/3.log)']);
  });
});

describe('findTestedPackages', () => {
  it('lists the packages with a test script and marks those whose tests may be empty', () => {
    const writePackage = (name, scripts) => {
      mkdirSync(path.join(workDir, 'packages', name), { recursive: true });
      writeFileSync(path.join(workDir, 'packages', name, 'package.json'), JSON.stringify({ scripts }));
    };
    writePackage('contracts', { test: 'vitest run' });
    writePackage('types', { test: 'vitest run --passWithNoTests' });
    writePackage('no-tests', { build: 'rollup' });

    const packages = findTestedPackages(workDir);

    expect(packages).toEqual([
      { name: 'contracts', allowEmpty: false },
      { name: 'types', allowEmpty: true }
    ]);
  });
});

describe('renderSummary', () => {
  it('names the release, the run, the commit, the counts and the logs', () => {
    writeCompleteEvidence();
    write('test-results-junit-summary-devnet/junit-test-results.xml', junit(testcase('ok'), testcase('broken', '<failure/>')));
    write('test-results-junit-summary-v8era/junit-test-results.xml', junit(testcase('ok'), testcase('crashed', '<error/>')));
    const result = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS, testedPackages: TESTED_PACKAGES });

    const markdown = renderSummary({
      result,
      version: '5.1.0',
      sha: 'abc123',
      runUrl: 'https://example.test/runs/42'
    });

    expect(markdown).toContain('# Test evidence for v5.1.0');
    expect(markdown).toContain('- CI run: https://example.test/runs/42');
    expect(markdown).toContain('- Commit: `abc123`');
    expect(markdown).toContain('| End-to-end tests, current era (`devnet`) | 2 | 1 | 1 | 0 | 0 |');
    expect(markdown).toContain('| End-to-end tests, ledger v8 era (`v8era`) | 2 | 1 | 0 | 1 | 0 |');
    expect(markdown).toContain('| **Total** | **7** | **5** | **1** | **1** | **0** |');
    expect(markdown).toContain('| Hard fork / simple | success | `job-logs/3.log` |');
  });
});

describe('command line', () => {
  const run = (...extraArgs) => {
    const jobsFile = path.join(workDir, 'jobs.json');
    writeFileSync(jobsFile, JSON.stringify(GREEN_JOBS));
    for (const { name } of TESTED_PACKAGES) {
      mkdirSync(path.join(workDir, 'packages', name), { recursive: true });
      writeFileSync(
        path.join(workDir, 'packages', name, 'package.json'),
        JSON.stringify({ scripts: { test: 'vitest run' } })
      );
    }
    return spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--evidence-dir',
        evidenceDir,
        '--jobs',
        jobsFile,
        '--repo-root',
        workDir,
        '--version',
        '5.1.0',
        '--run-url',
        'https://example.test/runs/42',
        ...extraArgs
      ],
      { encoding: 'utf8' }
    );
  };

  it('exits 0 and writes SUMMARY.md for complete, passing evidence', () => {
    writeCompleteEvidence();

    const { status, stderr } = run('--sha', 'abc123');

    expect({ status, stderr }).toEqual({ status: 0, stderr: '' });
    expect(existsSync(path.join(evidenceDir, 'SUMMARY.md'))).toBe(true);
  });

  it('exits 1, names the problem and still writes SUMMARY.md when a test failed', () => {
    writeCompleteEvidence();
    write('test-results-junit-summary-devnet/junit-test-results.xml', junit(testcase('ok'), testcase('broken', '<failure/>')));

    const { status, stderr } = run('--sha', 'abc123');

    expect({ status, stderr }).toEqual({
      status: 1,
      stderr: '::error::test-results-junit-summary-devnet: 1 failed and 0 errored test case(s)\n'
    });
    expect(existsSync(path.join(evidenceDir, 'SUMMARY.md'))).toBe(true);
  });

  it('exits 1 when an argument is missing', () => {
    writeCompleteEvidence();

    const { status, stderr } = run();

    expect({ status, stderr }).toEqual({
      status: 1,
      stderr: '::error::summarize-test-evidence could not complete: Missing argument(s): --sha\n'
    });
  });
});
