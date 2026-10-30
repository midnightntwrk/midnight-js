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

import { describe, expect, it } from 'vitest';

import { namingViolations, publishedNames, unprefixedLedger9Types } from '../../../../build-tools/published-names.mjs';

const names = publishedNames(resolve(__dirname, '../..'));

const EXPECTED_PUBLISHED_NAMES = [
  'All',
  'AnyPrivateState',
  'AnyProvableCircuitId',
  'ArtifactRuntimeVersionUnavailableError',
  'asContractAddress',
  'asEffectOption',
  'assertProvidersSupportEra',
  'BlockHash',
  'BlockHashConfig',
  'BlockHeightConfig',
  'BlockInfo',
  'CallResultPrivateBase',
  'CallResultPublicBase',
  'ContractCallPrivateBase',
  'ContractEvent',
  'ContractEventAddress',
  'ContractEventBase',
  'ContractEventCursor',
  'ContractEventFieldPrefix',
  'ContractEventFilterBase',
  'ContractEventQueryFilter',
  'ContractEventsPage',
  'ContractEventSubscriptionFilter',
  'ContractEventType',
  'ContractKeyLocation',
  'ContractStateAndParametersRead',
  'ContractStateObservableConfig',
  'ContractStateRead',
  'createLedger9MidnightProvider',
  'createLedger9ProofProvider',
  'createLedger9WalletProvider',
  'createMidnightProviderFromHandlers',
  'createProofProviderFromHandlers',
  'createProofProviderFromProvingProviders',
  'createProverKey',
  'createVerifierKey',
  'createWalletProviderFromHandlers',
  'createZKIR',
  'DecodedState',
  'DecodersFor',
  'encodeContractKeyLocation',
  'EraDeclaringProvider',
  'EraEntryShape',
  'exitResultOrError',
  'ExportDecryptionError',
  'ExportPrivateStatesOptions',
  'ExportSigningKeysOptions',
  'FailEntirely',
  'FailFallible',
  'Fees',
  'FinalizedTx',
  'FinalizedTxRead',
  'FinalizedTxRecord',
  'ForeignLedgerTransactionError',
  'ForeignLedgerTransactionReason',
  'hashVerifierKey',
  'ImportConflictError',
  'ImportPrivateStatesOptions',
  'ImportPrivateStatesResult',
  'ImportSigningKeysOptions',
  'ImportSigningKeysResult',
  'InvalidExportFormatError',
  'InvalidProtocolSchemeError',
  'InvalidSerializedStateError',
  'InvalidSerializedStateReason',
  'InvalidTransactionHandleError',
  'InvalidTransactionHandleReason',
  'KeyMaterialProvider',
  'Latest',
  'Ledger8FinalizedTxData',
  'Ledger9ContractExecutableRuntimeOptions',
  'Ledger9FinalizedTxData',
  'Ledger9UnboundTransaction',
  'Ledger9WalletProvider',
  'LedgerTransaction',
  'LedgerTransactionTypes',
  'LoggerProvider',
  'LogLevel',
  'makeLedger9ContractExecutableRuntime',
  'MAX_EXPORT_SIGNING_KEYS',
  'MAX_EXPORT_STATES',
  'MidnightConfig',
  'MidnightProvider',
  'MidnightProviderHandlers',
  'MidnightProviders',
  'NetworkId',
  'parseContractKeyLocation',
  'PositionedRecord',
  'PRIVATE_STATE_ROOT_PATH',
  'PrivateStateDecryptionError',
  'PrivateStateDecryptionReason',
  'PrivateStateExport',
  'PrivateStateExportError',
  'PrivateStateId',
  'PrivateStateImportError',
  'PrivateStateImportErrorCause',
  'PrivateStateLimitExceededError',
  'PrivateStateProvider',
  'PrivateStateSerializationError',
  'PrivateStateSerializationFailure',
  'PrivateStateStorageError',
  'ProofProvider',
  'ProofProviderHandlers',
  'ProofServerError',
  'ProverKey',
  'ProveTxConfig',
  'PROVIDER_ERROR_CATEGORIES',
  'PROVIDER_ERROR_CODES',
  'ProviderEraUnsupportedError',
  'ProviderErrorCode',
  'ProviderMethod',
  'ProvingProvidersByEra',
  'PublicDataProvider',
  'PublicStatesRead',
  'ReadMethod',
  'SegmentFail',
  'SegmentStatus',
  'SegmentSuccess',
  'SerializedState',
  'SerializedStateDecodeFailedError',
  'SerializedStateDecoderMissingError',
  'SigningKeyExport',
  'SigningKeyExportError',
  'StateDecoder',
  'StateDecoders',
  'StateKind',
  'StateReadMethod',
  'SubmittedCallTxBase',
  'SucceedEntirely',
  'TransactionEraMismatchError',
  'TransactionHandleMethod',
  'TransactionMethod',
  'TransactionProviders',
  'TransactionStage',
  'TxIdConfig',
  'TxStatus',
  'UnboundTx',
  'UnprovenTx',
  'UnshieldedBalance',
  'UnshieldedBalances',
  'UnshieldedUtxo',
  'UnshieldedUtxos',
  'UnsubmittedTxDataBase',
  'UnusableEraEntryError',
  'VerifierKey',
  'WalletProvider',
  'WalletProviderHandlers',
  'ZkArtifactFetchError',
  'ZKArtifactNotFoundError',
  'ZKConfig',
  'ZKConfigProvider',
  'ZKConfigRegistry',
  'zkConfigToProvingKeyMaterial',
  'ZKIR'
];

describe('published names', () => {
  it('reads every entry point the package publishes', () => {
    expect(names).toContain('createProofProviderFromHandlers');
  });

  it('publishes exactly this surface from every entry point', () => {
    expect([...new Set(names)].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(EXPECTED_PUBLISHED_NAMES);
  });

  it('follow the naming rules of the public API', () => {
    expect(namingViolations(names)).toEqual([]);
  });

  it('name every exported type bound to ledger 9 after its ledger', () => {
    expect(unprefixedLedger9Types(resolve(__dirname, '../..'), { aliasFiles: [] })).toEqual([]);
  });

  it('applies each rule to the names it exists for, and only to those', () => {
    const refused = ['ProviderSeam', 'Ledger8.SeamFailedError', 'EraArm', 'HTTPArm', 'unwrapV9', 'loadv8', 'FinalizedTxDataLedger8'];
    const admitted = ['ParamsArmored', 'LedgerParameters', 'unwrapLedger9', 'Ledger8DeployOnLedger9Error', 'Ledger8'];

    expect([namingViolations(refused).length, namingViolations(admitted)]).toEqual([refused.length, []]);
  });
});
