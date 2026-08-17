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

import { Ledger8RuntimeMissingError, PROTOCOL_ERROR_CODES, UnknownProtocolVersionError } from '../errors';

describe('PROTOCOL_ERROR_CODES', () => {
  it('is exactly the documented registry of codes', () => {
    expect(PROTOCOL_ERROR_CODES).toEqual({
      UNKNOWN_PROTOCOL_VERSION_READ: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
      UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
      LEDGER8_INSTANCE_MISMATCH: 'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
      LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
      DOWN_CONVERT_FAILED: 'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
      MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED'
    });
  });
});

describe('UnknownProtocolVersionError', () => {
  it('is a real Error with a descriptive name and message on the read path', () => {
    const error = new UnknownProtocolVersionError(9_000_000, 'read');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnknownProtocolVersionError');
    expect(error.protocolVersion).toBe(9_000_000);
    expect(error.path).toBe('read');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ);
    expect(error.message).toContain('9000000');
    expect(error.message).toContain('read');
  });

  it('carries the construct-path code and mentions both supported eras', () => {
    const error = new UnknownProtocolVersionError(3_000_000, 'construct');

    expect(error.path).toBe('construct');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT);
    expect(error.message).toMatch(/v8/);
    expect(error.message).toMatch(/v9/);
  });
});

describe('Ledger8RuntimeMissingError', () => {
  it('carries the LEDGER8_RUNTIME_MISSING code and preserves the cause', () => {
    const cause = new Error('ERR_MODULE_NOT_FOUND');

    const error = new Ledger8RuntimeMissingError(cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8RuntimeMissingError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('midnight-js-protocol/v8');
    expect(error.message).toContain('reinstall');
  });
});
