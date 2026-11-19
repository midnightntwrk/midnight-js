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
// Checks a release's test evidence and writes SUMMARY.md; a non-zero exit stops
// the release before any package is published.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const JUNIT_SUITES = [
  { artifact: 'evidence-unit-packages', label: 'Unit and integration tests, `packages/*`', perPackage: true },
  { artifact: 'evidence-unit-testkit', label: 'Unit tests, `testkit-js/testkit-js`' },
  { artifact: 'test-results-junit-summary-devnet', label: 'End-to-end tests, current era (`devnet`)' },
  { artifact: 'test-results-junit-summary-v8era', label: 'End-to-end tests, ledger v8 era (`v8era`)' }
];

export const OTHER_ARTIFACTS = [
  'test-results-ctrf-summary-devnet',
  'test-results-ctrf-summary-v8era',
  'Coverage Report'
];

/** Display names (`name:`) of the `ci.yml` jobs the release depends on. */
export const JOB_GROUPS = ['Build Midnight.js', 'Build Testkit.js', 'Hard fork', 'Consumer E2E'];

/** Groups with no junit output, whose job log is their evidence; the jq filter in collect-test-evidence selects the same. */
export const LOG_GROUPS = ['Hard fork', 'Consumer E2E'];

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) => ['testsuites', 'testsuite', 'testcase'].includes(name)
});

const listFiles = (directory) =>
  readdirSync(directory, { recursive: true })
    .map((entry) => path.join(directory, entry))
    .filter((file) => statSync(file).isFile());

const isNonEmptyDirectory = (directory) => existsSync(directory) && listFiles(directory).length > 0;

const collectTestcases = (node) =>
  Object.entries(typeof node === 'object' && node !== null ? node : {}).flatMap(([key, value]) => {
    if (key === 'testcase') return value;
    if (key === 'testsuites' || key === 'testsuite') return value.flatMap(collectTestcases);
    return [];
  });

const countTestcases = (testcases) => {
  const has = (testcase, key) => typeof testcase === 'object' && testcase !== null && key in testcase;
  const failed = testcases.filter((testcase) => has(testcase, 'failure')).length;
  const errors = testcases.filter((testcase) => has(testcase, 'error')).length;
  const skipped = testcases.filter((testcase) => has(testcase, 'skipped')).length;
  return { tests: testcases.length, passed: testcases.length - failed - errors - skipped, failed, errors, skipped };
};

/**
 * Every `packages/*` workspace with a `test` script must leave a junit report;
 * a package whose test script has `--passWithNoTests` may report no test case.
 */
export const findTestedPackages = (repoRoot) => {
  const packagesDir = path.join(repoRoot, 'packages');
  return readdirSync(packagesDir)
    .sort()
    .flatMap((name) => {
      const manifest = path.join(packagesDir, name, 'package.json');
      if (!existsSync(manifest)) return [];
      const test = JSON.parse(readFileSync(manifest, 'utf8')).scripts?.test;
      return test ? [{ name, allowEmpty: test.includes('--passWithNoTests') }] : [];
    });
};

const packageReport = (name) => `${name}/reports/report/test-report.xml`;

const checkPackageReports = (artifact, testcasesByFile, testedPackages, problems) => {
  for (const { name, allowEmpty } of testedPackages) {
    const report = packageReport(name);
    const file = [...testcasesByFile.keys()].find((relative) => relative === report || relative.endsWith(`/${report}`));
    if (file === undefined) {
      problems.push(`${artifact}: no junit report for package "${name}"`);
    } else if (testcasesByFile.get(file).length === 0 && !allowEmpty) {
      problems.push(`${artifact}: no test case found for package "${name}"`);
    }
  }
};

const summarizeJunitSuite = (evidenceDir, { artifact, label, perPackage }, testedPackages, problems) => {
  const directory = path.join(evidenceDir, artifact);
  const empty = { artifact, label, tests: 0, passed: 0, failed: 0, errors: 0, skipped: 0 };
  if (!isNonEmptyDirectory(directory)) {
    problems.push(`${artifact}: artifact is missing or empty`);
    return empty;
  }
  const testcasesByFile = new Map();
  for (const file of listFiles(directory).filter((candidate) => candidate.endsWith('.xml'))) {
    const xml = readFileSync(file, 'utf8');
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      problems.push(`${path.relative(evidenceDir, file)}: not valid XML (${validation.err.msg})`);
      continue;
    }
    testcasesByFile.set(path.relative(directory, file).split(path.sep).join('/'), collectTestcases(parser.parse(xml)));
  }
  if (perPackage) checkPackageReports(artifact, testcasesByFile, testedPackages, problems);
  const counts = { artifact, label, ...countTestcases([...testcasesByFile.values()].flat()) };
  if (counts.tests === 0 && !problems.some((problem) => problem.startsWith(`${artifact}/`))) {
    problems.push(`${artifact}: no test case found`);
  }
  if (counts.tests > 0 && counts.passed === 0 && counts.failed === 0 && counts.errors === 0) {
    problems.push(`${artifact}: no test case passed`);
  }
  if (counts.failed > 0 || counts.errors > 0) {
    problems.push(`${artifact}: ${counts.failed} failed and ${counts.errors} errored test case(s)`);
  }
  return counts;
};

const groupOf = (job) => JOB_GROUPS.find((group) => job.name.startsWith(`${group} / `));

const checkJobGroups = (evidenceDir, jobs, problems) => {
  for (const group of JOB_GROUPS) {
    const members = jobs.filter((job) => groupOf(job) === group);
    const unsuccessful = members.filter((job) => job.conclusion !== 'success' && job.conclusion !== 'skipped');
    for (const job of unsuccessful) {
      problems.push(`${group}: job "${job.name}" ended with ${job.conclusion ?? 'no conclusion'}`);
    }
    if (unsuccessful.length === 0 && !members.some((job) => job.conclusion === 'success')) {
      problems.push(`${group}: no job succeeded`);
    }
  }
  return jobs
    .filter((job) => LOG_GROUPS.includes(groupOf(job)) && job.conclusion === 'success')
    .map((job) => {
      const log = `job-logs/${job.id}.log`;
      const file = path.join(evidenceDir, log);
      if (!existsSync(file) || statSync(file).size === 0) {
        problems.push(`${groupOf(job)}: log of job "${job.name}" is missing or empty (${log})`);
      }
      return { name: job.name, conclusion: job.conclusion, log };
    });
};

/**
 * @param {{
 *   evidenceDir: string,
 *   jobs: { id: number, name: string, conclusion: string | null }[],
 *   testedPackages: { name: string, allowEmpty: boolean }[]
 * }} input
 */
export const summarizeEvidence = ({ evidenceDir, jobs, testedPackages }) => {
  const problems = [];
  const suites = JUNIT_SUITES.map((suite) => summarizeJunitSuite(evidenceDir, suite, testedPackages, problems));
  for (const artifact of OTHER_ARTIFACTS) {
    if (!isNonEmptyDirectory(path.join(evidenceDir, artifact))) {
      problems.push(`${artifact}: artifact is missing or empty`);
    }
  }
  const logs = checkJobGroups(evidenceDir, jobs, problems);
  return { suites, logs, problems };
};

export const renderSummary = ({ result, version, sha, runUrl }) => {
  const total = result.suites.reduce(
    (sum, suite) => ({
      tests: sum.tests + suite.tests,
      passed: sum.passed + suite.passed,
      failed: sum.failed + suite.failed,
      errors: sum.errors + suite.errors,
      skipped: sum.skipped + suite.skipped
    }),
    { tests: 0, passed: 0, failed: 0, errors: 0, skipped: 0 }
  );
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [
    `# Test evidence for v${version}`,
    '',
    `- CI run: ${runUrl}`,
    `- Commit: \`${sha}\``,
    '',
    '## Test results',
    '',
    row(['Suite', 'Tests', 'Passed', 'Failed', 'Errors', 'Skipped']),
    row(['---', '---:', '---:', '---:', '---:', '---:']),
    ...result.suites.map((suite) =>
      row([suite.label, suite.tests, suite.passed, suite.failed, suite.errors, suite.skipped])
    ),
    row(['**Total**', ...[total.tests, total.passed, total.failed, total.errors, total.skipped].map((n) => `**${n}**`)]),
    '',
    '## Jobs without junit output',
    '',
    row(['Job', 'Result', 'Log']),
    row(['---', '---', '---']),
    ...result.logs.map((entry) => row([entry.name, entry.conclusion, `\`${entry.log}\``])),
    '',
    'Coverage: `Coverage Report/coverage.zip`. End-to-end CTRF reports: `test-results-ctrf-summary-*`.',
    ''
  ].join('\n');
};

const main = () => {
  const { values } = parseArgs({
    options: {
      'evidence-dir': { type: 'string' },
      jobs: { type: 'string' },
      version: { type: 'string' },
      sha: { type: 'string' },
      'run-url': { type: 'string' },
      'repo-root': { type: 'string', default: '.' }
    }
  });
  const missing = ['evidence-dir', 'jobs', 'version', 'sha', 'run-url'].filter((name) => !values[name]);
  if (missing.length > 0) {
    throw new Error(`Missing argument(s): ${missing.map((name) => `--${name}`).join(', ')}`);
  }
  const evidenceDir = values['evidence-dir'];
  const jobs = JSON.parse(readFileSync(values.jobs, 'utf8'));
  const testedPackages = findTestedPackages(values['repo-root']);
  const result = summarizeEvidence({ evidenceDir, jobs, testedPackages });
  writeFileSync(
    path.join(evidenceDir, 'SUMMARY.md'),
    renderSummary({ result, version: values.version, sha: values.sha, runUrl: values['run-url'] })
  );
  for (const problem of result.problems) console.error(`::error::${problem}`);
  return result.problems.length > 0 ? 1 : 0;
};

const runDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runDirectly) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`::error::summarize-test-evidence could not complete: ${error.message}`);
    process.exitCode = 1;
  }
}
