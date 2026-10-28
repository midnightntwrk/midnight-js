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

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '../..');
const CONSUMER = resolve(__dirname, 'ledger8-declaration-emit-consumer.ts');

const CONSUMER_SOURCE = `
import {
  createCircuitCallTxInterface,
  createCircuitMaintenanceTxInterface,
  createCircuitMaintenanceTxInterfaces,
  createContractMaintenanceTxInterface,
  deployContract,
  findDeployedContract,
  submitCallTx,
  submitCallTxAsync,
  submitInsertVerifierKeyTx,
  submitRemoveVerifierKeyTx,
  submitReplaceAuthorityTx
} from '@midnight-ntwrk/midnight-js-contracts';

import type * as Counter016 from '../../../../testkit-js/testkit-js/src/fixtures/hf/counter-016/compiled/contract/index.js';

type C = Counter016.Contract<Record<string, never>>;
type K = 'increment';
declare function arg<T>(): T;

export const deployed = deployContract<C>(arg(), arg());
export const found = findDeployedContract<C>(arg(), arg());
export const called = submitCallTx<C, K>(arg(), arg());
export const submitted = submitCallTxAsync<C, K>(arg(), arg());
export const callTx = createCircuitCallTxInterface<C>(arg(), arg(), arg(), arg());
export const circuitMaintenance = createCircuitMaintenanceTxInterface<C>(arg(), arg(), arg(), arg());
export const circuitMaintenances = createCircuitMaintenanceTxInterfaces<C>(arg(), arg(), arg());
export const contractMaintenance = createContractMaintenanceTxInterface<C>(arg(), arg(), arg());
export const inserted = submitInsertVerifierKeyTx<C>(arg(), arg(), arg(), arg(), arg());
export const removed = submitRemoveVerifierKeyTx<C>(arg(), arg(), arg(), arg());
export const replaceAuthority = submitReplaceAuthorityTx<C>(arg(), arg(), arg());
`;

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  skipLibCheck: true
};

/**
 * Type-checks a consumer of the BUILT package the way a library that publishes declarations does,
 * and returns every diagnostic, declaration emit included.
 *
 * The package resolves through its own `exports` to `dist/index.d.ts`: the bundled declarations
 * are where a namespace-only name becomes unnameable, and the source modules would hide it.
 */
const declarationEmitDiagnostics = (): string[] => {
  if (!existsSync(resolve(PACKAGE_ROOT, 'dist/index.d.ts'))) {
    throw new Error('dist/index.d.ts is missing -- build the package before running this test');
  }
  const host = ts.createCompilerHost(compilerOptions);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.readFile = (fileName) => (fileName === CONSUMER ? CONSUMER_SOURCE : readFile(fileName));
  host.fileExists = (fileName) => fileName === CONSUMER || fileExists(fileName);
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    fileName === CONSUMER
      ? ts.createSourceFile(fileName, CONSUMER_SOURCE, languageVersion, true)
      : getSourceFile(fileName, languageVersion, ...rest);

  const program = ts.createProgram([CONSUMER], compilerOptions, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
};

describe('a dApp that emits declarations', () => {
  /**
   * @given a consumer that exports the inferred result of every ledger 8 entry point
   * @when it is compiled against the built package with `declaration: true`
   * @then the compiler can name every type, so there is no TS4023
   */
  it('can export a value inferred from each ledger 8 entry point', () => {
    expect(declarationEmitDiagnostics()).toEqual([]);
  });
});
