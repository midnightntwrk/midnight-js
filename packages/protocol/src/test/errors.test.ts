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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DownConvertFailedError,
  Ledger8InstanceMismatchError,
  Ledger8RuntimeMissingError,
  MerkleNotRehashedError,
  PROTOCOL_ERROR_CODES,
  UnknownLedgerVersionError,
  UnknownProtocolVersionError
} from '../errors';

// Every scoped package name the message names, so the assertion can be
// two-directional: a missing name and a leaked extra name both fail.
const packageNamesIn = (message: string): string[] =>
  [...message.matchAll(/@[a-z0-9.-]+\/[a-z0-9.-]+/g)].map(([name]) => name).sort();

// Which package managers the remediation covers. A published error must not
// prescribe the one this repo happens to use, so this is asserted exhaustively:
// dropping one, or narrowing back to a single tool, fails.
const whyCommandsIn = (message: string): string[] =>
  ['npm why', 'yarn why', 'pnpm why', 'bun pm why'].filter((command) =>
    new RegExp(`\\b${command}\\b`).test(message)
  );

describe('PROTOCOL_ERROR_CODES', () => {
  it('is exactly the documented registry of codes', () => {
    expect(PROTOCOL_ERROR_CODES).toEqual({
      UNKNOWN_PROTOCOL_VERSION_READ: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_READ',
      UNKNOWN_PROTOCOL_VERSION_CONSTRUCT: 'MIDNIGHT_JS_P_UNKNOWN_PROTOCOL_VERSION_CONSTRUCT',
      LEDGER8_INSTANCE_MISMATCH: 'MIDNIGHT_JS_P_LEDGER8_INSTANCE_MISMATCH',
      LEDGER8_RUNTIME_MISSING: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_MISSING',
      DOWN_CONVERT_FAILED: 'MIDNIGHT_JS_P_DOWN_CONVERT_FAILED',
      MERKLE_NOT_REHASHED: 'MIDNIGHT_JS_P_MERKLE_NOT_REHASHED',
      UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION'
    });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PROTOCOL_ERROR_CODES)).toBe(true);
  });
});

// The dual-publish (.github/scripts/publish-public-npm.mjs) rewrites
// `@midnight-ntwrk/` -> `@midnightntwrk/` inside built .js/.d.ts files, not
// only in package.json. Any scoped package name written as a single literal
// here therefore ships rewritten: two names that differ only by scope collapse
// into one, and a remediation hint that names both scopes silently degrades to
// naming one of them twice. The scope fragments must stay separated from the
// `/` so the rewrite has nothing to match.
describe('resilience to the dual-publish scope rewrite', () => {
  const source = readFileSync(resolve(__dirname, '../errors.ts'), 'utf8');

  it('holds no scoped package literal that the pack-time rewrite would collapse', () => {
    expect(source).not.toContain('@midnight-ntwrk/');
  });

  it('names two distinct scopes in the remediation hint, not one twice', () => {
    const names = packageNamesIn(new Ledger8InstanceMismatchError('onchain-runtime-v3').message);

    expect(new Set(names).size).toBe(names.length);
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
    // Self-reference, so it must name no scope at all: the dual-publish renames
    // this package in `package.json` but never in a compiled string, and the
    // subpath alone identifies the import under either scope.
    expect(packageNamesIn(error.message)).toEqual([]);
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
  it('carries the LEDGER8_INSTANCE_MISMATCH code, names the axis, and remediates tool-agnostically', () => {
    const error = new Ledger8InstanceMismatchError('onchain-runtime-v3');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8InstanceMismatchError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_INSTANCE_MISMATCH);
    expect(error.axis).toBe('onchain-runtime-v3');
    expect(error.message).toContain('onchain-runtime-v3');
    expect(error.message).toContain('dual-instantiation');
    expect(packageNamesIn(error.message)).toEqual([
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnightntwrk/onchain-runtime-v3'
    ]);
    expect(whyCommandsIn(error.message)).toEqual(['npm why', 'yarn why', 'pnpm why', 'bun pm why']);
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

  // The vendor binding for root() is fallible: it rethrows a Rust Err rather
  // than always resolving to a value or undefined. That throw has to keep the
  // MERKLE_NOT_REHASHED code instead of being demoted to a generic
  // down-convert failure, so the class must be able to carry a cause.
  it('preserves a wrapped cause when the vendor accessor threw', () => {
    const cause = new Error('tree not rehashed');

    const error = new MerkleNotRehashedError(cause);

    expect(error.code).toBe(PROTOCOL_ERROR_CODES.MERKLE_NOT_REHASHED);
    expect(error.cause).toBe(cause);
  });
});

describe('UnknownLedgerVersionError', () => {
  it('carries the UNKNOWN_LEDGER_VERSION code and names the supported eras', () => {
    const error = new UnknownLedgerVersionError('v10');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnknownLedgerVersionError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION);
    expect(error.message).toContain('v8');
    expect(error.message).toContain('v9');
  });

  // The requested value reaches this class from an untyped JS caller, so it is
  // the one input the engine cannot vouch for. It is exposed as a field for
  // programmatic use and deliberately kept out of the message.
  it('exposes the requested version without rendering it in the message', () => {
    const error = new UnknownLedgerVersionError('__proto__');

    expect(error.requestedVersion).toBe('__proto__');
    expect(error.message).not.toContain('__proto__');
  });
});
