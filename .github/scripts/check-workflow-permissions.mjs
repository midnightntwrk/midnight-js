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
// A reusable workflow cannot be granted more than its caller holds. When it asks
// for more, GitHub does not fail the job -- it refuses to start the run at all,
// which surfaces as `startup_failure` with zero jobs and no annotation to read.
// That is invisible on a schedule: `nightly-e2e.yml` sat in exactly this state
// for weeks because it was the only caller of `ci-testkit-js-build.yml` that
// omitted `actions: read`.
//
// This gate reads the same relationship statically and names the missing scope.
// It is run by `.github/workflows/workflow-permissions.yml`, which deliberately
// calls no reusable workflow of its own -- see the comment there.

import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

/** Resolved from this file, not from `process.cwd()`, so the gate runs from anywhere. */
export const WORKFLOW_DIRECTORY = fileURLToPath(new URL('../workflows', import.meta.url));

/** Permission levels, ordered. A caller must hold at least the level its callee asks for. */
const LEVELS = { none: 0, read: 1, write: 2 };

/**
 * Every scope GitHub can grant, needed to expand the `read-all` / `write-all`
 * shorthands. Scopes outside this list still compare correctly against each
 * other; the list only bounds what the two shorthands are taken to cover, so a
 * scope GitHub adds later would be over-reported against a `read-all` caller
 * rather than silently skipped.
 */
const ALL_SCOPES = [
  'actions',
  'attestations',
  'checks',
  'contents',
  'deployments',
  'discussions',
  'id-token',
  'issues',
  'models',
  'packages',
  'pages',
  'pull-requests',
  'repository-projects',
  'security-events',
  'statuses'
];

/**
 * Normalises a `permissions:` value into a scope-to-level map.
 *
 * Returns `undefined` for an absent block, which is a different thing from an
 * empty one: absent means "inherit whatever the repository default is", which
 * cannot be resolved statically, while `{}` means "grant nothing".
 */
export const normalisePermissions = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (value === 'read-all') {
    return Object.fromEntries(ALL_SCOPES.map((scope) => [scope, 'read']));
  }
  if (value === 'write-all') {
    return Object.fromEntries(ALL_SCOPES.map((scope) => [scope, 'write']));
  }
  if (typeof value !== 'object') {
    throw new Error(`Unrecognised permissions value: ${JSON.stringify(value)}`);
  }
  for (const [scope, level] of Object.entries(value)) {
    if (LEVELS[level] === undefined) {
      throw new Error(`Unrecognised permission level for '${scope}': ${JSON.stringify(level)}`);
    }
  }
  return value;
};

const levelOf = (permissions, scope) => LEVELS[permissions?.[scope] ?? 'none'] ?? 0;

/**
 * Everything a called workflow asks the run's token to carry.
 *
 * The workflow-level block is not the whole answer. A job inside the callee may
 * declare its own, and that block is a request in exactly the same way -- so a
 * callee whose top level looks modest can still over-ask one job down and abort
 * the run just as thoroughly. The requirement is therefore the per-scope maximum
 * across the workflow-level block and every job-level block.
 *
 * Taking the maximum also makes the check sound across a chain: when A calls B
 * and B calls C, C's demands surface in B's requirement, so the A-to-B pair
 * catches a shortfall that only C would have exposed at run time.
 */
export const requiredPermissions = (workflow) => {
  const blocks = [
    normalisePermissions(workflow?.permissions),
    ...Object.values(workflow?.jobs ?? {}).map((job) => normalisePermissions(job?.permissions))
  ].filter((block) => block !== undefined);

  if (blocks.length === 0) {
    return undefined;
  }

  const required = {};
  for (const block of blocks) {
    for (const [scope, level] of Object.entries(block)) {
      if (levelOf(required, scope) < LEVELS[level]) {
        required[scope] = level;
      }
    }
  }
  return required;
};

/**
 * @param {Map<string, unknown>} workflows parsed workflow documents, keyed by file name
 * @returns {{violations: string[], externalCalls: string[]}}
 */
export const findViolations = (workflows) => {
  const violations = [];
  const externalCalls = [];

  for (const [file, workflow] of workflows) {
    const workflowPermissions = normalisePermissions(workflow?.permissions);

    for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
      const uses = job?.uses;
      if (typeof uses !== 'string') {
        continue;
      }
      if (!uses.startsWith('./.github/workflows/')) {
        // A reusable workflow in another repository. Its `permissions:` block is
        // not readable from here, so it is reported as unchecked rather than
        // folded into a pass.
        externalCalls.push(`${file} job '${jobName}' -> ${uses}`);
        continue;
      }

      const calleeFile = path.basename(uses);
      const callee = workflows.get(calleeFile);
      if (callee === undefined) {
        violations.push(`${file} job '${jobName}' calls ${uses}, which does not exist`);
        continue;
      }

      // A job-level block replaces the workflow-level one outright rather than
      // adding to it, so it is the whole grant when present.
      const granted = normalisePermissions(job.permissions) ?? workflowPermissions;
      const required = requiredPermissions(callee);
      if (required === undefined) {
        continue;
      }
      if (granted === undefined) {
        violations.push(
          `${file} job '${jobName}' calls ${calleeFile}, which declares permissions, but neither the job ` +
            `nor the workflow declares any -- the grant depends on the repository default and cannot be verified here`
        );
        continue;
      }

      for (const scope of Object.keys(required)) {
        if (levelOf(granted, scope) < levelOf(required, scope)) {
          violations.push(
            `${file} job '${jobName}' grants ${scope}: ${granted[scope] ?? 'none'} but ${calleeFile} requires ` +
              `${scope}: ${required[scope]} -- the run will fail at startup with no jobs and no annotation`
          );
        }
      }
    }
  }

  return { violations, externalCalls };
};

/** Parses every workflow in `.github/workflows`, keyed by file name. */
export const readWorkflows = async () => {
  const entries = await readdir(WORKFLOW_DIRECTORY);
  const files = entries.filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml')).sort();
  return new Map(files.map((file) => [file, parse(readFileSync(path.join(WORKFLOW_DIRECTORY, file), 'utf8'))]));
};

const main = async () => {
  const workflows = await readWorkflows();
  const { violations, externalCalls } = findViolations(workflows);

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`::error::${violation}`);
    }
    console.error(`\n${violations.length} reusable-workflow permission violation(s) found.`);
    return 1;
  }

  console.log(
    `Checked ${workflows.size} workflow files; every local reusable-workflow call is granted what it requires.`
  );
  if (externalCalls.length > 0) {
    console.log(
      `\n${externalCalls.length} call(s) to reusable workflows in other repositories were NOT checked ` +
        `-- their permissions are not readable from here:`
    );
    for (const call of externalCalls) {
      console.log(`  ${call}`);
    }
  }
  return 0;
};

const runDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runDirectly) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(`::error::check-workflow-permissions could not complete: ${error.message}`);
    process.exitCode = 1;
  }
}
