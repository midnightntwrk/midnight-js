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
  ComposeFailedError,
  type ComposeOption,
  ComposeOptionError,
  type ComposeStage,
  DownConvertFailedError,
  Ledger8InstanceMismatchError,
  Ledger8RuntimeInvalidError,
  Ledger8RuntimeMissingError,
  Ledger8ZswapUnsupportedError,
  MerkleNotRehashedError,
  PROTOCOL_ERROR_CODES,
  StateDecodeFailedError,
  UnknownLedger8AxisError,
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
      COMPOSE_FAILED: 'MIDNIGHT_JS_P_COMPOSE_FAILED',
      COMPOSE_OPTION_INVALID: 'MIDNIGHT_JS_P_COMPOSE_OPTION_INVALID',
      STATE_DECODE_FAILED: 'MIDNIGHT_JS_P_STATE_DECODE_FAILED',
      LEDGER8_ZSWAP_UNSUPPORTED: 'MIDNIGHT_JS_P_LEDGER8_ZSWAP_UNSUPPORTED',
      UNKNOWN_LEDGER_VERSION: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER_VERSION',
      LEDGER8_RUNTIME_INVALID: 'MIDNIGHT_JS_P_LEDGER8_RUNTIME_INVALID',
      UNKNOWN_LEDGER8_AXIS: 'MIDNIGHT_JS_P_UNKNOWN_LEDGER8_AXIS'
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

    const error = new Ledger8RuntimeMissingError('/v8', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8RuntimeMissingError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_MISSING);
    expect(error.subpath).toBe('/v8');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('midnight-js-protocol/v8');
    expect(error.message).toContain('reinstall');
    // Self-reference, so it must name no scope at all: the dual-publish renames
    // this package in `package.json` but never in a compiled string, and the
    // subpath alone identifies the import under either scope.
    expect(packageNamesIn(error.message)).toEqual([]);
  });

  // The two chunks pull different retained-era dependencies, so a message that
  // names the wrong one sends an operator to an entry point that loaded fine.
  it('names the engine subpath, not the v8 one, when the engine chunk is what failed', () => {
    const error = new Ledger8RuntimeMissingError('/engine', new Error("Cannot find package 'compact-runtime-ledger8'"));

    expect(error.subpath).toBe('/engine');
    expect(error.message).toContain('midnight-js-protocol/engine');
    expect(error.message).not.toContain('midnight-js-protocol/v8');
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
    const real = new Ledger8RuntimeMissingError('/v8', new Error('ERR_MODULE_NOT_FOUND'));
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

describe('ComposeFailedError', () => {
  it('carries the COMPOSE_FAILED code, the wrap-call stage, and names the circuit id', () => {
    const error = new ComposeFailedError('v9', 'wrap-call', 'increment');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ComposeFailedError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(error.version).toBe('v9');
    expect(error.stage).toBe('wrap-call');
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/no registered operation/i);
  });

  it('never includes a hex or byte dump in its own message', () => {
    const error = new ComposeFailedError('v9', 'wrap-call', 'increment');

    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });

  // The era is a constructor argument, not a fact baked into the text. Both
  // eras must therefore reach the same message with only the era name
  // swapped: an entry that still hardcoded one era would produce two
  // messages differing in more than that one token, or in nothing at all.
  it('names the requested era and otherwise says the same thing for both', () => {
    const v8 = new ComposeFailedError('v8', 'call-operation', 'increment');
    const v9 = new ComposeFailedError('v9', 'call-operation', 'increment');

    expect(v8.version).toBe('v8');
    expect(v9.version).toBe('v9');
    expect(v8.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(v9.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_FAILED);
    expect(v8.name).toBe('ComposeFailedError');
    expect(v9.name).toBe('ComposeFailedError');
    expect(v8.message).not.toBe(v9.message);
    expect(v8.message.replaceAll('v8', 'ERA')).toBe(v9.message.replaceAll('v9', 'ERA'));
  });

  it('carries the deploy-verifier-key stage and names the circuit whose key is missing', () => {
    const error = new ComposeFailedError('v8', 'deploy-verifier-key', 'increment');

    expect(error.stage).toBe('deploy-verifier-key');
    expect(error.circuitId).toBe('increment');
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/verifier key/i);
    // The facade method a caller actually invokes, not the internal leg it
    // dispatches to: only one of the two is reachable from a consumer.
    expect(error.message).toContain('composeDeployTx');
    expect(error.message).not.toContain('composeV8DeployTx');
  });

  it('carries the deploy-unknown-circuit stage and explains that the address would change', () => {
    const error = new ComposeFailedError('v8', 'deploy-unknown-circuit', 'stale');

    expect(error.stage).toBe('deploy-unknown-circuit');
    expect(error.circuitId).toBe('stale');
    expect(error.message).toContain('stale');
    expect(error.message).toMatch(/does not declare/i);
    expect(error.message).toMatch(/address/i);
  });

  it('carries the deploy-ambiguous-circuit stage and explains why the name cannot address the slots', () => {
    const error = new ComposeFailedError('v8', 'deploy-ambiguous-circuit', 'increment');

    expect(error.stage).toBe('deploy-ambiguous-circuit');
    expect(error.circuitId).toBe('increment');
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/two entry points/i);
    // The remediation has to say this is not a compactc-built shape, or the
    // reader's first move is to re-run the compiler, which cannot help.
    expect(error.message).toMatch(/assembled by hand|not valid UTF-8/i);
  });

  it('carries the deploy-verifier-key-blob stage and preserves the ledger failure on cause', () => {
    const cause = new Error('expected header tag');
    const error = new ComposeFailedError('v8', 'deploy-verifier-key-blob', 'increment', cause);

    expect(error.stage).toBe('deploy-verifier-key-blob');
    expect(error.circuitId).toBe('increment');
    expect(error.cause).toBe(cause);
    expect(error.message).toMatch(/rejected the verifier-key bytes/i);
  });

  it('carries the call-verifier-key stage and points at a constructor-built state', () => {
    const error = new ComposeFailedError('v9', 'call-verifier-key', 'increment');

    expect(error.stage).toBe('call-verifier-key');
    expect(error.circuitId).toBe('increment');
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/no verifier key/i);
    expect(error.message).toMatch(/constructor/i);
  });

  it('carries no cause for the assertion stages, which wrap nothing', () => {
    expect(new ComposeFailedError('v9', 'wrap-call', 'increment').cause).toBeUndefined();
    expect(new ComposeFailedError('v8', 'deploy-verifier-key', 'increment').cause).toBeUndefined();
  });

  it('carries the call-operation stage and describes the era-native call context', () => {
    const error = new ComposeFailedError('v8', 'call-operation', 'increment');

    expect(error.stage).toBe('call-operation');
    expect(error.circuitId).toBe('increment');
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/no registered operation/i);
    expect(error.message).toMatch(/v8-native contract state/i);
  });

  // The one stage with no circuit to name: an empty call list is a defect in
  // the request itself, so it is refused before any circuit is looked up.
  it('carries the call-empty stage and explains that a call transaction needs at least one call', () => {
    const error = new ComposeFailedError('v9', 'call-empty', '(none)');

    expect(error.stage).toBe('call-empty');
    expect(error.message).toMatch(/at least one call/i);
    expect(error.cause).toBeUndefined();
  });

  it('carries the call-contract-state stage and preserves the decoder failure on cause', () => {
    const cause = new Error('expected header tag');
    const error = new ComposeFailedError('v9', 'call-contract-state', 'increment', cause);

    expect(error.stage).toBe('call-contract-state');
    expect(error.circuitId).toBe('increment');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('increment');
    expect(error.message).toMatch(/pre-call state/i);
  });

// One list, keyed by the union itself: a stage added to `ComposeStage` without
// a line here fails to compile, so these suites cannot quietly go on testing a
// narrower set than the type declares. Two hand-written arrays could, and did.
const STAGE_KEYS: Readonly<Record<ComposeStage, true>> = {
  'wrap-call': true,
  'call-empty': true,
  'call-transcript-empty': true,
  'call-partition': true,
  'call-prototype': true,
  'call-dust-payout': true,
  'call-unsupported-payout': true,
  'call-operation': true,
  'call-contract-state': true,
  'call-verifier-key': true,
  'deploy-verifier-key': true,
  'deploy-unknown-circuit': true,
  'deploy-ambiguous-circuit': true,
  'deploy-verifier-key-blob': true
};
const ALL_STAGES = Object.keys(STAGE_KEYS) as ComposeStage[];

  // The message table is a total Record so that a new stage cannot silently
  // ship another stage's text. This is what that buys: every stage produces
  // its own message.
  it('gives every compose stage a distinct message', () => {
    const messages = ALL_STAGES.map((stage) => new ComposeFailedError('v9', stage, 'increment').message);

    expect(new Set(messages).size).toBe(ALL_STAGES.length);
  });

  // Every stage that resolves a circuit names it. `'call-empty'` is excluded
  // deliberately: it is raised before any circuit is known, so a circuit id in
  // its text would be an invention.
  it('names the circuit on every stage that has one', () => {
    const circuitStages = ALL_STAGES.filter((stage) => stage !== 'call-empty');

    const messages = circuitStages.map((stage) => new ComposeFailedError('v9', stage, 'increment').message);

    expect(messages.every((message) => message.includes('increment'))).toBe(true);
  });

  it('never includes a hex or byte dump in a call-operation message', () => {
    const error = new ComposeFailedError('v8', 'call-operation', 'increment');

    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

// The same discipline for the option union, and for the same reason: the hex
// check below used to iterate a hand-written array, so an option added without
// a message of its own went on being tested as though it had one.
const OPTION_KEYS: Readonly<Record<ComposeOption, true>> = {
  calls: true,
  contractState: true,
  networkId: true,
  ttl: true,
  verifierKeys: true,
  zswapOffer: true
};
const ALL_OPTIONS = Object.keys(OPTION_KEYS) as ComposeOption[];

describe('ComposeOptionError', () => {
  it('carries the COMPOSE_OPTION_INVALID code and preserves the decoder failure for contractState', () => {
    const cause = new Error('expected header tag');
    const error = new ComposeOptionError('v8', 'contractState', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ComposeOptionError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.COMPOSE_OPTION_INVALID);
    expect(error.version).toBe('v8');
    expect(error.option).toBe('contractState');
    expect(error.cause).toBe(cause);
    expect(error.message).toMatch(/could not be bridged/i);
  });

  it('names the requested era on the option that has one', () => {
    const v8 = new ComposeOptionError('v8', 'contractState');
    const v9 = new ComposeOptionError('v9', 'contractState');

    expect(v8.message).not.toBe(v9.message);
    expect(v8.message.replaceAll('v8', 'ERA')).toBe(v9.message.replaceAll('v9', 'ERA'));
  });

  it('explains why an empty network id is refused rather than passed through', () => {
    const error = new ComposeOptionError('v9', 'networkId');

    expect(error.option).toBe('networkId');
    expect(error.cause).toBeUndefined();
    expect(error.message).toMatch(/empty network id/i);
    expect(error.message).toMatch(/submission/i);
  });

  it('explains that an invalid ttl would be recorded as the epoch', () => {
    const error = new ComposeOptionError('v9', 'ttl');

    expect(error.option).toBe('ttl');
    expect(error.message).toMatch(/time-to-live/i);
    expect(error.message).toMatch(/epoch/i);
  });

  // The retained era composes exactly one call. Refusing a longer list is the
  // difference between the two eras a caller most needs told, since composing
  // only the first entry would look like success.
  it('explains that a call list longer than one is not composable on the era that refuses it', () => {
    const error = new ComposeOptionError('v8', 'calls');

    expect(error.option).toBe('calls');
    expect(error.message).toMatch(/exactly one call/i);
    expect(error.message).toMatch(/drop the rest/i);
  });

  it('explains that a deploy without a verifier-key map cannot register its entry points', () => {
    const error = new ComposeOptionError('v8', 'verifierKeys');

    expect(error.option).toBe('verifierKeys');
    expect(error.message).toMatch(/verifier[- ]key map/i);
    expect(error.message).toMatch(/entry point/i);
  });

  it('preserves the ledger failure when a supplied Zswap offer cannot be read', () => {
    const cause = new Error('expected header tag');
    const error = new ComposeOptionError('v9', 'zswapOffer', cause);

    expect(error.option).toBe('zswapOffer');
    expect(error.cause).toBe(cause);
    expect(error.message).toMatch(/zswap offer/i);
  });

  it('never includes a hex or byte dump in its own message', () => {
    for (const option of ALL_OPTIONS) {
      expect(new ComposeOptionError('v9', option).message).not.toMatch(/[0-9a-f]{16,}/i);
    }
  });

  // The message table is a total Record for the same reason
  // `ComposeFailedError`'s is: a new option must not silently ship another
  // option's text. It was an if-chain whose fallthrough returned the `'ttl'`
  // message, so a seventh option would have told a caller their time-to-live
  // was invalid while `option` named something else entirely.
  it('gives every compose option a distinct message', () => {
    const messages = ALL_OPTIONS.map((option) => new ComposeOptionError('v9', option).message);

    expect(new Set(messages).size).toBe(ALL_OPTIONS.length);
  });

  // The one option whose diagnosis genuinely differs by era: v9 read the offer
  // and rejected the bytes, v8 never reads one because it cannot carry the coin
  // movements at all. A single message would send one era's caller to audit
  // bytes that are fine.
  it('diagnoses a refused Zswap offer differently on each era', () => {
    const onV8 = new ComposeOptionError('v8', 'zswapOffer').message;
    const onV9 = new ComposeOptionError('v9', 'zswapOffer').message;

    expect(onV8).not.toBe(onV9);
    expect(onV8).toMatch(/cannot be composed on this era at all/i);
    expect(onV9).toMatch(/could not be read/i);
  });
});

describe('StateDecodeFailedError', () => {
  // The era is what decides which decoder ran, so it is the first thing a
  // reader needs: the same bytes are a valid state on one axis and refuse to
  // decode on the other.
  it('carries the STATE_DECODE_FAILED code, the requested era, and the decoder failure on cause', () => {
    const cause = new Error('expected header tag');
    const error = new StateDecodeFailedError('v9', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('StateDecodeFailedError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.STATE_DECODE_FAILED);
    expect(error.version).toBe('v9');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('v9');
  });

  it('never includes a hex or byte dump in its own message', () => {
    const error = new StateDecodeFailedError('v8', new Error('trailing bytes'));

    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

describe('Ledger8ZswapUnsupportedError', () => {
  it('carries the LEDGER8_ZSWAP_UNSUPPORTED code and names the circuit that moved coins', () => {
    const error = new Ledger8ZswapUnsupportedError('send');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8ZswapUnsupportedError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_ZSWAP_UNSUPPORTED);
    expect(error.circuitId).toBe('send');
    expect(error.message).toContain('send');
    expect(error.message).toMatch(/unbalanced/i);
  });

  it('never includes a hex or byte dump in its own message', () => {
    const error = new Ledger8ZswapUnsupportedError('send');

    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

describe('Ledger8RuntimeInvalidError', () => {
  // A caller that never passed the pre-fork runtime, or passed one missing the
  // binding, is a distinct fault from bad envelope bytes and has a distinct
  // remediation. It therefore needs its own code: reporting it as
  // DOWN_CONVERT_FAILED points the caller at bytes that are fine.
  it('carries its own code and names the member that was missing', () => {
    const error = new Ledger8RuntimeInvalidError('deserialize');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Ledger8RuntimeInvalidError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.LEDGER8_RUNTIME_INVALID);
    expect(error.missingMember).toBe('deserialize');
    expect(error.code).not.toBe(PROTOCOL_ERROR_CODES.DOWN_CONVERT_FAILED);
  });

  // `loadLedger8()` resolves @midnightntwrk/ledger-v8, which exports its own
  // ContractState with a matching `static deserialize` on a second, unrelated
  // WASM instance. A remediation naming it therefore hands the caller a class
  // that satisfies the duck-typed guard and decodes on the wrong copy, so the
  // message must route callers to onchain-runtime-v3 explicitly instead.
  it('names the runtime the caller must supply, not the v8 ledger loader', () => {
    const error = new Ledger8RuntimeInvalidError('deserialize');

    expect(error.message).toContain('onchain-runtime-v3');
    expect(error.message).toMatch(/no accessor/i);
    expect(error.message).not.toMatch(/byte|envelope/i);
    expect(error.message).not.toMatch(/[0-9a-f]{16,}/i);
  });
});

describe('UnknownLedger8AxisError', () => {
  it('carries its own code and keeps the offending axis out of the message', () => {
    const error = new UnknownLedger8AxisError('__proto__');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnknownLedger8AxisError');
    expect(error.code).toBe(PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER8_AXIS);
    expect(error.requestedAxis).toBe('__proto__');
    expect(error.message).not.toContain('__proto__');
  });
});

// The axis is interpolated into the remediation hint via a lookup table. A
// plain object literal resolves `constructor` through Object.prototype and
// renders `@scope/function Object() { [native code] }` as a package name to
// trace. Reachable only past the guard's own axis validation, so this pins the
// table itself rather than a live path.
describe('the axis package-name table', () => {
  it.each(['constructor', 'toString', '__proto__'])(
    'does not resolve the prototype member %s into a package name',
    (axis) => {
      // @ts-expect-error - the table is indexed by a closed union; this is the untyped-JS case
      const { message } = new Ledger8InstanceMismatchError(axis);

      expect(message).not.toContain('native code');
      expect(message).not.toContain('[object');
    }
  );
});
