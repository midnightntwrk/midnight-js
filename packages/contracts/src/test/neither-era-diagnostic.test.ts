/*
 * This file is part of midnight-js.
 * Copyright (C) Midnight Foundation
 * SPDX-License-Identifier: Apache-2.0
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { NEITHER_ERA_CONTRACT_MESSAGE } from '../ledger8-contract';

// Snapshots the DIAGNOSTIC TEXT the compiler prints for a contract belonging to neither era.
//
// This is the one property of the era overloads that a compile-level assertion cannot reach:
// vitest's typecheck pass exposes `@ts-expect-error` and `expectTypeOf`, never the compiler's
// output. So this test runs `tsc` itself, over a fixture whose only errors are the four calls
// under test, and asserts on what comes back.
//
// What it protects, concretely. `NeitherEraContractOptions.compiledContract` is
// `NeitherContractShape` intersected with a structurally identical ANONYMOUS restatement of it,
// because TypeScript renders a named type by NAME and an anonymous one by EXPANSION, and a
// developer who hits this error needs both halves: the name to look the type up, and the expansion
// to read the migration-guide pointer without looking anything up. That intersection reads as
// redundant, and the comment on the declaration is not enough on its own to stop someone
// "simplifying" it. This test is: drop either half, or move a catch-all arm off the end of its
// overload list, and it fails naming exactly what broke.
//
// `NEITHER_ERA_CONTRACT_MESSAGE` is imported rather than restated, so the text cannot drift
// between the type that carries it and the assertion that checks for it.
// `typecheck/overloads.test-d.ts` is the other half of the pair: it pins the message text verbatim
// at the type level, where a reword fails to compile.

const packageRelative = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const PACKAGE_ROOT = packageRelative('../../');
const FIXTURE = packageRelative('./resources/diagnostics/neither-era-calls.ts');
const FIXTURE_TSCONFIG = packageRelative('./resources/diagnostics/tsconfig.json');

// Resolved rather than spelled as a path, so this fails loudly if the compiler is not installed
// instead of silently running something else. `typescript` is a root devDependency of the
// workspace; this is a module resolution, not an import, so it is not a dependency of this package.
const TSC = createRequire(import.meta.url).resolve('typescript/bin/tsc');

// `tsc` exits 2 for "diagnostics were reported and nothing was emitted", which is the ONLY outcome
// this fixture should ever produce. Anything else (0 = it compiled, 1 = it fell over, null = it was
// killed) means the fixture stopped exercising what this test thinks it exercises.
const TSC_REPORTED_DIAGNOSTICS = 2;

/** The four era-dispatching entry points the fixture trips, one call per line. */
const ERA_ENTRY_POINTS = ['submitCallTx', 'submitCallTxAsync', 'deployContract', 'findDeployedContract'];

/** `<path>(<line>,<column>): error TS<code>: ` — the first line of one `tsc --pretty false` diagnostic. */
const DIAGNOSTIC_HEAD = /^(.*?)\((\d+),\d+\): error (TS\d+): /;

interface Diagnostic {
  readonly line: number;
  readonly code: string;
  /** The header line plus every indented continuation line that belongs to it. */
  readonly text: string;
}

/**
 * Finds the fixture line that calls `entryPoint`, so a reported line number can be mapped back to
 * the entry point it belongs to.
 *
 * Matches on `<entryPoint>(providers` rather than the bare name: `submitCallTx` is a prefix of
 * `submitCallTxAsync`, and the trailing `(providers` is what keeps the two apart. Throws unless the
 * match is unique, because an ambiguous fixture would silently make the per-entry-point assertions
 * check the wrong line.
 */
const fixtureLineOf = (entryPoint: string): number => {
  const needle = `${entryPoint}(providers`;
  const matches = readFileSync(FIXTURE, 'utf8')
    .split('\n')
    .flatMap((text, index) => (text.includes(needle) ? [index + 1] : []));
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one line calling ${entryPoint} in ${FIXTURE}, found ${matches.length}. ` +
        'Keep each era-dispatching call on its own single line.'
    );
  }
  return matches[0] ?? 0;
};

const runTsc = (): { readonly status: number | null; readonly output: string } => {
  // `spawnSync` with an argument array, never a command string: nothing here is parsed by a shell,
  // so no path can be interpreted as anything but an argument.
  const result = spawnSync(process.execPath, [TSC, '--noEmit', '--pretty', 'false', '--project', FIXTURE_TSCONFIG], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf8'
  });
  if (result.error) {
    throw new Error(`failed to run tsc at ${TSC}`, { cause: result.error });
  }
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

const parseDiagnostics = (output: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const raw of output.split('\n')) {
    const head = DIAGNOSTIC_HEAD.exec(raw);
    if (head) {
      const [, file = '', line = '', code = ''] = head;
      if (!file.endsWith('neither-era-calls.ts')) {
        throw new Error(`tsc reported a diagnostic outside the fixture: ${raw}`);
      }
      diagnostics.push({ line: Number(line), code, text: raw });
      continue;
    }
    const previous = diagnostics[diagnostics.length - 1];
    // A continuation line of the diagnostic above is indented; a blank or unindented line is not
    // part of it.
    if (previous && raw.startsWith(' ')) {
      diagnostics[diagnostics.length - 1] = { ...previous, text: `${previous.text}\n${raw}` };
    }
  }
  return diagnostics;
};

describe('the diagnostic tsc prints for a contract belonging to neither era', () => {
  let output = '';
  let diagnostics: Diagnostic[] = [];

  beforeAll(() => {
    const run = runTsc();
    if (run.status !== TSC_REPORTED_DIAGNOSTICS) {
      // Loudly, with the compiler's own output attached: a test that swallowed this would go green
      // whenever the fixture compiled clean, which is precisely the regression it exists to catch.
      throw new Error(
        `tsc exited ${String(run.status)}, expected ${TSC_REPORTED_DIAGNOSTICS} ` +
          '(diagnostics reported, nothing emitted). The fixture either compiled clean or failed for ' +
          `an unrelated reason. Full tsc output:\n${run.output}`
      );
    }
    output = run.output;
    diagnostics = parseDiagnostics(run.output);
  });

  it('reports exactly one overload-resolution error per era-dispatching entry point, and nothing else', () => {
    // The count is asserted, not just the presence of the message: without it this suite would pass
    // on any run that happened to print the text somewhere among a pile of unrelated errors.
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(ERA_ENTRY_POINTS.map(() => 'TS2769'));

    const byLine = (a: number, b: number): number => a - b;
    expect(diagnostics.map((diagnostic) => diagnostic.line).sort(byLine)).toEqual(
      ERA_ENTRY_POINTS.map(fixtureLineOf).sort(byLine)
    );
  });

  it.each(ERA_ENTRY_POINTS)('renders the migration-guide message verbatim for %s', (entryPoint) => {
    const line = fixtureLineOf(entryPoint);
    const reported = diagnostics.filter((diagnostic) => diagnostic.line === line);

    expect(reported).toHaveLength(1);
    expect(reported[0]?.text).toContain(NEITHER_ERA_CONTRACT_MESSAGE);
  });

  it('names the error type alongside its message, so the reader gets both halves of the intersection', () => {
    const named = diagnostics.filter((diagnostic) => diagnostic.text.includes('NeitherContractShape'));

    expect(named).toHaveLength(ERA_ENTRY_POINTS.length);
  });

  it('prints the message once per entry point, so one shared mention cannot stand in for four', () => {
    const occurrences = output.split(NEITHER_ERA_CONTRACT_MESSAGE).length - 1;

    expect(occurrences).toBe(ERA_ENTRY_POINTS.length);
  });
});
