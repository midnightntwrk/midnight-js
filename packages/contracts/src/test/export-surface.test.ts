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

import { describe, expect, it } from 'vitest';

import * as contracts from '../index';

const runtimeNames = (namespace: object): string[] =>
  Object.entries(namespace)
    .filter(([, value]) => value !== undefined)
    .map(([name]) => name)
    .sort();

const ROOT_RUNTIME_EXPORTS: readonly string[] = [
  'AnyEraTxFailedError',
  'BlankVerifierKeySlotError',
  'CallTxFailedError',
  'ContractLog',
  'ContractNotFoundError',
  'ContractTypeError',
  'DISPATCH_BREADCRUMB_MESSAGE',
  'DeployTxFailedError',
  'EraArtifactMismatchError',
  'EraInvariantViolationError',
  'HeadReadFailedError',
  'HeadStateEraMismatchError',
  'IncompleteCallTxPrivateStateConfig',
  'IncompleteDeployContractPrivateStateConfig',
  'IncompleteFindContractPrivateStateConfig',
  'IndexerInconsistencyError',
  'InsertVerifierKeyTxFailedError',
  'Ledger8',
  'LedgerParametersUnservedError',
  'MixedEraScopeError',
  'PrivateStateNotFoundError',
  'ProviderFailedError',
  'RemoveVerifierKeyTxFailedError',
  'ReplaceMaintenanceAuthorityTxFailedError',
  'ScopedTransactionEraUnsupportedError',
  'ScopedTransactionIdentityMismatchError',
  'StaleHeadError',
  'SubmitRejectionUndiagnosedError',
  'TxFailedError',
  'UnknownResultEraError',
  'VerifierKeyMismatchError',
  'ZswapOutputResolutionError',
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
  'getAnyEraContractState',
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

const LEDGER8_RUNTIME_EXPORTS: readonly string[] = [
  'AmbiguousEntryPointError',
  'ArtifactOnLedger9StateError',
  'CallTxFailedError',
  'ContractStateUnsupportedError',
  'DeployNotStoredError',
  'DeployOnLedger9Error',
  'DeployTxFailedError',
  'DeployUnconfirmedError',
  'InsertVerifierKeyTxFailedError',
  'MaintenanceOnLedger9Error',
  'RecipientUnmappableError',
  'RemoveVerifierKeyTxFailedError',
  'ReplaceAuthorityUnconfirmedError',
  'ReplaceMaintenanceAuthorityTxFailedError',
  'ShieldedSpendUnsupportedError',
  'SigningKeyNotStoredError',
  'SigningKeyUnavailableError',
  'SigningKeyUnusableError',
  'createCircuitCallTxInterface'
];

describe('the runtime surface of the contracts barrel', () => {
  it('exports exactly the pinned runtime names, so none leaks in or disappears', () => {
    expect(runtimeNames(contracts)).toEqual([...ROOT_RUNTIME_EXPORTS].sort());
  });

  it('exports exactly the pinned runtime names from the Ledger8 namespace', () => {
    expect(runtimeNames(contracts.Ledger8)).toEqual([...LEDGER8_RUNTIME_EXPORTS].sort());
  });
});
