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
// list below cannot see it. `createLedger8CircuitCallTxInterface` is the sharpest case: its
// namespace-local name is the SAME spelling as the flat current-era factory, so publishing the
// wrong one of the two leaves every gate green.
import {
  Ledger8AmbiguousEntryPointError,
  Ledger8CallTxFailedError,
  Ledger8DeployOnV9Error,
  Ledger8DeployUnmaintainableError,
  Ledger8RecipientUnmappableError,
  Ledger8SeamFailedError,
  Ledger8ShieldedSpendUnsupportedError
} from '../errors';
// Imported from the package BARREL, because the barrel is what this suite is about: the retained
// era reaches a consumer through ONE name, and everything it publishes is reachable under it.
import * as barrel from '../index';
import { AnyEraTxFailedError, Ledger8 } from '../index';
import { createLedger8CircuitCallTxInterface } from '../tx-interfaces';

/**
 * Every runtime member the retained-era namespace publishes.
 *
 * Asserted by strict equality in both directions, so a member dropped from the namespace and a
 * member that leaked into it fail the same test.
 */
const RETAINED_ERA_MEMBERS = [
  'AmbiguousEntryPointError',
  'CallTxFailedError',
  'DeployOnV9Error',
  'DeployUnmaintainableError',
  'RecipientUnmappableError',
  'SeamFailedError',
  'ShieldedSpendUnsupportedError',
  'createCircuitCallTxInterface'
];

/**
 * The era-NEUTRAL half, which stays on the flat surface.
 *
 * A caller that receives a result from either era uses these without opting into the retained era
 * at all, so moving them under the namespace would make the neutral path depend on the
 * transitional one.
 */
const ERA_NEUTRAL_MEMBERS = [
  'AnyEraTxFailedError',
  'CURRENT_PIPELINE_ERA',
  'RETAINED_PIPELINE_ERA',
  'isLedger8Result',
  'UnrecognisedResultEraError'
];

/**
 * The members of the namespace the BUILT bundle ships.
 *
 * The bundle rather than `../index`, for the reason `contracts-value-acl.test.ts` states: vitest
 * resolves the barrel through its own per-file transform, so a member rollup elides from the frozen
 * namespace object stays invisible to every assertion made against the source -- while a consumer's
 * `instanceof Ledger8.SeamFailedError` throws on an undefined right-hand side.
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

    expect(published).toEqual([...RETAINED_ERA_MEMBERS].sort());
  });

  it('leaves no retained-era RUNTIME name on the flat surface', () => {
    // Matched on CONTAINING the era name rather than starting with it, so a helper named
    // `createLedger8...` is caught too.
    //
    // RUNTIME names only: `Object.keys` sees bindings, and 29 of the 37 members are types, which
    // have none. A flat retained-era TYPE re-export is caught by the strict list in
    // `contracts-type-acl.test.ts` instead -- that suite is the other half of this guard, and
    // narrowing it would reopen the larger half of the hole.
    const allowedFlat = ['Ledger8', 'isLedger8Result'];
    const leaked = Object.keys(barrel).filter((name) => name.includes('Ledger8') && !allowedFlat.includes(name));

    expect(leaked).toEqual([]);
  });

  it('binds every member to the declaration it renames', () => {
    // Identity, not spelling. Every assertion below fails if the rename table in `src/ledger8.ts`
    // points a member at the wrong declaration -- the one failure mode the key list cannot see.
    expect(Ledger8.AmbiguousEntryPointError).toBe(Ledger8AmbiguousEntryPointError);
    expect(Ledger8.CallTxFailedError).toBe(Ledger8CallTxFailedError);
    expect(Ledger8.DeployOnV9Error).toBe(Ledger8DeployOnV9Error);
    expect(Ledger8.DeployUnmaintainableError).toBe(Ledger8DeployUnmaintainableError);
    expect(Ledger8.RecipientUnmappableError).toBe(Ledger8RecipientUnmappableError);
    expect(Ledger8.SeamFailedError).toBe(Ledger8SeamFailedError);
    expect(Ledger8.ShieldedSpendUnsupportedError).toBe(Ledger8ShieldedSpendUnsupportedError);
    expect(Ledger8.createCircuitCallTxInterface).toBe(createLedger8CircuitCallTxInterface);
  });

  it('ships the same members in the built bundle', async () => {
    const shipped = await distNamespaceMembers();

    expect(shipped).toEqual([...RETAINED_ERA_MEMBERS].sort());
  });

  it('keeps the era-neutral half flat, so receiving a result needs no opt-in', () => {
    const missing = ERA_NEUTRAL_MEMBERS.filter((name) => !(name in barrel));

    expect(missing).toEqual([]);
  });

  it('carries the registered error code on a class reached through the namespace', () => {
    // The namespace is a RENAME of the existing classes, not a second set of them. A same-named
    // stub would satisfy the key list above and fail here.
    const error = new Ledger8.DeployOnV9Error();

    expect(hasErrorCode(error, CONTRACTS_ERROR_CODES.LEDGER8_DEPLOY_ON_V9)).toBe(true);
  });

  it('keeps the retained failure class under the era-neutral base a consumer catches', () => {
    // A handler written as `catch (e) { if (e instanceof AnyEraTxFailedError) }` must keep catching
    // the retained-era failure. Asserted on the class rather than an instance: the constructor
    // takes a finalized record, and what is at stake here is the hierarchy, not a message.
    //
    // `prototype instanceof` rather than the DIRECT prototype: what a consumer relies on is that
    // the base catches it, at any depth. `TxFailedError extends AnyEraTxFailedError` shows an
    // intermediate base is an established shape here, and inserting one must not fail this test.
    expect(Ledger8.CallTxFailedError.prototype instanceof AnyEraTxFailedError).toBe(true);
  });
});
