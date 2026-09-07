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

import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { parse } from 'yaml';

const WORKFLOW_DIRECTORY = '.github/workflows';

/** Permission levels, ordered. A caller must hold at least the level its callee asks for. */
const LEVELS = { none: 0, read: 1, write: 2 };

/** Every scope GitHub can grant, needed to expand the `read-all` / `write-all` shorthands. */
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
const normalisePermissions = (value) => {
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
  return value;
};

const levelOf = (permissions, scope) => LEVELS[permissions?.[scope] ?? 'none'] ?? 0;

const workflowFiles = async () => {
  const entries = await readdir(WORKFLOW_DIRECTORY);
  return entries.filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml')).sort();
};

const main = async () => {
  const files = await workflowFiles();
  const parsed = new Map(
    files.map((file) => [file, parse(readFileSync(path.join(WORKFLOW_DIRECTORY, file), 'utf8'))])
  );

  const violations = [];

  for (const [file, workflow] of parsed) {
    const workflowPermissions = normalisePermissions(workflow?.permissions);

    for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
      const uses = job?.uses;
      if (typeof uses !== 'string' || !uses.startsWith('./.github/workflows/')) {
        continue;
      }
      const calleeFile = path.basename(uses);
      const callee = parsed.get(calleeFile);
      if (callee === undefined) {
        violations.push(`${file} job '${jobName}' calls ${uses}, which does not exist`);
        continue;
      }

      // A job-level block replaces the workflow-level one outright rather than
      // adding to it, so it is the whole grant when present.
      const granted = normalisePermissions(job.permissions) ?? workflowPermissions;
      const required = normalisePermissions(callee.permissions);
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

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`::error::${violation}`);
    }
    console.error(`\n${violations.length} reusable-workflow permission violation(s) found.`);
    process.exit(1);
  }

  console.log(`Checked ${files.length} workflow files; every reusable-workflow call is granted what it requires.`);
};

await main();
