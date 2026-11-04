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

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const WORKFLOW_DIR = fileURLToPath(new URL('../workflows', import.meta.url));

describe('workflow run steps', () => {
  it('read workflow inputs from env rather than interpolating them into the script', () => {
    const interpolated = readdirSync(WORKFLOW_DIR)
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .flatMap((name) => {
        const { jobs } = parse(readFileSync(path.join(WORKFLOW_DIR, name), 'utf8'));
        return Object.entries(jobs ?? {}).flatMap(([jobName, job]) =>
          (job.steps ?? [])
            .filter(({ run }) => /\$\{\{\s*inputs\./.test(run ?? ''))
            .map(({ name: stepName }) => `${name}: ${jobName} / ${stepName}`)
        );
      });

    expect(interpolated).toEqual([]);
  });

  it('carry inputs in env names that yarn and turbo do not read as their own settings', () => {
    const misread = readdirSync(WORKFLOW_DIR)
      .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
      .flatMap((name) => {
        const { jobs } = parse(readFileSync(path.join(WORKFLOW_DIR, name), 'utf8'));
        return Object.values(jobs ?? {}).flatMap((job) =>
          (job.steps ?? []).flatMap(({ env }) =>
            Object.entries(env ?? {})
              .filter(([key, value]) => /^(YARN|TURBO)_/.test(key) && /\binputs\./.test(String(value)))
              .map(([key]) => `${name}: ${key}`)
          )
        );
      });

    expect(misread).toEqual([]);
  });
});
