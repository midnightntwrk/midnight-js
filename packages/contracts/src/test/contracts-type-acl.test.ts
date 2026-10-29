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
const BARREL = resolve(PACKAGE_ROOT, 'src/index.ts');

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = resolve(PACKAGE_ROOT, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  if (error) {
    throw new Error(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(error.messageText, ' ')}`);
  }
  return ts.parseJsonConfigFileContent(config, ts.sys, PACKAGE_ROOT).options;
};

/**
 * The names the barrel exports that carry NO runtime meaning, read from the
 * source with the compiler's own resolution.
 *
 * A type export has no runtime key, so no assertion over the imported module
 * object can see one leave. Declarations MOVED between packages — a member
 * lifted into a shared base in `midnight-js-types`, say — keep every name this
 * package exported only if the re-export is written; this is what proves it
 * was.
 *
 * The same helper guards `midnight-js-protocol`'s barrel, in
 * `packages/protocol/src/test/protocol-type-acl.test.ts`. Deliberately
 * duplicated rather than shared: neither package depends on the other's tests.
 */
const typeOnlyExportNames = (): string[] => {
  const program = ts.createProgram([BARREL], compilerOptions());
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(BARREL);
  if (!source) {
    throw new Error(`${BARREL} is not part of the program`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) {
    throw new Error(`${BARREL} resolves to no module symbol`);
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

describe('Contracts type ACL', () => {
  it('publishes exactly this type surface', () => {
    expect(typeOnlyExportNames()).toEqual([
      'AnyEraContract',
      'AnyEraDeployedContract',
      'AnyEraFinalizedCallTxData',
      'AnyEraFoundContract',
      'AnyEraMaintenanceTxData',
      'AnyEraSubmittedCallTx',
      'CallOptions',
      'CallOptionsBase',
      'CallOptionsProviderDataDependencies',
      'CallOptionsWithArguments',
      'CallOptionsWithPrivateState',
      'CallOptionsWithProviderDataDependencies',
      'CallResult',
      'CallResultPrivate',
      'CallTxOptions',
      'CallTxOptionsBase',
      'CallTxOptionsWithPrivateStateId',
      'CircuitCallTxInterface',
      'CircuitIdOf',
      'CircuitMaintenanceTxInterfaces',
      'ContractConstructorOptions',
      'ContractConstructorOptionsBase',
      'ContractConstructorOptionsProviderDataDependencies',
      'ContractConstructorOptionsWithArguments',
      'ContractConstructorOptionsWithPrivateState',
      'ContractConstructorOptionsWithProviderDataDependencies',
      'ContractConstructorResult',
      'ContractProviders',
      'ContractStates',
      'ContractTypeMismatch',
      'CrossContractConfig',
      'DeployContractOptions',
      'DeployContractOptionsBase',
      'DeployContractOptionsShared',
      'DeployContractOptionsWithPrivateState',
      'DeployedContract',
      'DeployTxOptions',
      'DeployTxOptionsBase',
      'DeployTxOptionsWithPrivateState',
      'DeployTxOptionsWithPrivateStateId',
      'EraMismatchOptions',
      'EraMismatchReason',
      'FinalizedCallTxData',
      'FinalizedDeployTxData',
      'FinalizedDeployTxDataBase',
      'FindDeployedContractOptions',
      'FindDeployedContractOptionsBase',
      'FindDeployedContractOptionsExistingPrivateState',
      'FindDeployedContractOptionsStorePrivateState',
      'FoundContract',
      'FoundDeployTxData',
      'FoundDeployTxPublicData',
      'Ledger8CallResultPrivate',
      'Ledger8CallResultPublic',
      'Ledger8CallTxOptions',
      'Ledger8CallTxOptionsBase',
      'Ledger8CallTxOptionsWithPrivateStateId',
      'Ledger8CallTxTarget',
      'Ledger8CallUnsupportedReason',
      'Ledger8Circuit',
      'Ledger8CircuitCallTxInterface',
      'Ledger8CircuitContext',
      'Ledger8CircuitId',
      'Ledger8CircuitMaintenanceTxInterface',
      'Ledger8CircuitMaintenanceTxInterfaces',
      'Ledger8CircuitParameters',
      'Ledger8CircuitResult',
      'Ledger8CircuitReturnType',
      'Ledger8ConstructorParameters',
      'Ledger8Contract',
      'Ledger8ContractCall',
      'Ledger8ContractCallPublic',
      'Ledger8ContractMaintenanceTxInterface',
      'Ledger8ContractProviders',
      'Ledger8DeployContractOptions',
      'Ledger8DeployContractOptionsBase',
      'Ledger8DeployContractOptionsWithPrivateState',
      'Ledger8DeployedContract',
      'Ledger8DeployTxData',
      'Ledger8FinalizedCallTxData',
      'Ledger8FinalizedCallTxPublicData',
      'Ledger8FinalizedMaintenanceTxData',
      'Ledger8FindDeployedContractOptions',
      'Ledger8FoundContract',
      'Ledger8FoundDeployTxData',
      'Ledger8FoundDeployTxPublicData',
      'Ledger8InitialStateResult',
      'Ledger8KeyedOperation',
      'Ledger8NotStoredStage',
      'Ledger8PrivateState',
      'Ledger8SigningKeyReason',
      'Ledger8SubmittedCallTx',
      'Ledger8UnsubmittedCallTxData',
      'Ledger8Witness',
      'Ledger9CallResultPrivate',
      'Ledger9CallResultPublic',
      'Ledger9CallTxOptions',
      'Ledger9CallTxOptionsBase',
      'Ledger9CallTxOptionsWithPrivateStateId',
      'Ledger9CircuitCallTxInterface',
      'Ledger9CircuitMaintenanceTxInterface',
      'Ledger9CircuitMaintenanceTxInterfaces',
      'Ledger9Contract',
      'Ledger9ContractMaintenanceTxInterface',
      'Ledger9ContractProviders',
      'Ledger9DeployContractOptions',
      'Ledger9DeployContractOptionsBase',
      'Ledger9DeployContractOptionsWithPrivateState',
      'Ledger9DeployedContract',
      'Ledger9FinalizedCallTxData',
      'Ledger9FinalizedCallTxPublicData',
      'Ledger9FinalizedDeployTxData',
      'Ledger9FinalizedDeployTxPublicData',
      'Ledger9FinalizedMaintenanceTxData',
      'Ledger9FindDeployedContractOptions',
      'Ledger9FoundContract',
      'Ledger9FoundDeployTxData',
      'Ledger9SubmittedCallTx',
      'Ledger9UnsubmittedCallTxData',
      'LogEvent',
      'ScopedTransactionOptions',
      'SubmitCallTxProviders',
      'SubmitRejectionUndiagnosedCause',
      'SubmittedCallTx',
      'SubmittedOperation',
      'SubmittedOperationKind',
      'SubmitTxOptions',
      'SubmitTxProviders',
      'TransactionContext',
      'TxFailedDetails',
      'TxFailedOperation',
      'UnprovenCallTxProvidersBase',
      'UnprovenCallTxProvidersWithPrivateState',
      'UnprovenDeployTxOptions',
      'UnprovenDeployTxProviders',
      'UnsubmittedCallTxData',
      'UnsubmittedCallTxPrivateData',
      'UnsubmittedDeployTxData',
      'UnsubmittedDeployTxDataBase',
      'UnsubmittedDeployTxPrivateData',
      'UnsubmittedDeployTxPrivateDataFull',
      'UnsubmittedDeployTxPublicData',
      'UnsubmittedTxData'
    ]);
  });
});
