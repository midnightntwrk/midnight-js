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

import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { FailFallible } from '@midnight-ntwrk/midnight-js-types';
import {
  CONTRACTS_ERROR_CATEGORIES,
  CONTRACTS_ERROR_CODES,
  type ContractsErrorCode,
  type MidnightJsErrorCategory
} from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

import * as errors from '../errors';
import * as governance from '../governance/errors';
import { createMockFinalizedTxData, createMockFinalizedTxDataV8 } from './test-mocks';

const exported: unknown[] = [...Object.values(errors), ...Object.values(governance)];
const errorClasses = exported.filter(
  (value): value is abstract new (...args: never[]) => Error =>
    typeof value === 'function' && value.prototype instanceof Error
);

const ADDRESS = '0200'.repeat(8);
const SIGNING_KEY = 'a1'.repeat(32);
const CAUSE = new Error('root cause');
const finalizedTxData = createMockFinalizedTxData(FailFallible);
const v8Record = createMockFinalizedTxDataV8(FailFallible);
const noMismatch = { missing: [], keyless: [], mismatched: [] };

type Case = readonly [string, Error, ContractsErrorCode, MidnightJsErrorCategory];

const cases: readonly Case[] = [
  ['EraInvariantViolationError', new errors.EraInvariantViolationError('submitTx'), CONTRACTS_ERROR_CODES.ERA_INVARIANT_VIOLATION, 'INTERNAL'],
  ['EraArtifactMismatchError', new errors.EraArtifactMismatchError('unrecognised-contract-shape'), CONTRACTS_ERROR_CODES.ERA_ARTIFACT_MISMATCH, 'USAGE'],
  ['RetainedArtifactOnCurrentEraStateError', new errors.RetainedArtifactOnCurrentEraStateError(ADDRESS), CONTRACTS_ERROR_CODES.RETAINED_ARTIFACT_ON_CURRENT_ERA_STATE, 'USAGE'],
  ['Ledger8DeployOnV9Error', new errors.Ledger8DeployOnV9Error(), CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9, 'USAGE'],
  ['HeadStateEraMismatchError', new errors.HeadStateEraMismatchError('v9', 'v8'), CONTRACTS_ERROR_CODES.HEAD_STATE_ERA_MISMATCH, 'TRANSIENT'],
  ['IndexerInconsistencyError', new errors.IndexerInconsistencyError('v9', 'v8'), CONTRACTS_ERROR_CODES.INDEXER_INCONSISTENCY, 'INTEGRITY'],
  ['LedgerParametersUnservedError', new errors.LedgerParametersUnservedError(ADDRESS), CONTRACTS_ERROR_CODES.LEDGER_PARAMETERS_UNSERVED, 'ENVIRONMENT'],
  ['Ledger8ShieldedSpendUnsupportedError', new errors.Ledger8ShieldedSpendUnsupportedError('spend'), CONTRACTS_ERROR_CODES.LEDGER8_SHIELDED_SPEND_UNSUPPORTED, 'USAGE'],
  ['Ledger8SeamFailedError', new errors.Ledger8SeamFailedError('submitTx', 'increment', CAUSE), CONTRACTS_ERROR_CODES.LEDGER8_SEAM_FAILED, 'ENVIRONMENT'],
  ['StaleHeadError', new errors.StaleHeadError({ head: 'v8', kind: 'call', circuitId: 'increment', contractAddress: ADDRESS }, 'v9', CAUSE), CONTRACTS_ERROR_CODES.STALE_HEAD, 'UNCERTAIN'],
  ['SubmitRejectionUndiagnosedError', new errors.SubmitRejectionUndiagnosedError({ head: 'v8', kind: 'call', circuitId: 'increment', contractAddress: ADDRESS }, CAUSE, { reason: 'head-read-failed', headReadFailure: CAUSE }), CONTRACTS_ERROR_CODES.SUBMIT_REJECTION_UNDIAGNOSED, 'UNCERTAIN'],
  ['UnrecognisedResultEraError', new errors.UnrecognisedResultEraError('v7'), CONTRACTS_ERROR_CODES.UNRECOGNISED_RESULT_ERA, 'USAGE'],
  ['TxFailedError', new errors.TxFailedError(finalizedTxData), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['DeployTxFailedError', new errors.DeployTxFailedError(finalizedTxData), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['CallTxFailedError', new errors.CallTxFailedError(finalizedTxData, 'increment'), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['Ledger8CallTxFailedError', new errors.Ledger8CallTxFailedError(v8Record, 'increment'), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['Ledger8DeployTxFailedError', new errors.Ledger8DeployTxFailedError(v8Record, ADDRESS, SIGNING_KEY), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['ReplaceMaintenanceAuthorityTxFailedError', new governance.ReplaceMaintenanceAuthorityTxFailedError(finalizedTxData), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['RemoveVerifierKeyTxFailedError', new governance.RemoveVerifierKeyTxFailedError(finalizedTxData), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['InsertVerifierKeyTxFailedError', new governance.InsertVerifierKeyTxFailedError(finalizedTxData), CONTRACTS_ERROR_CODES.TX_FAILED, 'REJECTED'],
  ['ContractTypeError', new errors.ContractTypeError(new ContractState(), noMismatch, ADDRESS), CONTRACTS_ERROR_CODES.CONTRACT_TYPE_MISMATCH, 'USAGE'],
  ['ScopedTxEraUnsupportedError', new errors.ScopedTxEraUnsupportedError('v8'), CONTRACTS_ERROR_CODES.SCOPED_TX_ERA_UNSUPPORTED, 'USAGE'],
  ['MixedEraScopeError', new errors.MixedEraScopeError('increment'), CONTRACTS_ERROR_CODES.MIXED_ERA_SCOPE, 'USAGE'],
  ['IncompleteCallTxPrivateStateConfig', new errors.IncompleteCallTxPrivateStateConfig(), CONTRACTS_ERROR_CODES.INCOMPLETE_CALL_TX_PRIVATE_STATE_CONFIG, 'USAGE'],
  ['IncompleteDeployContractPrivateStateConfig', new errors.IncompleteDeployContractPrivateStateConfig(), CONTRACTS_ERROR_CODES.INCOMPLETE_DEPLOY_PRIVATE_STATE_CONFIG, 'USAGE'],
  ['IncompleteFindContractPrivateStateConfig', new errors.IncompleteFindContractPrivateStateConfig(), CONTRACTS_ERROR_CODES.INCOMPLETE_FIND_PRIVATE_STATE_CONFIG, 'USAGE'],
  ['ScopedTransactionIdentityMismatchError', new errors.ScopedTransactionIdentityMismatchError({ contractAddress: ADDRESS }, { contractAddress: ADDRESS }), CONTRACTS_ERROR_CODES.SCOPED_TX_IDENTITY_MISMATCH, 'USAGE'],
  ['BlankVerifierKeySlotError', new errors.BlankVerifierKeySlotError('increment'), CONTRACTS_ERROR_CODES.BLANK_VERIFIER_KEY_SLOT, 'INTEGRITY'],
  ['VerifierKeyMismatchError', new errors.VerifierKeyMismatchError('increment'), CONTRACTS_ERROR_CODES.VERIFIER_KEY_MISMATCH, 'INTEGRITY'],
  ['Ledger8DeployUnconfirmedError', new errors.Ledger8DeployUnconfirmedError(ADDRESS, SIGNING_KEY, CAUSE), CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_UNCONFIRMED, 'UNCERTAIN'],
  ['Ledger8AmbiguousEntryPointError', new errors.Ledger8AmbiguousEntryPointError('increment', 2), CONTRACTS_ERROR_CODES.LEDGER8_AMBIGUOUS_ENTRY_POINT, 'INTEGRITY'],
  ['Ledger8RecipientUnmappableError', new errors.Ledger8RecipientUnmappableError('increment', 'ab'.repeat(32)), CONTRACTS_ERROR_CODES.LEDGER8_RECIPIENT_UNMAPPABLE, 'USAGE'],
  ['Ledger8DeployNotStoredError', new errors.Ledger8DeployNotStoredError(ADDRESS, SIGNING_KEY, 'signing-key', CAUSE), CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_NOT_STORED, 'ENVIRONMENT'],
  ['Ledger8SigningKeyUnusableError', new errors.Ledger8SigningKeyUnusableError(ADDRESS), CONTRACTS_ERROR_CODES.LEDGER8_SIGNING_KEY_UNUSABLE, 'USAGE'],
  ['HeadReadFailedError', new errors.HeadReadFailedError('head read failed', { cause: CAUSE }), CONTRACTS_ERROR_CODES.HEAD_READ_FAILED, 'TRANSIENT'],
  ['ZswapOutputResolutionError', new errors.ZswapOutputResolutionError('unresolved', { cause: CAUSE }), CONTRACTS_ERROR_CODES.ZSWAP_OUTPUT_UNRESOLVED, 'USAGE'],
  ['ContractNotFoundError', new errors.ContractNotFoundError('no contract'), CONTRACTS_ERROR_CODES.CONTRACT_NOT_FOUND, 'USAGE'],
  ['PrivateStateNotFoundError', new errors.PrivateStateNotFoundError('no private state'), CONTRACTS_ERROR_CODES.PRIVATE_STATE_NOT_FOUND, 'USAGE']
];

describe('contracts error classes', () => {
  it('every error class in errors.ts and governance/errors.ts extends MidnightJsError', () => {
    expect(errorClasses.length).toBeGreaterThan(30);
    expect(errorClasses.filter((c) => !(c.prototype instanceof MidnightJsError)).map((c) => c.name)).toEqual([]);
  });

  it('category table covers every contracts code exactly', () => {
    expect(Object.keys(CONTRACTS_ERROR_CATEGORIES).sort()).toEqual(Object.values(CONTRACTS_ERROR_CODES).sort());
  });

  it('the table below covers every concrete error class', () => {
    const covered = new Set(cases.map(([name]) => name));
    const concrete = errorClasses.map((c) => c.name).filter((name) => name !== 'AnyEraTxFailedError');

    expect(concrete.filter((name) => !covered.has(name))).toEqual([]);
  });

  it.each(cases)('%s is a MidnightJsError with its code and category', (_name, error, code, category) => {
    expect(error).toBeInstanceOf(MidnightJsError);
    expect(error).toMatchObject({ code, category });
    expect(CONTRACTS_ERROR_CATEGORIES[code]).toBe(category);
  });

  it('ContractTypeError is no longer a TypeError (accepted break)', () => {
    expect(errors.ContractTypeError.prototype instanceof TypeError).toBe(false);
  });

  it('IncompleteCallTxPrivateStateConfig keeps a name of its own', () => {
    expect(new errors.IncompleteCallTxPrivateStateConfig().name).toBe('IncompleteCallTxPrivateStateConfig');
  });

  it.each([
    ['ContractNotFoundError', new errors.ContractNotFoundError('no contract')],
    ['PrivateStateNotFoundError', new errors.PrivateStateNotFoundError('no private state')]
  ])('%s keeps a name of its own', (name, error) => {
    expect(error.name).toBe(name);
  });

  it('ContractTypeError keeps a name of its own', () => {
    expect(new errors.ContractTypeError(new ContractState(), noMismatch, ADDRESS).name).toBe('ContractTypeError');
  });
});
