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

  it('leaves no retained-era runtime name on the surface beyond the errors and the result guard', () => {
    const allowed = [...LEDGER8_ERRORS, 'isLedger8Result'];
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

  it('gives every class the name it is exported under', () => {
    const exported: Record<string, { name: string }> = {
      Ledger8AmbiguousEntryPointError: barrel.Ledger8AmbiguousEntryPointError,
      Ledger8CallUnsupportedError: barrel.Ledger8CallUnsupportedError,
      Ledger8NotStoredError: barrel.Ledger8NotStoredError,
      Ledger8SigningKeyError: barrel.Ledger8SigningKeyError,
      Ledger8UnconfirmedError: barrel.Ledger8UnconfirmedError
    };

    for (const name of LEDGER8_ERRORS) {
      expect(exported[name].name).toBe(name);
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
