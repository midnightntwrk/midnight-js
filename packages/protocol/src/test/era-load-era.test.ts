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


import * as ocrt3 from '@midnight-ntwrk/onchain-runtime-v3';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_ERROR_CODES, UnknownLedgerVersionError } from '../errors';
import { extractEncodedStateValue } from '../lib/era/envelope';
import { loadLedgerEra } from '../lib/era/load-era';
import { readHexFixture } from './fixtures';



// The golden pair: the same contract before and after the migration. Reading
// each through its own era is what makes the two arms comparable at all.
const GOLDEN_FOR: Readonly<Record<'v8' | 'v9', string>> = {
  v8: 'state-v8.hex',
  v9: 'state-migrated-v9.hex'
};

describe('loadLedgerEra', () => {
  // Strict equality, not a per-method `typeof` sweep: a method leaked onto one
  // era's arm, renamed, or silently dropped has to fail here — which a
  // one-directional check of the names we happen to remember cannot do. Both
  // eras are held to the SAME list, which is the whole point of the facade.
  it.each(['v8', 'v9'] as const)('exposes exactly the documented %s surface, and nothing else', async (version) => {
    const era = await loadLedgerEra(version);

    expect(Object.keys(era).sort()).toEqual([
      'composeCallTx',
      'composeDeployTx',
      'decodeContractState',
      'extractState',
      'version'
    ]);
  });

  it.each(['v8', 'v9'] as const)('binds %s to the era that was asked for', async (version) => {
    const era = await loadLedgerEra(version);

    expect(era.version).toBe(version);
  });

  it.each(['v8', 'v9'] as const)('memoises the %s era across calls', async (version) => {
    const first = loadLedgerEra(version);
    const second = loadLedgerEra(version);

    expect(second).toBe(first);
    expect(await second).toBe(await first);
  });

  // One memo slot per era, not one shared slot: a shared slot would hand the
  // second caller whichever era happened to be asked for first, silently
  // decoding one era's bytes with the other era's runtime.
  // A memoised era is one object every caller in the process holds, so an
  // unfrozen one lets any consumer reassign a method for all the others. The
  // same reason LEDGER_VERSIONS and PROTOCOL_ERROR_CODES are frozen.
  it.each(['v8', 'v9'] as const)('hands out a frozen era object on %s', async (version) => {
    const era = await loadLedgerEra(version);

    expect(Object.isFrozen(era)).toBe(true);
  });

  it('memoises the two eras apart', async () => {
    const [v8, v9] = await Promise.all([loadLedgerEra('v8'), loadLedgerEra('v9')]);

    expect(v8).not.toBe(v9);
    expect(v8.version).toBe('v8');
    expect(v9.version).toBe('v9');
  });

  it.each(['v8', 'v9'] as const)('extracts the %s golden to the same state the engine reads', async (version) => {
    const raw = readHexFixture(GOLDEN_FOR[version]);
    const era = await loadLedgerEra(version);

    expect(era.extractState(raw)).toEqual(extractEncodedStateValue(raw, version, ocrt3.ContractState));
  });

  it.each(['v8', 'v9'] as const)('decodes the %s golden to its declared entry points', async (version) => {
    const era = await loadLedgerEra(version);

    const pojo = era.decodeContractState(readHexFixture(GOLDEN_FOR[version]));

    expect(pojo.entryPoints.length).toBeGreaterThan(0);
    expect(pojo.state).toEqual(era.extractState(readHexFixture(GOLDEN_FOR[version])));
  });

  // The dispatch is a closed switch over LEDGER_VERSIONS, so a TypeScript
  // caller cannot reach this. It exists for the untyped JavaScript consumers
  // this package also serves, where an era string threaded from an indexer
  // response would otherwise fall through to a plausible-looking non-era.
  //
  // The prototype-member names are here because they are what a table-based
  // dispatch would resolve (envelope.ts has one, and defends itself with a
  // null-prototype table). A switch resolves none of them — they are covered so
  // that replacing this switch with a lookup cannot quietly reintroduce it.
  it.each(['v7', 'constructor', 'toString', '__proto__'])(
    'refuses the non-era %s rather than resolving it to anything',
    async (version) => {
      await expect(
        // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
        loadLedgerEra(version)
      ).rejects.toThrowError(expect.objectContaining({ code: PROTOCOL_ERROR_CODES.UNKNOWN_LEDGER_VERSION }));
    }
  );

  it('carries the refused era in a field rather than rendering it in the message', async () => {
    const rejection = await loadLedgerEra(
      // @ts-expect-error - reaching the runtime guard that exists for untyped JS callers
      '__proto__'
    ).then(
      () => {
        throw new Error('expected loadLedgerEra to reject an unknown era');
      },
      (error: unknown) => error
    );

    expect(rejection).toBeInstanceOf(UnknownLedgerVersionError);
    expect((rejection as UnknownLedgerVersionError).requestedVersion).toBe('__proto__');
    expect((rejection as UnknownLedgerVersionError).message).not.toContain('__proto__');
  });
});
