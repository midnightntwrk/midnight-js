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

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

// The left-hand side of the renaming table, from the modules that DECLARE it. The namespace is
// `Ledger8X as X` written by hand, and a transposed pair keeps every name on the surface -- the key
// list below cannot see it.
import {
  Ledger8AmbiguousEntryPointError,
  Ledger8CallUnsupportedError,
  Ledger8NotStoredError,
  Ledger8SigningKeyError,
  Ledger8UnconfirmedError
} from '../errors';
// Imported from the package BARREL, because the barrel is what this suite is about: the retained
// era reaches a consumer through ONE name, and everything it publishes is reachable under it.
import * as barrel from '../index';
import { Ledger8 } from '../index';

/**
 * Every runtime member the retained-era namespace publishes.
 *
 * Asserted by strict equality in both directions, so a member dropped from the namespace and a
 * member that leaked into it fail the same test.
 */
const LEDGER8_MEMBERS = [
  'AmbiguousEntryPointError',
  'CallUnsupportedError',
  'NotStoredError',
  'SigningKeyError',
  'UnconfirmedError'
];

/**
 * The era-NEUTRAL half, which stays on the flat surface.
 *
 * A caller that receives a result from either era uses these without opting into the retained era
 * at all, so moving them under the namespace would make the neutral path depend on the
 * transitional one.
 */
const ERA_NEUTRAL_MEMBERS = [
  'EraMismatchError',
  'TxFailedError',
  'isLedger8Result'
];

/**
 * The members of the namespace the BUILT bundle ships.
 *
 * The bundle rather than `../index`, for the reason `contracts-value-acl.test.ts` states: vitest
 * resolves the barrel through its own per-file transform, so a member rollup elides from the frozen
 * namespace object stays invisible to every assertion made against the source -- while a consumer's
 * `instanceof Ledger8.CallTxFailedError` throws on an undefined right-hand side.
 *
 * A missing bundle throws rather than skipping: a skipped test reports as a pass. Turbo's `test`
 * task dependsOn `build`, so `dist/` is present in CI.
 */
const distNamespaceMembers = async (): Promise<string[]> => {
  const absolute = resolve(__dirname, '../../dist/index.js');
  if (!existsSync(absolute)) {
    throw new Error('dist/index.js is missing -- build the package before running this test');
  }
  const shipped: Record<string, unknown> = await import(pathToFileURL(absolute).href);
  const namespace = shipped.Ledger8;
  if (typeof namespace !== 'object' || namespace === null) {
    throw new Error("dist/index.js publishes no 'Ledger8' namespace object");
  }
  return Object.keys(namespace).sort();
};

describe('the retained era is published as one namespace', () => {
  it('publishes exactly the retained-era runtime members under it', () => {
    const published = Object.keys(Ledger8).sort();

    expect(published).toEqual([...LEDGER8_MEMBERS].sort());
  });

  it('leaves no retained-era RUNTIME name on the flat surface', () => {
    // Matched on CONTAINING the era name rather than starting with it, so a helper named
    // `createLedger8...` is caught too.
    //
    // RUNTIME names only: `Object.keys` sees bindings. The retained-era TYPES are flat by design
    // (TS4023), and the strict list in `contracts-type-acl.test.ts` pins them.
    const allowedFlat = ['Ledger8', 'isLedger8Result'];
    const leaked = Object.keys(barrel).filter((name) => name.includes('Ledger8') && !allowedFlat.includes(name));

    expect(leaked).toEqual([]);
  });

  it('binds every member to the declaration it renames', () => {
    // Identity, not spelling. Every assertion below fails if the rename table in `src/ledger8.ts`
    // points a member at the wrong declaration -- the one failure mode the key list cannot see.
    expect(Ledger8.AmbiguousEntryPointError).toBe(Ledger8AmbiguousEntryPointError);
    expect(Ledger8.CallUnsupportedError).toBe(Ledger8CallUnsupportedError);
    expect(Ledger8.NotStoredError).toBe(Ledger8NotStoredError);
    expect(Ledger8.SigningKeyError).toBe(Ledger8SigningKeyError);
    expect(Ledger8.UnconfirmedError).toBe(Ledger8UnconfirmedError);
  });

  it('ships the same members in the built bundle', async () => {
    const shipped = await distNamespaceMembers();

    expect(shipped).toEqual([...LEDGER8_MEMBERS].sort());
  });

  it('keeps the era-neutral half flat, so receiving a result needs no opt-in', () => {
    const missing = ERA_NEUTRAL_MEMBERS.filter((name) => !(name in barrel));

    expect(missing).toEqual([]);
  });

  it('carries the registered error code on a class reached through the namespace', () => {
    // The namespace is a RENAME of the existing classes, not a second set of them. A same-named
    // stub would satisfy the key list above and fail here.
    const error = new Ledger8.NotStoredError('deploy', 'ab'.repeat(32), { tag: 'schnorr', value: '11'.repeat(32) }, 'signing-key', new Error('store down'));

    expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.LEDGER8_NOT_STORED)).toBe(true);
  });
});
