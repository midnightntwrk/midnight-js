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
  DownConvertFailedError,
  Ledger8InstanceMismatchError,
  Ledger8RuntimeMissingError,
  MerkleNotRehashedError,
  PROTOCOL_ERROR_CODES,
  UnknownProtocolVersionError
} from '../errors';

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

  it('is frozen', () => {
    expect(Object.isFrozen(PROTOCOL_ERROR_CODES)).toBe(true);
  });
});

describe('UnknownProtocolVersionError', () => {
  it('is a real Error with a descriptive name and message on the read path', () => {
    const error = new UnknownProtocolVersionError(9_000_000, 'read', 'unknown');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnknownProtocolVersionError');
    expect(error.protocolVersion).toBe(9_000_000);
    expect(error.path).toBe('read');
    expect(error.reason).toBe('unknown');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ);
    expect(error.message).toContain('9000000');
    expect(error.message).toContain('read');
  });

  it('carries the construct-path code and mentions both supported eras for an unknown version', () => {
    const error = new UnknownProtocolVersionError(3_000_000, 'construct', 'unknown');

    expect(error.path).toBe('construct');
    expect(error.reason).toBe('unknown');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT);
    expect(error.message).toMatch(/v8/);
    expect(error.message).toMatch(/v9/);
  });

  it('describes a malformed input without the misleading upgrade text', () => {
    const error = new UnknownProtocolVersionError(Number.NaN, 'construct', 'malformed');

    expect(error.reason).toBe('malformed');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT);
    expect(error.message).toMatch(/malformed/i);
    expect(error.message).not.toMatch(/upgrade midnight-js/);
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

describe('instanceof', () => {
  it('recognises its own instances on both code paths', () => {
    expect(new UnknownProtocolVersionError(9_000_000, 'read', 'unknown')).toBeInstanceOf(UnknownProtocolVersionError);
    expect(new UnknownProtocolVersionError(9_000_000, 'construct', 'unknown')).toBeInstanceOf(
      UnknownProtocolVersionError
    );
  });

  // `instanceof` is plain prototype identity, so carrying the code is not
  // enough. A caller narrowed by `instanceof` therefore really does have
  // `reason`, `path` and `protocolVersion`. That this still holds across the
  // built bundles -- where a per-entry build would emit a second copy of this
  // module, and a second class -- is covered by dist-error-identity.test.ts.
  it('rejects an error that only carries a matching code', () => {
    const codeOnly = Object.assign(new Error('shaped like one of ours'), {
      code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ
    });

    expect(codeOnly).not.toBeInstanceOf(UnknownProtocolVersionError);
  });

  it('rejects an error carrying no code at all', () => {
    expect(new Error('no code')).not.toBeInstanceOf(UnknownProtocolVersionError);
  });

  it('rejects a non-Error value carrying a matching code', () => {
    const notAnError = { code: PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ, message: 'shaped like an error' };

    expect(notAnError).not.toBeInstanceOf(UnknownProtocolVersionError);
  });

  // Same prototype-identity contract for the v8 loader's rejection: a caller
  // narrowing on it really does have the wrapped `cause`.
  it('recognises Ledger8RuntimeMissingError by prototype, not by its code', () => {
    const real = new Ledger8RuntimeMissingError(new Error('ERR_MODULE_NOT_FOUND'));
    const codeOnly = Object.assign(new Error('shaped like one of ours'), {
      code: PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING
    });

    expect(real).toBeInstanceOf(Ledger8RuntimeMissingError);
    expect(codeOnly).not.toBeInstanceOf(Ledger8RuntimeMissingError);
  });
});

describe('Ledger8InstanceMismatchError', () => {
  it('carries the LEDGER8_INSTANCE_MISMATCH code, names the axis, and remediates with yarn why', () => {
    const error = new Ledger8InstanceMismatchError('onchain-runtime-v3');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8InstanceMismatchError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
    expect(error.axis).toBe('onchain-runtime-v3');
    expect(error.message).toContain('onchain-runtime-v3');
    expect(error.message).toContain('dual-instantiation');
    expect(error.message).toContain('yarn why');
  });
});

describe('DownConvertFailedError', () => {
  it('carries the DOWN_CONVERT_FAILED code, preserves the cause, and names the failing stage', () => {
    const cause = new Error('tag v8 != v6');

    const error = new DownConvertFailedError('v9 envelope extraction', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DownConvertFailedError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('v9 envelope extraction');
  });

  it('never includes a hex or byte dump in its own message', () => {
    const cause = new Error('out of range for u64');

    const error = new DownConvertFailedError('state down-convert', cause);

    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

describe('MerkleNotRehashedError', () => {
  it('carries the MERKLE_NOT_REHASHED code and a descriptive, bounded message', () => {
    const error = new MerkleNotRehashedError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MerkleNotRehashedError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED);
    expect(error.message).toMatch(/rehash/i);
    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});
