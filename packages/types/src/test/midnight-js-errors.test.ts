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
  ImportConflictError,
  InvalidExportFormatError,
  InvalidProtocolSchemeError,
  PrivateStateDecryptionError,
  PrivateStateExportError,
  PrivateStateImportError,
  PrivateStateLimitExceededError,
  PrivateStateSerializationError,
  PrivateStateStorageError,
  ProofServerError,
  PROVIDER_ERROR_CATEGORIES,
  PROVIDER_ERROR_CODES,
  SeamEraUnsupportedError,
  SigningKeyExportError,
  UntaggedPayloadError,
  V8PayloadUnsupportedError,
  ZkArtifactFetchError
} from '../errors';
import { ZKArtifactNotFoundError } from '../zk-config-registry';

describe('types error classes', () => {
  it('every exported error class extends MidnightJsError', () => {
    const classes = [
      ArtifactRuntimeVersionUnavailableError,
      ExportDecryptionError,
      ImportConflictError,
      InvalidExportFormatError,
      InvalidProtocolSchemeError,
      PrivateStateDecryptionError,
      PrivateStateExportError,
      PrivateStateImportError,
      PrivateStateLimitExceededError,
          PrivateStateSerializationError,
      PrivateStateStorageError,
      ProofServerError,
      SeamEraUnsupportedError,
      SigningKeyExportError,
      UntaggedPayloadError,
      V8PayloadUnsupportedError,
      ZkArtifactFetchError,
      ZKArtifactNotFoundError
    ];

    expect(classes.filter((c) => !(c.prototype instanceof MidnightJsError)).map((c) => c.name)).toEqual([]);
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
    [503, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_FETCH_FAILED', 'TRANSIENT'],
    [404, 'MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_SERVED', 'ENVIRONMENT']
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
    [400, 'MIDNIGHT_JS_PR_PROOF_SERVER_REFUSED', 'ENVIRONMENT'],
    [undefined, 'MIDNIGHT_JS_PR_PROOF_SERVER_UNAVAILABLE', 'TRANSIENT']
  ] as const)('ProofServerError for status %s is %s', (status, code, category) => {
    const error = new ProofServerError('msg', status);

    expect([error.code, error.category]).toEqual([code, category]);
  });

  it('ZKArtifactNotFoundError is an environment error', () => {
    const error = new ZKArtifactNotFoundError({ contractAddress: 'a', circuitId: 'c', verifierKeyHash: 'h' });

    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_PR_ZK_ARTIFACT_NOT_FOUND', 'ENVIRONMENT']);
  });
});
