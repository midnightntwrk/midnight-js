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

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  findViolations,
  normalisePermissions,
  readWorkflows,
  requiredPermissions
} from './check-workflow-permissions.mjs';

const workflows = (files) => new Map(Object.entries(files).map(([name, document]) => [name, parse(document)]));

const CALLEE_REQUIRING_ACTIONS_READ = `
permissions:
  actions: read
  contents: read
on:
  workflow_call:
jobs:
  build:
    runs-on: ubuntu-latest
`;

describe('findViolations', () => {
  it('reports a caller that grants less than the callee declares', () => {
    const tree = workflows({
      'callee.yml': CALLEE_REQUIRING_ACTIONS_READ,
      'caller.yml': `
permissions:
  contents: read
jobs:
  build:
    uses: ./.github/workflows/callee.yml
`
    });

    const { violations } = findViolations(tree);

    expect(violations).toEqual([
      "caller.yml job 'build' grants actions: none but callee.yml requires actions: read -- " +
        'the run will fail at startup with no jobs and no annotation'
    ]);
  });

  it('counts a job-level block inside the callee as part of what the callee requires', () => {
    const tree = workflows({
      'callee.yml': `
permissions:
  contents: read
on:
  workflow_call:
jobs:
  scan:
    permissions:
      security-events: write
    runs-on: ubuntu-latest
`,
      'caller.yml': `
permissions:
  contents: read
jobs:
  build:
    uses: ./.github/workflows/callee.yml
`
    });

    const { violations } = findViolations(tree);

    expect(violations).toEqual([
      "caller.yml job 'build' grants security-events: none but callee.yml requires security-events: write -- " +
        'the run will fail at startup with no jobs and no annotation'
    ]);
  });

  it('treats a job-level block on the caller as replacing the workflow-level grant', () => {
    const tree = workflows({
      'callee.yml': CALLEE_REQUIRING_ACTIONS_READ,
      'caller.yml': `
permissions:
  actions: read
  contents: read
jobs:
  build:
    permissions:
      contents: read
    uses: ./.github/workflows/callee.yml
`
    });

    const { violations } = findViolations(tree);

    expect(violations).toEqual([
      "caller.yml job 'build' grants actions: none but callee.yml requires actions: read -- " +
        'the run will fail at startup with no jobs and no annotation'
    ]);
  });

  it('accepts a caller holding a higher level than the callee asks for', () => {
    const tree = workflows({
      'callee.yml': CALLEE_REQUIRING_ACTIONS_READ,
      'caller.yml': `
permissions:
  actions: write
  contents: write
jobs:
  build:
    uses: ./.github/workflows/callee.yml
`
    });

    expect(findViolations(tree).violations).toEqual([]);
  });

  it('does not let a read-all caller satisfy a write requirement', () => {
    const tree = workflows({
      'callee.yml': `
permissions:
  packages: write
on:
  workflow_call:
jobs:
  publish:
    runs-on: ubuntu-latest
`,
      'caller.yml': `
permissions: read-all
jobs:
  build:
    uses: ./.github/workflows/callee.yml
`
    });

    const { violations } = findViolations(tree);

    expect(violations).toEqual([
      "caller.yml job 'build' grants packages: read but callee.yml requires packages: write -- " +
        'the run will fail at startup with no jobs and no annotation'
    ]);
  });

  it('reports a local callee that does not exist', () => {
    const tree = workflows({
      'caller.yml': `
permissions:
  contents: read
jobs:
  build:
    uses: ./.github/workflows/missing.yml
`
    });

    expect(findViolations(tree).violations).toEqual([
      "caller.yml job 'build' calls ./.github/workflows/missing.yml, which does not exist"
    ]);
  });

  it('reports a call it cannot verify rather than passing it', () => {
    const tree = workflows({
      'callee.yml': CALLEE_REQUIRING_ACTIONS_READ,
      'caller.yml': `
jobs:
  build:
    uses: ./.github/workflows/callee.yml
`
    });

    expect(findViolations(tree).violations).toEqual([
      "caller.yml job 'build' calls callee.yml, which declares permissions, but neither the job nor the " +
        'workflow declares any -- the grant depends on the repository default and cannot be verified here'
    ]);
  });

  it('surfaces calls into other repositories as unchecked instead of silently passing them', () => {
    const tree = workflows({
      'caller.yml': `
permissions:
  contents: read
jobs:
  label:
    uses: midnightntwrk/workflows/.github/workflows/ai-assisted-label.yml@2a516da
`
    });

    const { violations, externalCalls } = findViolations(tree);

    expect(violations).toEqual([]);
    expect(externalCalls).toEqual([
      "caller.yml job 'label' -> midnightntwrk/workflows/.github/workflows/ai-assisted-label.yml@2a516da"
    ]);
  });
});

describe('requiredPermissions', () => {
  it('takes the highest level a scope is asked for anywhere in the callee', () => {
    const callee = parse(`
permissions:
  contents: read
jobs:
  one:
    permissions:
      contents: write
  two:
    permissions:
      actions: read
`);

    expect(requiredPermissions(callee)).toEqual({ contents: 'write', actions: 'read' });
  });

  it('distinguishes a workflow that declares nothing from one that grants nothing', () => {
    expect(requiredPermissions(parse('jobs:\n  one:\n    runs-on: ubuntu-latest\n'))).toBeUndefined();
    expect(requiredPermissions(parse('permissions: {}\njobs:\n  one:\n    runs-on: ubuntu-latest\n'))).toEqual({});
  });
});

describe('normalisePermissions', () => {
  it('rejects a level GitHub does not recognise instead of reading it as none', () => {
    expect(() => normalisePermissions({ contents: 'readonly' })).toThrow(
      /Unrecognised permission level for 'contents'/
    );
  });

  it('rejects a shorthand GitHub does not recognise', () => {
    expect(() => normalisePermissions('all')).toThrow(/Unrecognised permissions value/);
  });
});

describe('the workflows checked in to this repository', () => {
  it('grant every local reusable-workflow call what it requires', async () => {
    const { violations } = findViolations(await readWorkflows());

    expect(violations).toEqual([]);
  });
});
