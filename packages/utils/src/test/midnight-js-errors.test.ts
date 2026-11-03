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

import { UnhandledUnionMemberError } from '../assertion-utils';
import { type DeserializationContext, DeserializationError } from '../deserialization';
import { UTILS_ERROR_CATEGORIES, UTILS_ERROR_CODES } from '../error-codes';
import { PasswordValidationError } from '../password-validation';
import { TagParseError } from '../serialized-tag';
import { ZkArtifactContractInfoError } from '../zk-artifact-contract-info';
import { ZkArtifactIntegrityError } from '../zk-artifact-manifest';

const deserializationContext: DeserializationContext = {
  dataType: 'ContractState',
  source: 'ledger',
  caller: '@midnight-ntwrk/midnight-js-utils:test',
  classification: 'version-mismatch',
  mitigation: ['Hint']
};

describe('utils error classes', () => {
  it.each([
    [
      'ZkArtifactIntegrityError',
      new ZkArtifactIntegrityError('x'),
      UTILS_ERROR_CODES.ZK_ARTIFACT_INTEGRITY_FAILED,
      'INTEGRITY'
    ],
    [
      'ZkArtifactContractInfoError',
      new ZkArtifactContractInfoError('x'),
      UTILS_ERROR_CODES.ZK_ARTIFACT_CONTRACT_INFO_INVALID,
      'INTEGRITY'
    ],
    [
      'PasswordValidationError',
      new PasswordValidationError('x', 'missing'),
      UTILS_ERROR_CODES.PASSWORD_INVALID,
      'USAGE'
    ],
    [
      'DeserializationError',
      new DeserializationError(deserializationContext),
      UTILS_ERROR_CODES.DESERIALIZATION_FAILED,
      'INTEGRITY'
    ],
    ['TagParseError', new TagParseError('x'), UTILS_ERROR_CODES.TAG_PARSE_FAILED, 'INTEGRITY'],
    [
      'UnhandledUnionMemberError',
      new UnhandledUnionMemberError('ctx'),
      UTILS_ERROR_CODES.UNHANDLED_UNION_MEMBER,
      'INTERNAL'
    ]
  ])('%s extends MidnightJsError with its exact code and category', (_name, error, code, category) => {
    expect(error).toBeInstanceOf(MidnightJsError);
    expect(error.code).toBe(code);
    expect(error.category).toBe(category);
  });

  it('category table covers every utils code exactly', () => {
    expect(Object.keys(UTILS_ERROR_CATEGORIES).sort()).toEqual(Object.values(UTILS_ERROR_CODES).sort());
  });

  it('prefixes every new code with MIDNIGHT_JS_U_', () => {
    expect(Object.values(UTILS_ERROR_CODES).filter((code) => !code.startsWith('MIDNIGHT_JS_U_'))).toEqual([]);
  });
});
