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

import { CONTRACTS_ERROR_CODES, hasErrorCode } from '@midnight-ntwrk/midnight-js-utils';
import { describe, expect, it } from 'vitest';

// Imported from the package BARREL, because the barrel is what this suite is about: the retained
// era reaches a consumer through ONE name, and everything it publishes is reachable under it.
import * as barrel from '../index';
import { AnyEraTxFailedError, Ledger8 } from '../index';

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

describe('the retained era is published as one namespace', () => {
  it('publishes exactly the retained-era runtime members under it', () => {
    const published = Object.keys(Ledger8).sort();

    expect(published).toEqual([...RETAINED_ERA_MEMBERS].sort());
  });

  it('leaves no retained-era name on the flat surface', () => {
    // The regression this package is one release away from re-introducing: a later commit adds a
    // retained-era export next to the current-era ones, and the whole family is back on the flat
    // surface with nobody noticing until the fork window closes and it cannot be removed.
    //
    // Matched on CONTAINING the era name rather than starting with it, so a helper named
    // `createLedger8...` is caught too -- the first one was published under exactly that name.
    const allowedFlat = ['Ledger8', 'isLedger8Result'];
    const leaked = Object.keys(barrel).filter((name) => name.includes('Ledger8') && !allowedFlat.includes(name));

    expect(leaked).toEqual([]);
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
    expect(Object.getPrototypeOf(Ledger8.CallTxFailedError)).toBe(AnyEraTxFailedError);
  });
});
