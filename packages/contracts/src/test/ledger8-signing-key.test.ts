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

/**
 * The CROSS-PACKAGE CONTRACT that persisting a retained-era signing key rests
 * on, asserted in the one place all three sides of it are in scope.
 *
 * Three packages have to agree for a retained key to survive a store:
 *
 * - `packages/protocol` produces the key, and the era it belongs to decides its
 *   shape;
 * - `packages/contracts` (`src/internal/ledger8-signing-key.ts`) wraps it into
 *   the structured key `PrivateStateProvider.setSigningKey` takes;
 * - `packages/utils` (`isValidSigningKey`) is the shape rule the level-backed
 *   provider validates an IMPORT against, so a wrapped key that fails it is one
 *   a restore silently drops.
 *
 * Nothing else asserts that agreement. Every other fixture in this package
 * hands the wrapper a placeholder, so a rule that tightened -- to the 3-byte
 * version prefix the retained runtime's own typings claim, say -- would break
 * restores with every test in `packages/contracts` still green.
 *
 * The key here is SAMPLED FROM THE REAL RETAINED RUNTIME rather than written
 * down. A literal would only re-state what this file was told; a sampled key
 * re-measures it on every run, and a vendor bump that changed the shape shows
 * up here.
 */

import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { fromStoredLedger8SigningKey, toStoredLedger8SigningKey } from '../internal/ledger8-signing-key';
import { createMockContractAddress } from './test-mocks';

const CONTRACT_ADDRESS: string = createMockContractAddress();

describe('a retained-era signing key crossing the private-state provider', () => {
  let retainedKey: string;

  beforeAll(async () => {
    // `loadLedger8()` and not a direct vendor import: everything outside
    // `packages/protocol/src` reaches the retained era through the facade, and
    // eslint enforces it.
    retainedKey = (await loadLedger8()).sampleSigningKey();
  });

  it('wraps into something the store validates an import as a signing key', () => {
    expect(isValidSigningKey(toStoredLedger8SigningKey(retainedKey))).toBe(true);
  });

  it('owes that entirely to the wrapper, which the bare key does not satisfy on its own', () => {
    // The other direction, and the reason the first assertion is not vacuous: if the predicate
    // admitted a bare retained key too, it would be saying nothing about the wrapper.
    expect(isValidSigningKey(retainedKey)).toBe(false);
  });

  it('is named as the retained era signature kind, which is what the read admits', () => {
    expect(toStoredLedger8SigningKey(retainedKey).tag).toBe('schnorr');
  });

  it('comes back out of the wrapper unchanged, with no breadcrumb sink configured', () => {
    // `undefined` for the sink is the ordinary case: the logger provider is optional on every
    // provider set, so the read has to work without one.
    expect(fromStoredLedger8SigningKey(toStoredLedger8SigningKey(retainedKey), CONTRACT_ADDRESS, undefined)).toBe(
      retainedKey
    );
  });
});
