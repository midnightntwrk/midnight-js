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
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(__dirname, '../..');

const DIST_INDEX_PATH = 'dist/index.js';

/**
 * Every runtime value the package publishes, pinned by name.
 *
 * A one-directional assertion (`toContain`) would stay green while an export
 * leaked in or vanished, so the list is compared for strict equality. Changing
 * the published surface is expected to fail this test: update the list in the
 * same commit that changes the surface.
 *
 * Type-only exports have no runtime binding and are pinned separately, by
 * `contracts-type-acl.test.ts`, which reads them off the barrel with the
 * compiler's own resolution.
 *
 * `Ledger8` is one name here and a namespace of its own behind it: the members
 * inside it are pinned by `ledger8-namespace.test.ts`, so this list stays a
 * list of the names a consumer imports.
 */
const RUNTIME_EXPORTS: readonly string[] = [
  'AnyEraTxFailedError',
  'BlankVerifierKeySlotError',
  'CURRENT_PIPELINE_ERA',
  'CallTxFailedError',
  'ContractLog',
  'ContractTypeError',
  'DISPATCH_BREADCRUMB_MESSAGE',
  'DeployTxFailedError',
  'EraArtifactMismatchError',
  'EraInvariantViolationError',
  'HeadStateEraMismatchError',
  'IncompleteCallTxPrivateStateConfig',
  'IncompleteFindContractPrivateStateConfig',
  'IndexerInconsistencyError',
  'InsertVerifierKeyTxFailedError',
  'Ledger8',
  'MixedEraScopeError',
  'RETAINED_PIPELINE_ERA',
  'RemoveVerifierKeyTxFailedError',
  'ReplaceMaintenanceAuthorityTxFailedError',
  'ScopedTransactionIdentityMismatchError',
  'ScopedTxEraUnsupportedError',
  'StaleHeadError',
  'SubmitRejectionUndiagnosedError',
  'TxFailedError',
  'UnrecognisedResultEraError',
  'VerifierKeyMismatchError',
  'createCallTxOptions',
  'createCircuitCallTxInterface',
  'createCircuitMaintenanceTxInterface',
  'createCircuitMaintenanceTxInterfaces',
  'createContractMaintenanceTxInterface',
  'createUnprovenCallTx',
  'createUnprovenCallTxFromInitialStates',
  'createUnprovenDeployTx',
  'createUnprovenDeployTxFromVerifierKeys',
  'deployContract',
  'findDeployedContract',
  'getPublicStates',
  'getStates',
  'getUnshieldedBalances',
  'isLedger8Result',
  'isTransactionContext',
  'submitCallTx',
  'submitCallTxAsync',
  'submitDeployTx',
  'submitInsertVerifierKeyTx',
  'submitRemoveVerifierKeyTx',
  'submitReplaceAuthorityTx',
  'submitTx',
  'submitTxAsync',
  'verifierKeysEqual',
  'verifyContractState',
  'withContractScopedTransaction'
];

// Matches an `export { ... }` statement with or without a `from` clause. The
// bundle emits one of each: a pass-through re-export near the top, and the
// local export list at the end.
const EXPORT_STATEMENT = /^export\s*\{([^}]*)\}/gm;

// And the namespace form. Rollup happens to hoist `export * as Ledger8` into the
// brace list above as `ledger8 as Ledger8`, so the brace scan alone catches it
// today -- but that is an emit detail. `preserveModules`, a different bundler or
// plain `tsc` leave the statement standing, and a scan that reads brace lists
// only would then report the name as a DROPPED export rather than as a statement
// it could not parse: a failure that sends a reader looking for a deleted export
// that is still there.
const NAMESPACE_EXPORT_STATEMENT = /^export\s*\*\s*as\s+(\w+)\s+from/gm;

/**
 * Reads the exported names out of the built bundle.
 *
 * The bundle rather than `../index` is the subject on purpose. The build elides
 * type-only re-exports, while vitest's per-file transform keeps a binding for
 * each of them -- so `Object.keys` over the sources reports names no consumer
 * can ever import, and would pin a transform artifact instead of the shipped
 * surface.
 *
 * A missing bundle throws rather than skipping: a skipped test is reported as a
 * pass, which would silence this gate exactly when there is nothing to check.
 * Turbo's `test` task dependsOn `build`, so `dist/` is present in CI.
 */
const readDistExports = (): string[] => {
  const absolute = resolve(PACKAGE_ROOT, DIST_INDEX_PATH);
  if (!existsSync(absolute)) {
    throw new Error(`${DIST_INDEX_PATH} is missing -- build the package before running this test`);
  }
  const bundle = readFileSync(absolute, 'utf8');
  const statements = [...bundle.matchAll(EXPORT_STATEMENT)];
  if (statements.length === 0) {
    throw new Error(`${DIST_INDEX_PATH} declares no 'export { ... }' statement`);
  }
  const named = statements.flatMap(([, clause]) =>
    clause
      .split(',')
      .map((name) => name.trim().split(/\s+as\s+/).pop() ?? '')
      .filter((name) => name.length > 0)
  );
  const namespaced = [...bundle.matchAll(NAMESPACE_EXPORT_STATEMENT)].map(([, name]) => name);
  return [...named, ...namespaced];
};

describe('Contracts value ACL', () => {
  /**
   * @given the built bundle of `@midnight-ntwrk/midnight-js-contracts`
   * @when its export statements are reduced to exported names
   * @then they equal the pinned set exactly, so neither a dropped export nor a
   *       leaked one goes unnoticed
   */
  it('publishes exactly this value surface', () => {
    const actual = readDistExports().sort();

    const expected = [...RUNTIME_EXPORTS].sort();

    expect(actual).toEqual(expected);
  });

  /**
   * @given the built bundle
   * @when its exported names are collected
   * @then no name is published twice
   */
  it('publishes no duplicate names', () => {
    const actual = readDistExports();

    const unique = new Set(actual);

    expect(unique.size).toBe(actual.length);
  });
});
