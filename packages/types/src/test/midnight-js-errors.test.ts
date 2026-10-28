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

import { MidnightJsError } from '@midnight-ntwrk/midnight-js-protocol/errors';
import { describe, expect, it } from 'vitest';

import {
  ArtifactRuntimeVersionUnavailableError,
  ExportDecryptionError,
  ForeignLedgerTransactionError,
  ImportConflictError,
  InvalidExportFormatError,
  InvalidLedgerStateError,
  InvalidProtocolSchemeError,
  InvalidTransactionHandleError,
  LedgerStateDecoderMissingError,
  PrivateStateDecryptionError,
  PrivateStateExportError,
  PrivateStateImportError,
  PrivateStateLimitExceededError,
  PrivateStateSerializationError,
  PrivateStateStorageError,
  ProofServerError,
  PROVIDER_ERROR_CATEGORIES,
  PROVIDER_ERROR_CODES,
  ProviderEraUnsupportedError,
  SigningKeyExportError,
  TransactionEraMismatchError,
  UnusableEraEntryError,
  ZkArtifactFetchError
} from '../errors';
import * as errors from '../errors';
import { ZKArtifactNotFoundError } from '../zk-config-registry';

describe('types error classes', () => {
  const exported: unknown[] = [...Object.values(errors), ZKArtifactNotFoundError];
  const exportedClasses = exported.filter(
    (value): value is abstract new (...args: never[]) => Error => typeof value === 'function' && value.prototype instanceof Error
  );
  const keyLocation = { contractAddress: 'aa'.repeat(32), circuitId: 'increment', verifierKeyHash: 'bb'.repeat(32) };
  const instances: readonly [string, MidnightJsError][] = [
    ['ProviderEraUnsupportedError', new ProviderEraUnsupportedError('proveTx', 'v8', ['v9'])],
    ['UnusableEraEntryError', new UnusableEraEntryError('proveTx', 'v8', 'handler', 'null')],
    ['InvalidProtocolSchemeError', new InvalidProtocolSchemeError('ftp', ['http', 'https'])],
    ['ArtifactRuntimeVersionUnavailableError', new ArtifactRuntimeVersionUnavailableError('provider')],
    ['PrivateStateExportError', new PrivateStateExportError('msg')],
    ['PrivateStateSerializationError', new PrivateStateSerializationError('$', 'function')],
    ['SigningKeyExportError', new SigningKeyExportError('msg')],
    ['PrivateStateImportError', new PrivateStateImportError('msg')],
    ['ExportDecryptionError', new ExportDecryptionError()],
    ['InvalidExportFormatError', new InvalidExportFormatError()],
    ['ImportConflictError', new ImportConflictError(2)],
    ['ZkArtifactFetchError', new ZkArtifactFetchError('msg', 503)],
    ['ProofServerError', new ProofServerError('msg', 503)],
    ['PrivateStateDecryptionError', new PrivateStateDecryptionError('msg', 'malformed')],
    ['PrivateStateStorageError', new PrivateStateStorageError('msg')],
    ['PrivateStateLimitExceededError', new PrivateStateLimitExceededError('msg')],
    ['ZKArtifactNotFoundError', new ZKArtifactNotFoundError(keyLocation)],
    ['ForeignLedgerTransactionError', new ForeignLedgerTransactionError('v8', 'ledger8-not-loaded')],
    ['InvalidTransactionHandleError', new InvalidTransactionHandleError('LedgerTransaction.unwrap', 'not-a-handle', 'null')],
    ['TransactionEraMismatchError', new TransactionEraMismatchError('v8', 'v9')],
    ['InvalidLedgerStateError', new InvalidLedgerStateError('ContractState', 'v9', 'tag-mismatch')],
    ['LedgerStateDecoderMissingError', new LedgerStateDecoderMissingError('ContractState', 'v8')]
  ];

  it('every exported error class extends MidnightJsError', () => {
    expect(exportedClasses.length).toBeGreaterThan(15);
    expect(exportedClasses.filter((c) => !(c.prototype instanceof MidnightJsError)).map((c) => c.name)).toEqual([]);
  });

  it('builds an instance of every exported error class below', () => {
    expect(exportedClasses.map((c) => c.name).sort()).toEqual(instances.map(([name]) => name).sort());
  });

  it.each(instances)('%s carries a registered code and the category the table gives that code', (_name, error) => {
    const category = Object.entries(PROVIDER_ERROR_CATEGORIES).find(([code]) => code === error.code)?.[1];

    expect(error.category).toBe(category);
  });

  it.each([
    [
      'a v8 handler',
      new UnusableEraEntryError('balanceTx', 'v8', 'handler', 'null'),
      'Cannot use the v8 entry passed for balanceTx: expected a function, got null. ' +
        'Pass a function as v8, or set v8 to undefined if this provider does not serve that era.'
    ],
    [
      'a v8 proving provider',
      new UnusableEraEntryError('proveTx', 'v8', 'proving-provider', 'a function'),
      "Cannot use the v8 entry passed for proveTx: expected a ProvingProvider with callable 'check' and 'prove', got a function. " +
        "Pass a ProvingProvider with callable 'check' and 'prove' as v8, or set v8 to undefined if this provider does not serve that era."
    ],
    [
      'a v9 handler',
      new UnusableEraEntryError('submitTx', 'v9', 'handler', 'a string'),
      'Cannot use the v9 entry passed for submitTx: expected a function, got a string. ' +
        'Pass a function as v9, or set v9 to undefined if this provider does not serve that era.'
    ]
  ] as const)('UnusableEraEntryError names its class and the remedy for %s', (_case, error, message) => {
    expect([error.name, error.message]).toEqual(['UnusableEraEntryError', message]);
  });

  it.each(instances)('%s message speaks of provider methods only', (_name, error) => {
    expect(error.message).not.toMatch(/seam/i);
  });

  it.each([
    [
      'a proof provider that does not serve the era',
      new ProviderEraUnsupportedError('proveTx', 'v8', ['v9']),
      'This operation runs on the v8 ledger era, but the provider wired to proveTx declares that it serves v9. ' +
        'Refused before any proof was requested, because a transaction this set cannot carry end to end is not ' +
        'worth proving. Wire a provider that serves v8 for proveTx, or run this operation on an era the whole set serves.'
    ],
    [
      'a wallet provider that does not serve the era',
      new ProviderEraUnsupportedError('balanceTx', 'v8', ['v9']),
      'This operation runs on the v8 ledger era, but the provider wired to balanceTx declares that it serves v9. ' +
        'Refused before balanceTx did any work. ' +
        'Wire a provider that serves v8 for balanceTx, or run this operation on an era the whole set serves.'
    ],
    [
      'a midnight provider that does not serve the era',
      new ProviderEraUnsupportedError('submitTx', 'v8', []),
      'This operation runs on the v8 ledger era, but the provider wired to submitTx declares that it serves no era at all. ' +
        'Refused before submitTx did any work. ' +
        'Wire a provider that serves v8 for submitTx, or run this operation on an era the whole set serves.'
    ]
  ] as const)('pins the message for %s', (_case, error, message) => {
    expect(error.message).toEqual(message);
  });

  it.each([
    ['ProviderEraUnsupportedError', new ProviderEraUnsupportedError('submitTx', 'v8', ['v9']), 'submitTx'],
    ['UnusableEraEntryError', new UnusableEraEntryError('proveTx', 'v8', 'handler', 'null'), 'proveTx']
  ] as const)('%s reports the provider method it was raised for as `method`', (_name, error, method) => {
    expect([error.method, 'seam' in error]).toEqual([method, false]);
  });

  it('ProviderEraUnsupportedError carries the provider code', () => {
    const error = new ProviderEraUnsupportedError('proveTx', 'v8', ['v9']);

    expect([error.name, error.code, error.category]).toEqual([
      'ProviderEraUnsupportedError',
      'MIDNIGHT_JS_PR_PROVIDER_ERA_UNSUPPORTED',
      'USAGE'
    ]);
  });

  it('category table covers every provider code exactly', () => {
    expect(Object.keys(PROVIDER_ERROR_CATEGORIES).sort()).toEqual(Object.values(PROVIDER_ERROR_CODES).sort());
  });

  it('import subclasses keep their family and get their own code', () => {
    const error = new ExportDecryptionError();

    expect(error).toBeInstanceOf(PrivateStateImportError);
    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_PR_EXPORT_DECRYPTION_FAILED', 'INTEGRITY']);
  });

  it('import conflict and invalid format carry their own codes', () => {
    const conflict = new ImportConflictError(2);
    const format = new InvalidExportFormatError();

    expect([conflict.code, conflict.category]).toEqual(['MIDNIGHT_JS_PR_IMPORT_CONFLICT', 'USAGE']);
    expect([format.code, format.category]).toEqual(['MIDNIGHT_JS_PR_INVALID_EXPORT_FORMAT', 'INTEGRITY']);
  });

  it.each([
    ['PrivateStateDecryptionError', new PrivateStateDecryptionError('msg', 'malformed'), 'MIDNIGHT_JS_PR_PRIVATE_STATE_DECRYPTION_FAILED', 'INTEGRITY'],
    ['PrivateStateStorageError', new PrivateStateStorageError('msg'), 'MIDNIGHT_JS_PR_PRIVATE_STATE_STORAGE_FAILED', 'ENVIRONMENT'],
    ['PrivateStateLimitExceededError', new PrivateStateLimitExceededError('msg'), 'MIDNIGHT_JS_PR_PRIVATE_STATE_LIMIT_EXCEEDED', 'USAGE'],
    ['PrivateStateExportError', new PrivateStateExportError('msg'), 'MIDNIGHT_JS_PR_PRIVATE_STATE_EXPORT_FAILED', 'USAGE'],
    ['SigningKeyExportError', new SigningKeyExportError('msg'), 'MIDNIGHT_JS_PR_SIGNING_KEY_EXPORT_FAILED', 'USAGE'],
    ['InvalidProtocolSchemeError', new InvalidProtocolSchemeError('ftp', ['http', 'https']), 'MIDNIGHT_JS_PR_INVALID_PROTOCOL_SCHEME', 'USAGE'],
    ['UnusableEraEntryError', new UnusableEraEntryError('proveTx', 'v8', 'handler', 'null'), 'MIDNIGHT_JS_PR_UNUSABLE_ERA_ENTRY', 'USAGE'],
    [
      'ArtifactRuntimeVersionUnavailableError',
      new ArtifactRuntimeVersionUnavailableError('provider'),
      'MIDNIGHT_JS_PR_ARTIFACT_RUNTIME_VERSION_UNAVAILABLE',
      'ENVIRONMENT'
    ]
  ] as const)('%s carries its code and category', (_name, error, code, category) => {
    expect([error.code, error.category]).toEqual([code, category]);
  });

  it.each([
    [503, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED', 'TRANSIENT'],
    [408, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED', 'TRANSIENT'],
    [429, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED', 'TRANSIENT'],
    [404, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT'],
    [500, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED', 'TRANSIENT'],
    [499, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT'],
    [409, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT'],
    [430, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT']
  ] as const)('ZkArtifactFetchError for HTTP %i is %s', (status, code, category) => {
    const error = new ZkArtifactFetchError('msg', status);

    expect([error.code, error.category, error.status, error.message]).toEqual([code, category, status, 'msg']);
  });

  it('ZkArtifactFetchError for a 2xx HTML fallback is not served', () => {
    const error = new ZkArtifactFetchError('msg', 200, { notServed: true });

    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT']);
  });

  it('ZkArtifactFetchError without a status (network failure) is transient and keeps its cause', () => {
    const cause = new TypeError('fetch failed');

    const error = new ZkArtifactFetchError('msg', undefined, { cause });

    expect([error.code, error.category, error.cause]).toEqual([
      'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED',
      'TRANSIENT',
      cause
    ]);
  });

  it.each([
    [502, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT'],
    [408, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT'],
    [429, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT'],
    [400, 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED', 'ENVIRONMENT'],
    [500, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT'],
    [499, 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED', 'ENVIRONMENT'],
    [409, 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED', 'ENVIRONMENT'],
    [undefined, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT']
  ] as const)('ProofServerError for status %s is %s', (status, code, category) => {
    const error = new ProofServerError('msg', status);

    expect([error.code, error.category]).toEqual([code, category]);
  });

  it('PrivateStateStorageError keeps the failure on cause and a failed cleanup beside it', () => {
    // Arrange
    const operationFailure = new Error('write failed');
    const closeFailure = new Error('close failed');

    // Act
    const error = new PrivateStateStorageError('msg', { cause: operationFailure, closeError: closeFailure });

    // Assert
    expect(error.cause).toBe(operationFailure);
    expect(error.closeError).toBe(closeFailure);
  });

  it('ZKArtifactNotFoundError is an environment error', () => {
    const error = new ZKArtifactNotFoundError({ contractAddress: 'a', circuitId: 'c', verifierKeyHash: 'h' });

    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND', 'ENVIRONMENT']);
  });
});
