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
import { beforeAll, describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '../..');

const entryPath = (entryName: string): string => resolve(PACKAGE_ROOT, `src/${entryName}.ts`);

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = resolve(PACKAGE_ROOT, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  if (error) {
    throw new Error(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`);
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, PACKAGE_ROOT).options;
};

/**
 * The names a build entry exports that carry NO runtime meaning, read from the
 * source with the compiler's own resolution rather than from the built
 * declarations.
 *
 * `protocol-acl.test.ts` pins the runtime keys, which a type export never has —
 * so a type dropped from an entry changes nothing any runtime assertion can
 * see. This is the other half of that pin.
 */
const typeOnlyExportNames = (program: ts.Program, entryName: string): string[] => {
  const entry = entryPath(entryName);
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  if (!source) {
    throw new Error(`${entry} is not part of the program`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    throw new Error(`${entry} resolves to no module symbol`);
  }

  return checker
    .getExportsOfModule(moduleSymbol)
    .filter((exported) => {
      const resolved = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      return (resolved.flags & ts.SymbolFlags.Value) === 0;
    })
    .map((exported) => exported.getName())
    .sort((a, b) => a.localeCompare(b));
};

describe('Protocol type ACL', () => {
  let barrelTypeNames: string[];
  let engineTypeNames: string[];

  // Both entries are read from one program: building a second one over the
  // same source graph doubles the cost and answers the same. Asking the
  // checker for every export of that graph is a multi-second compiler run —
  // seconds locally, and several times that on a CI runner under v8 coverage
  // — so the timeout belongs here, on the one compiler run, rather than on
  // the assertions or on the whole package.
  beforeAll(() => {
    const program = ts.createProgram([entryPath('index'), entryPath('engine')], compilerOptions());
    barrelTypeNames = typeOnlyExportNames(program, 'index');
    engineTypeNames = typeOnlyExportNames(program, 'engine');
  }, 60_000);

  it('publishes exactly this type surface from the barrel', () => {
    expect(barrelTypeNames).toEqual([
      'CallTranscriptSource',
      'ComposeCallEntry',
      'ComposeCallOptions',
      'ComposeDeployOptions',
      'ComposeOption',
      'ComposeStage',
      // The constructor vocabulary belongs here as much as the circuit
      // vocabulary does: both name parameters and results of `Ledger8Engine`
      // methods, which the barrel publishes.
      'ConstructorResultPojo',
      'ContractEntryPointPojo',
      'ContractStatePojo',
      // The current/retained split of `LedgerVersion`, published beside it:
      // a consumer writing a per-era handler cannot name which half it is
      // writing for without these.
      'CurrentLedgerVersion',
      'DeployResultPojo',
      'DownConvertedState',
      'DownConvertStage',
      'EncodedStateValue',
      // The option, parameter and return vocabulary of the era facade's
      // `partitionCallTranscript`. Publishing the method without them leaves a
      // caller unable to name what it takes or answers with.
      'EraPartitionCallOptions',
      'ExecuteCircuitOptions',
      'ExecuteConstructorOptions',
      // Named by the state handles the results carry: `DownConvertedState.data`
      // is a `Ledger8ChargedState` and `.data.state` a `Ledger8StateValue`, and
      // neither was nameable outside the package that declares them.
      'Ledger8ChargedState',
      // Named by `ConstructorResultPojo.contractState`, which this barrel
      // publishes: the state a retained constructor built, as the handle it is.
      'Ledger8DeployableContractState',
      'Ledger8Engine',
      'Ledger8InstanceAxis',
      'Ledger8StateValue',
      'LedgerEra',
      'LedgerParametersOption',
      'LedgerVersion',
      'PartitionContext',
      'PartitionedCallTranscript',
      'ProtocolErrorCode',
      'ProtocolV8',
      'ProtocolVersionSource',
      'ProtocolVersionUnknownReason',
      'RetainedEraSubpath',
      'RetainedLedgerVersion',
      'TranscriptPojo',
      'VersionedRecord',
      'VersionResolutionPath',
      'WrapKeepStateCallOptions'
    ]);
  });

  it('publishes exactly this type surface from the ./engine subpath', () => {
    // `Ledger8Engine.reexpressOperationsForCurrentEra` takes
    // `ContractEntryPointPojo[]`, so this entry has to publish that name to be
    // callable by a consumer that imports the engine through its own subpath.
    expect(engineTypeNames).toEqual([
      'ConstructorResultPojo',
      'ContractEntryPointPojo',
      'DownConvertedState',
      'EncodedStateValue',
      'ExecuteCircuitOptions',
      'ExecuteConstructorOptions',
      'Ledger8ChargedState',
      'Ledger8DeployableContractState',
      'Ledger8Engine',
      'Ledger8StateValue',
      'TranscriptPojo',
      'WrapKeepStateCallOptions'
    ]);
  });
});
