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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

// The modules that DECLARE the classes, so the barrel is checked for identity and not only for
// spelling: a barrel that re-exported a same-named stub would keep every name on the surface.
import {
  Ledger8AmbiguousEntryPointError,
  Ledger8CallUnsupportedError,
  Ledger8NotStoredError,
  Ledger8SigningKeyError,
  Ledger8UnconfirmedError
} from '../errors';
// Imported from the package BARREL, because the barrel is what this suite is about.
import * as barrel from '../index';

const LEDGER8_ERRORS = [
  'Ledger8AmbiguousEntryPointError',
  'Ledger8CallUnsupportedError',
  'Ledger8NotStoredError',
  'Ledger8SigningKeyError',
  'Ledger8UnconfirmedError'
];

const ERA_NEUTRAL_MEMBERS = ['EraMismatchError', 'TxFailedError', 'isLedger8Result'];

const LEDGER8_ERROR_PATTERN = /^Ledger8\w*Error$/;

/**
 * The retained-era error names the BUILT bundle ships.
 *
 * The bundle rather than `../index`, for the reason `contracts-value-acl.test.ts` states: vitest
 * resolves the barrel through its own per-file transform, so a member rollup elides stays invisible
 * to every assertion made against the source.
 *
 * A missing bundle throws rather than skipping: a skipped test reports as a pass. Turbo's `test`
 * task dependsOn `build`, so `dist/` is present in CI.
 */
const distLedger8ErrorNames = (): string[] => {
  const absolute = resolve(__dirname, '../../dist/index.js');
  if (!existsSync(absolute)) {
    throw new Error('dist/index.js is missing -- build the package before running this test');
  }
  const bundle = readFileSync(absolute, 'utf8');
  const exported = [...bundle.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap(([, clause]) =>
    clause
      .split(',')
      .map((name) => name.trim().split(/\s+as\s+/).pop() ?? '')
  );
  return exported.filter((name) => LEDGER8_ERROR_PATTERN.test(name)).sort();
};

describe('the retained-era errors are published flat', () => {
  it('exports exactly the five retained-era error classes', () => {
    const published = Object.keys(barrel).filter((name) => LEDGER8_ERROR_PATTERN.test(name)).sort();

    expect(published).toEqual([...LEDGER8_ERRORS].sort());
  });

  it('publishes no Ledger8 namespace', () => {
    expect('Ledger8' in barrel).toBe(false);
  });

  it('leaves no retained-era runtime name on the surface beyond the errors, the result guard and the low-level functions', () => {
    const allowed = [...LEDGER8_ERRORS, 'isLedger8Result', 'createLedger8UnprovenCallTx'];
    const leaked = Object.keys(barrel).filter((name) => name.includes('Ledger8') && !allowed.includes(name));

    expect(leaked).toEqual([]);
  });

  it('binds every exported name to the class declared under it', () => {
    const declared: Record<string, unknown> = {
      Ledger8AmbiguousEntryPointError,
      Ledger8CallUnsupportedError,
      Ledger8NotStoredError,
      Ledger8SigningKeyError,
      Ledger8UnconfirmedError
    };
    const exported: Record<string, unknown> = { ...barrel };

    for (const name of LEDGER8_ERRORS) {
      expect(exported[name]).toBe(declared[name]);
    }
  });

  it('gives every instance the name the class is exported under', () => {
    const signingKey = { tag: 'schnorr' as const, value: '11'.repeat(32) };
    const address = 'ab'.repeat(32);
    const instances: Record<string, { name: string }> = {
      Ledger8AmbiguousEntryPointError: new barrel.Ledger8AmbiguousEntryPointError('0200'.repeat(8), 'increment', 2),
      Ledger8CallUnsupportedError: new barrel.Ledger8CallUnsupportedError('shielded-spend', 'increment'),
      Ledger8NotStoredError: new barrel.Ledger8NotStoredError('deploy', address, signingKey, 'signing-key', new Error('store down')),
      Ledger8SigningKeyError: new barrel.Ledger8SigningKeyError('unusable'),
      Ledger8UnconfirmedError: new barrel.Ledger8UnconfirmedError('deploy', address, signingKey, new Error('unconfirmed'))
    };

    for (const name of LEDGER8_ERRORS) {
      expect(instances[name].name).toBe(name);
    }
  });

  it('ships the same names in the built bundle', () => {
    const shipped = distLedger8ErrorNames();

    expect(shipped).toEqual([...LEDGER8_ERRORS].sort());
  });

  it('keeps the era-neutral half flat, so receiving a result needs no opt-in', () => {
    const missing = ERA_NEUTRAL_MEMBERS.filter((name) => !(name in barrel));

    expect(missing).toEqual([]);
  });

  it('carries the registered error code on a class reached through the barrel', () => {
    const error = new barrel.Ledger8NotStoredError('deploy', 'ab'.repeat(32), { tag: 'schnorr', value: '11'.repeat(32) }, 'signing-key', new Error('store down'));

    expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED)).toBe(true);
  });
});
