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
      'AnyContract',
      'AnyFinalizedCallTxData',
      'AnySubmittedCallTx',
      'CallResultPrivate',
      'CallTxOptions',
      'CallTxOptionsBase',
      'CallTxOptionsWithPrivateStateId',
      'CircuitCallTxInterface',
      'CircuitIdOf',
      'CircuitMaintenanceTxInterfaces',
      'ContractConstructorOptionsProviderDataDependencies',
      'ContractProviders',
      'ContractStates',
      'ContractTypeMismatch',
      'DeployContractOptions',
      'DeployContractOptionsBase',
      'DeployContractOptionsWithPrivateState',
      'DeployedContract',
      'EraMismatchOptions',
      'EraMismatchReason',
      'FinalizedCallTxData',
      'FinalizedDeployTxData',
      'FinalizedMaintenanceTxData',
      'FindDeployedContractOptions',
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
      'Ledger8FinalizedCallTxData',
      'Ledger8FinalizedCallTxPublicData',
      'Ledger8FinalizedDeployTxData',
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
      'Ledger9CallOptions',
      'Ledger9CallOptionsBase',
      'Ledger9CallOptionsProviderDataDependencies',
      'Ledger9CallOptionsWithArguments',
      'Ledger9CallOptionsWithPrivateState',
      'Ledger9CallOptionsWithProviderDataDependencies',
      'Ledger9CallResult',
      'Ledger9CallResultPrivate',
      'Ledger9CallResultPublic',
      'Ledger9CallTxOptions',
      'Ledger9CallTxOptionsBase',
      'Ledger9CallTxOptionsWithPrivateStateId',
      'Ledger9CircuitCallTxInterface',
      'Ledger9CircuitId',
      'Ledger9CircuitMaintenanceTxInterface',
      'Ledger9CircuitMaintenanceTxInterfaces',
      'Ledger9Contract',
      'Ledger9ContractConstructorOptions',
      'Ledger9ContractConstructorOptionsBase',
      'Ledger9ContractConstructorOptionsWithArguments',
      'Ledger9ContractConstructorOptionsWithPrivateState',
      'Ledger9ContractConstructorOptionsWithProviderDataDependencies',
      'Ledger9ContractConstructorResult',
      'Ledger9ContractMaintenanceTxInterface',
      'Ledger9ContractProviders',
      'Ledger9CrossContractConfig',
      'Ledger9DeployContractOptions',
      'Ledger9DeployContractOptionsBase',
      'Ledger9DeployContractOptionsShared',
      'Ledger9DeployContractOptionsWithPrivateState',
      'Ledger9DeployedContract',
      'Ledger9DeployTxOptions',
      'Ledger9DeployTxOptionsBase',
      'Ledger9DeployTxOptionsWithPrivateState',
      'Ledger9DeployTxOptionsWithPrivateStateId',
      'Ledger9FinalizedCallTxData',
      'Ledger9FinalizedCallTxPublicData',
      'Ledger9FinalizedDeployTxData',
      'Ledger9FinalizedDeployTxDataBase',
      'Ledger9FinalizedDeployTxPublicData',
      'Ledger9FinalizedMaintenanceTxData',
      'Ledger9FindDeployedContractOptions',
      'Ledger9FindDeployedContractOptionsBase',
      'Ledger9FindDeployedContractOptionsExistingPrivateState',
      'Ledger9FindDeployedContractOptionsStorePrivateState',
      'Ledger9FoundContract',
      'Ledger9FoundDeployTxData',
      'Ledger9LogEvent',
      'Ledger9SubmitCallTxProviders',
      'Ledger9SubmittedCallTx',
      'Ledger9SubmitTxProviders',
      'Ledger9TransactionContext',
      'Ledger9UnprovenCallTxProvidersWithPrivateState',
      'Ledger9UnprovenDeployTxOptions',
      'Ledger9UnprovenDeployTxProviders',
      'Ledger9UnsubmittedCallTxData',
      'Ledger9UnsubmittedCallTxPrivateData',
      'Ledger9UnsubmittedDeployTxData',
      'Ledger9UnsubmittedDeployTxDataBase',
      'Ledger9UnsubmittedDeployTxPrivateData',
      'Ledger9UnsubmittedDeployTxPrivateDataFull',
      'Ledger9UnsubmittedDeployTxPublicData',
      'Ledger9UnsubmittedTxData',
      'ScopedTransactionOptions',
      'SubmitRejectionUndiagnosedCause',
      'SubmittedCallTx',
      'SubmittedOperation',
      'SubmittedOperationKind',
      'SubmitTxOptions',
      'SubmitTxProviders',
      'TxFailedDetails',
      'TxFailedOperation',
      'UnprovenCallTxProvidersBase',
      'UnsubmittedCallTxData'
    ]);
  });
});
