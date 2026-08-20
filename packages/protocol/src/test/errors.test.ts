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
  type ProtocolErrorCode,
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
// A second physical copy of this module (a consumer's bundler splitting the
// package, or two versions of it in one dependency tree) declares its own
// classes, so a prototype-based `instanceof` against the other copy's class
// silently answers `false`. These assertions pin the code-based recognition
// that makes the check survive that — see the `Symbol.hasInstance` note in
// errors.ts. A foreign copy's instance is indistinguishable, at runtime, from
// an `Error` carrying the same `code`, which is what these build.
interface CodeRecognitionCase {
  readonly label: string;
  readonly errorClass: new (...args: never[]) => Error;
  readonly ownCodes: readonly ProtocolErrorCode[];
  readonly instances: readonly Error[];
}

// One row per error class — a class added by a later PR in this series adds a
// row here rather than its own describe block.
const CODE_RECOGNITION_CASES: readonly CodeRecognitionCase[] = [
  {
    label: 'UnknownProtocolVersionError',
    errorClass: UnknownProtocolVersionError,
    ownCodes: [
      PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_READ,
      PROTOCOL_ERROR_CODES.UNKNOWN_PROTOCOL_VERSION_CONSTRUCT
    ],
    instances: [
      new UnknownProtocolVersionError(9_000_000, 'read', 'unknown'),
      new UnknownProtocolVersionError(9_000_000, 'construct', 'unknown')
    ]
  },
  {
    label: 'Ledger8RuntimeMissingError',
    errorClass: Ledger8RuntimeMissingError,
    ownCodes: [PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING],
    instances: [new Ledger8RuntimeMissingError(new Error('ERR_MODULE_NOT_FOUND'))]
  },
  {
    label: 'Ledger8InstanceMismatchError',
    errorClass: Ledger8InstanceMismatchError,
    ownCodes: [PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH],
    instances: [new Ledger8InstanceMismatchError('onchain-runtime-v3')]
  },
  {
    label: 'DownConvertFailedError',
    errorClass: DownConvertFailedError,
    ownCodes: [PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED],
    instances: [new DownConvertFailedError('state down-convert', new Error('malformed bytes'))]
  },
  {
    label: 'MerkleNotRehashedError',
    errorClass: MerkleNotRehashedError,
    ownCodes: [PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED],
    instances: [new MerkleNotRehashedError()]
  }
];

/** Every registry code that is NOT one of `ownCodes` — the negative side of recognition. */
const otherProtocolCodes = (ownCodes: readonly ProtocolErrorCode[]): ProtocolErrorCode[] =>
  Object.values(PROTOCOL_ERROR_CODES).filter((code) => !ownCodes.includes(code));

describe.each(CODE_RECOGNITION_CASES)(
  '$label code-based instanceof recognition',
  ({ errorClass, ownCodes, instances }) => {
    it('recognises its own instances', () => {
      for (const instance of instances) {
        expect(instance).toBeInstanceOf(errorClass);
      }
    });

    it('recognises an error from a foreign copy of this module carrying one of its codes', () => {
      for (const code of ownCodes) {
        expect(Object.assign(new Error('thrown by another copy of this module'), { code })).toBeInstanceOf(errorClass);
      }
    });

    it('rejects an error carrying no code at all', () => {
      expect(new Error('no code')).not.toBeInstanceOf(errorClass);
    });

    it('rejects an error carrying any other code in the registry', () => {
      for (const code of otherProtocolCodes(ownCodes)) {
        expect(Object.assign(new Error('another protocol failure'), { code })).not.toBeInstanceOf(errorClass);
      }
    });

    it('rejects a non-Error value even when it carries a matching code', () => {
      expect({ code: ownCodes[0], message: 'shaped like an error' }).not.toBeInstanceOf(errorClass);
    });
  }
);
