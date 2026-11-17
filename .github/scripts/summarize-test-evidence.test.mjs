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

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderSummary, summarizeEvidence } from './summarize-test-evidence.mjs';

const testcase = (name, body = '') => `<testcase classname="c" name="${name}" time="0.1">${body}</testcase>`;

const junit = (...cases) => `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="test/a.test.ts">
    ${cases.join('\n    ')}
  </testsuite>
</testsuites>`;

const PASSING = junit(testcase('passes'));

const GREEN_JOBS = [
  { id: 1, name: 'Build Midnight.js / ci / Build, Lint and Unit/Integration Tests', conclusion: 'success' },
  { id: 2, name: 'Build Testkit.js / build / ci', conclusion: 'success' },
  { id: 3, name: 'Hard fork / simple', conclusion: 'success' },
  { id: 4, name: 'Consumer E2E / Isolated-linker install smoke', conclusion: 'success' }
];

let evidenceDir;

const write = (relativePath, content) => {
  const file = path.join(evidenceDir, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const writeCompleteEvidence = () => {
  write('evidence-unit-packages/packages/contracts/reports/report/test-report.xml', PASSING);
  write('evidence-unit-testkit/testkit-js/testkit-js/reports/test-report.xml', PASSING);
  write('test-results-junit-summary-devnet/junit-test-results.xml', PASSING);
  write('test-results-junit-summary-v8era/junit-test-results.xml', PASSING);
  write('test-results-ctrf-summary-devnet/ctrf-report.json', '{}');
  write('test-results-ctrf-summary-v8era/ctrf-report.json', '{}');
  write('Coverage Report/coverage.zip', 'zip');
  write('job-logs/3.log', 'hard fork log');
  write('job-logs/4.log', 'consumer e2e log');
};

const problemsOf = (jobs = GREEN_JOBS) => summarizeEvidence({ evidenceDir, jobs }).problems;

beforeEach(() => {
  evidenceDir = mkdtempSync(path.join(tmpdir(), 'evidence-'));
});

afterEach(() => {
  rmSync(evidenceDir, { recursive: true, force: true });
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
      'evidence-unit-packages/packages/utils/reports/report/test-report.xml',
      `<testsuites><testsuite name="outer"><testsuite name="inner">
        ${testcase('ok')}
        ${testcase('broken', '<failure message="boom"/>')}
        ${testcase('crashed', '<error message="boom"/>')}
        ${testcase('later', '<skipped/>')}
      </testsuite></testsuite></testsuites>`
    );

    const { suites } = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS });

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

    const { suites } = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS });

    expect(suites.map(({ artifact, tests }) => [artifact, tests])).toEqual([
      ['evidence-unit-packages', 1],
      ['evidence-unit-testkit', 1],
      ['test-results-junit-summary-devnet', 1],
      ['test-results-junit-summary-v8era', 2]
    ]);
  });

  it('reports a failed or errored test case', () => {
    writeCompleteEvidence();
    write(
      'test-results-junit-summary-devnet/junit-test-results.xml',
      junit(testcase('broken', '<failure/>'), testcase('crashed', '<error/>'))
    );

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-devnet: 1 failed and 1 errored test case(s)']);
  });

  it('reports an evidence artifact that is missing', () => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, 'test-results-junit-summary-v8era'), { recursive: true });

    const problems = problemsOf();

    expect(problems).toEqual(['test-results-junit-summary-v8era: artifact is missing or empty']);
  });

  it('reports a junit file that is not well-formed XML', () => {
    writeCompleteEvidence();
    write('evidence-unit-testkit/testkit-js/testkit-js/reports/test-report.xml', '<testsuites><testsuite>');

    const problems = problemsOf();

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^evidence-unit-testkit\/testkit-js\/testkit-js\/reports\/test-report\.xml: not valid XML/);
  });

  it('reports a junit artifact that holds no test case', () => {
    writeCompleteEvidence();
    write('evidence-unit-testkit/testkit-js/testkit-js/reports/test-report.xml', '<testsuites></testsuites>');

    const problems = problemsOf();

    expect(problems).toEqual(['evidence-unit-testkit: no test case found']);
  });

  it('reports a required job group with a job that did not succeed', () => {
    writeCompleteEvidence();
    const jobs = [...GREEN_JOBS, { id: 5, name: 'Hard fork / shielded', conclusion: 'failure' }];

    const problems = problemsOf(jobs);

    expect(problems).toEqual(['Hard fork: job "Hard fork / shielded" ended with failure']);
  });

  it('reports a required job group in which no job succeeded', () => {
    writeCompleteEvidence();
    const jobs = GREEN_JOBS.map((job) => (job.name.startsWith('Consumer E2E') ? { ...job, conclusion: 'skipped' } : job));

    const problems = problemsOf(jobs);

    expect(problems).toEqual(['Consumer E2E: no job succeeded']);
  });

  it('accepts a skipped job next to a successful one in the same group', () => {
    writeCompleteEvidence();
    const jobs = [...GREEN_JOBS, { id: 6, name: 'Build Testkit.js / prerelease / publish', conclusion: 'skipped' }];

    const problems = problemsOf(jobs);

    expect(problems).toEqual([]);
  });

  it('reports a Hard fork job whose log was not collected', () => {
    writeCompleteEvidence();
    rmSync(path.join(evidenceDir, 'job-logs/3.log'));

    const problems = problemsOf();

    expect(problems).toEqual(['Hard fork: log of job "Hard fork / simple" is missing or empty (job-logs/3.log)']);
  });
});

describe('renderSummary', () => {
  it('names the release, the run, the commit, the counts and the logs', () => {
    writeCompleteEvidence();
    const result = summarizeEvidence({ evidenceDir, jobs: GREEN_JOBS });

    const markdown = renderSummary({
      result,
      version: '5.1.0',
      sha: 'abc123',
      runUrl: 'https://github.com/midnightntwrk/midnight-js/actions/runs/42'
    });

    expect(markdown).toContain('# Test evidence for v5.1.0');
    expect(markdown).toContain('https://github.com/midnightntwrk/midnight-js/actions/runs/42');
    expect(markdown).toContain('`abc123`');
    expect(markdown).toContain('| End-to-end tests, ledger v8 era (`v8era`) | 1 | 1 | 0 | 0 | 0 |');
    expect(markdown).toContain('| **Total** | **4** | **4** | **0** | **0** | **0** |');
    expect(markdown).toContain('| Hard fork / simple | success | `job-logs/3.log` |');
  });
});
