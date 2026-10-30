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

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import ts from 'typescript';

const words = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_]+/)
    .map((word) => word.toLowerCase());

const RULES = [
  ['says "seam"', (name) => /seam/i.test(name)],
  ['says "arm"', (name) => words(name).some((word) => word === 'arm' || word === 'arms')],
  ['spells the era V8 / V9 instead of Ledger8 / Ledger9', (name) => /V[89](?![0-9])|v[89](?=[A-Z_]|$)/.test(name)],
  ['ends a type or class name with the era', (name) => /^[A-Z].*[a-z]Ledger[89]$/.test(name)]
];

const sourceOf = (packageRoot, subpath, types) => {
  const source = join(packageRoot, types.replace(/^\.\/dist\//, 'src/').replace(/\.d\.ts$/, '.ts'));
  if (!existsSync(source)) {
    throw new Error(`${subpath} publishes ${types}, but ${source} does not exist`);
  }
  return source;
};

const entryPoints = (packageRoot, skipSubpaths) => {
  const { exports } = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  return Object.entries(exports)
    .filter(([subpath, target]) => typeof target === 'object' && !skipSubpaths.includes(subpath))
    .map(([subpath, target]) => sourceOf(packageRoot, subpath, target.types));
};

const compilerOptions = (packageRoot) => {
  const configPath = join(packageRoot, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  if (error) {
    throw new Error(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`);
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, packageRoot).options;
};

const exportsOfEntryPoints = (packageRoot, skipSubpaths) => {
  const entries = entryPoints(packageRoot, skipSubpaths);
  const program = ts.createProgram(entries, compilerOptions(packageRoot));
  const checker = program.getTypeChecker();
  const exports = entries.flatMap((entry) => {
    const source = program.getSourceFile(entry);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
      throw new Error(`${entry} resolves to no module symbol`);
    }
    return checker.getExportsOfModule(moduleSymbol);
  });
  return { checker, exports };
};

/**
 * Every name a package publishes, read from the sources of its `exports` entry points with the
 * compiler's own resolution. A namespace export (`export * as X`) contributes its members too, as
 * `X.member`, unless it is listed in `skipNamespaces`.
 */
export const publishedNames = (packageRoot, { skipSubpaths = [], skipNamespaces = [] } = {}) => {
  const { checker, exports } = exportsOfEntryPoints(packageRoot, skipSubpaths);
  return exports.flatMap((exported) => {
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const isNamespace = (target.flags & (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule)) !== 0;
    if (!isNamespace || skipNamespaces.includes(exported.name)) {
      return [exported.name];
    }
    return [exported.name, ...checker.getExportsOfModule(target).map((member) => `${exported.name}.${member.name}`)];
  });
};

/** The published names that break a naming rule of the public API, each with the rule it breaks. */
export const namingViolations = (names) =>
  names.flatMap((name) => {
    const own = name.split('.').pop();
    return RULES.filter(([, breaks]) => breaks(own)).map(([rule]) => `${name} ${rule}`);
  });

const LEDGER_PREFIX = /^Ledger[89]/;
const CONSTRAINED_TO_CONTRACT_ANY = /\bContract\.Any\b/;

const isTypeBoundToContractAny = (declaration) =>
  (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) &&
  (declaration.typeParameters ?? []).some(
    (parameter) => parameter.constraint !== undefined && CONSTRAINED_TO_CONTRACT_ANY.test(parameter.constraint.getText())
  );

/**
 * The exported types (aliases and interfaces) with a type parameter constrained to `Contract.Any`
 * whose name carries no ledger prefix, outside the files that hold the era-picking aliases. Such a
 * type is bound to ledger 9 and must say so.
 */
export const unprefixedLedger9Types = (packageRoot, { aliasFiles = [], skipSubpaths = [] } = {}) => {
  const { checker, exports } = exportsOfEntryPoints(packageRoot, skipSubpaths);
  const flagged = exports.filter((exported) => {
    if (LEDGER_PREFIX.test(exported.name)) {
      return false;
    }
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    return (target.declarations ?? []).some(
      (declaration) =>
        !aliasFiles.includes(basename(declaration.getSourceFile().fileName)) && isTypeBoundToContractAny(declaration)
    );
  });
  return [...new Set(flagged.map((exported) => exported.name))].sort();
};
