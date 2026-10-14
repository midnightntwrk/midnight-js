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

import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '../..');
// The entry points that publish this package's own names. The others re-export
// the ledger, runtime and platform packages under their own spelling.
const ENTRY_POINTS = ['src/index.ts', 'src/errors.ts', 'src/version.ts', 'src/prove.ts', 'src/v8.ts', 'src/engine.ts'].map(
  (entry) => resolve(PACKAGE_ROOT, entry)
);

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = resolve(PACKAGE_ROOT, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  if (error) {
    throw new Error(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`);
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, PACKAGE_ROOT).options;
};

const exportedNames = (): string[] => {
  const program = ts.createProgram(ENTRY_POINTS, compilerOptions());
  const checker = program.getTypeChecker();
  return ENTRY_POINTS.flatMap((entry) => {
    const source = program.getSourceFile(entry);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      throw new Error(`${entry} resolves to no module symbol`);
    }
    return checker.getExportsOfModule(moduleSymbol).map((exported) => exported.getName());
  });
};

describe('protocol export names', () => {
  const names = exportedNames();

  it('reads the published names of every entry point', () => {
    expect(names).toContain('proveLedger8Transaction');
  });

  it('never names a provider method a seam', () => {
    expect(names.filter((name) => /seam/i.test(name))).toEqual([]);
  });

  it('spells the era prefix Ledger8 / Ledger9, never V8 / V9', () => {
    expect(names.filter((name) => /V[89]|v[89][A-Z]/.test(name))).toEqual([]);
  });

  it('never ends a type or class name with the era', () => {
    expect(names.filter((name) => /^[A-Z].*[a-z]Ledger[89]$/.test(name))).toEqual([]);
  });

  it('never names anything an arm', () => {
    const words = (name: string): string[] =>
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[\s_]+/)
        .map((word) => word.toLowerCase());

    expect(names.filter((name) => words(name).some((word) => word === 'arm' || word === 'arms'))).toEqual([]);
  });
});
