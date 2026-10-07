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

import {
  COMMON_ERROR_CATEGORIES,
  COMMON_ERROR_CODES,
  ComposeFailedError,
  ComposeOptionError,
  ConfigurationError,
  ContractExecutionError,
  ContractStateInvalidError,
  DownConvertFailedError,
  EnvironmentUnsupportedError,
  InvalidArgumentError,
  InvariantViolationError,
  Ledger8InstanceMismatchError,
  Ledger8RuntimeInvalidError,
  Ledger8RuntimeMissingError,
  MerkleNotRehashedError,
  MIDNIGHT_JS_ERROR_CATEGORIES,
  MidnightJsError,
  PayloadNotATransactionError,
  PROTOCOL_ERROR_CATEGORIES,
  PROTOCOL_ERROR_CODES,
  StateDecodeFailedError,
  UnknownLedger8AxisError,
  UnknownLedgerVersionError,
  UnknownProtocolVersionError
} from '../errors';

describe('general errors', () => {
  it.each([
    [InvalidArgumentError, 'InvalidArgumentError', 'MIDNIGHT_JS_G_INVALID_ARGUMENT', 'USAGE'],
    [ConfigurationError, 'ConfigurationError', 'MIDNIGHT_JS_G_CONFIGURATION_MISSING', 'USAGE'],
    [EnvironmentUnsupportedError, 'EnvironmentUnsupportedError', 'MIDNIGHT_JS_G_ENVIRONMENT_UNSUPPORTED', 'ENVIRONMENT'],
    [InvariantViolationError, 'InvariantViolationError', 'MIDNIGHT_JS_G_INVARIANT_VIOLATED', 'INTERNAL']
  ] as const)('%s carries name, code, category, message and cause', (ErrorClass, name, code, category) => {
    // Arrange
    const cause = new Error('underlying');

    // Act
    const error = new ErrorClass('exact message', { cause });

    // Assert
    expect(error).toBeInstanceOf(MidnightJsError);
    expect(error).toBeInstanceOf(Error);
    expect({ name: error.name, code: error.code, category: error.category, message: error.message, cause: error.cause })
      .toEqual({ name, code, category, message: 'exact message', cause });
  });
});

describe('category tables', () => {
  it('cover every code of their group exactly', () => {
    expect(Object.keys(COMMON_ERROR_CATEGORIES).sort()).toEqual(Object.values(COMMON_ERROR_CODES).sort());
    expect(Object.keys(PROTOCOL_ERROR_CATEGORIES).sort()).toEqual(Object.values(PROTOCOL_ERROR_CODES).sort());
  });

  it('use only known categories', () => {
    const known = new Set<string>(Object.values(MIDNIGHT_JS_ERROR_CATEGORIES));
    const used = [...Object.values(COMMON_ERROR_CATEGORIES), ...Object.values(PROTOCOL_ERROR_CATEGORIES)];
    expect(used.filter((c) => !known.has(c))).toEqual([]);
  });

  it('are frozen', () => {
    expect([Object.isFrozen(COMMON_ERROR_CATEGORIES), Object.isFrozen(PROTOCOL_ERROR_CATEGORIES)]).toEqual([true, true]);
  });
});

describe('protocol error classes', () => {
  it('every exported error class extends MidnightJsError', () => {
    // Arrange
    const classes = [
      ComposeFailedError, ComposeOptionError, ContractExecutionError, ContractStateInvalidError,
      DownConvertFailedError, Ledger8InstanceMismatchError, Ledger8RuntimeInvalidError, Ledger8RuntimeMissingError,
      MerkleNotRehashedError, PayloadNotATransactionError, StateDecodeFailedError, UnknownLedger8AxisError,
      UnknownLedgerVersionError, UnknownProtocolVersionError
    ];

    // Act
    const outsiders = classes.filter((c) => !(c.prototype instanceof MidnightJsError)).map((c) => c.name);

    // Assert
    expect(outsiders).toEqual([]);
  });

  it('reads the category of a dynamically coded error from the table', () => {
    // Act
    const error = new UnknownProtocolVersionError(99, 'read', 'unknown');

    // Assert
    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ', 'ENVIRONMENT']);
  });

  it('reads the construct-path category of a dynamically coded error from the table', () => {
    // Act
    const error = new UnknownProtocolVersionError(99, 'construct', 'unknown');

    // Assert
    expect([error.code, error.category]).toEqual(['MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT', 'ENVIRONMENT']);
  });

  it.each([
    [new ContractExecutionError('circuit failed', { cause: new Error('assert') }), 'MIDNIGHT_JS_P_CONTRACT_EXECUTION_FAILED', 'REJECTED'],
    [new ContractStateInvalidError('no operation'), 'MIDNIGHT_JS_P_CONTRACT_STATE_INVALID', 'INTEGRITY']
  ] as const)('new protocol class %# carries code and category', (error, code, category) => {
    expect([error.code, error.category, error.message.length > 0]).toEqual([code, category, true]);
  });

  it('keeps the cause of a ContractExecutionError', () => {
    // Arrange
    const cause = new Error('assert failed');

    // Act
    const error = new ContractExecutionError('circuit failed', { cause });

    // Assert
    expect(error.cause).toBe(cause);
  });
});
