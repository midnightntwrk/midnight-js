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
 * Nothing else asserts that agreement: every other fixture in this package
 * hands the wrapper a placeholder.
 *
 * WHAT THIS GATE ACTUALLY CATCHES, stated exactly, because an earlier version
 * of this comment claimed more:
 *
 * - a TIGHTENING of `isValidSigningKey` -- the real risk, since that rule lives
 *   in another package and a wrapped key it stopped admitting is one a restore
 *   drops without a word;
 * - a change in the LENGTH a retained sampler answers, which is what the
 *   assertion against `RETAINED_SIGNING_KEY_HEX_LENGTH` measures.
 *
 * It does NOT catch a vendor shape change on its own. `isValidSigningKey`
 * admits any even-length hex string of six characters or more, so the
 * 70-character version-prefixed value the `onchain-runtime-v3` typings describe
 * would pass it unremarked. The length assertion is the half that would see
 * such a change; the predicate cannot.
 *
 * THE SAMPLER HERE IS A SUBSTITUTE, and that is a measurement rather than an
 * assumption. The deploy arm samples through `onchain-runtime-v3`; this file
 * samples through `loadLedger8()`, which resolves `@midnightntwrk/ledger-v8` --
 * a different package on its own release train. Eslint bans a direct
 * `onchain-runtime-v3` import outside `packages/protocol`, so the facade is the
 * only sampler reachable from here. Measured by hand before the substitution
 * was accepted: both samplers answer 64-character hex, and each runtime accepts
 * the other's key. A shape change confined to `onchain-runtime-v3` therefore
 * does NOT show up in this file.
 */

import { loadLedger8 } from '@midnight-ntwrk/midnight-js-protocol';
import { isValidSigningKey } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  fromStoredLedger8SigningKey,
  RETAINED_SIGNING_KEY_HEX_LENGTH,
  toStoredLedger8SigningKey
} from '../internal/ledger8-signing-key';
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

  it('sizes the read length rule off a key a retained runtime actually sampled', () => {
    // The rule in the source is a number, and a number written down only restates what that source
    // was told. This is where it is measured. A sampler that changed length fails here, rather than
    // the read admitting an entry the retained runtime cannot build an authority from.
    expect(retainedKey).toHaveLength(RETAINED_SIGNING_KEY_HEX_LENGTH);
  });

  it.each([
    ['two characters short', (key: string): string => key.slice(0, -2)],
    ['two characters long', (key: string): string => `${key}00`]
  ])('reads an entry %s as absent, where the import rule alone admits it', (_case, reshape) => {
    const entry = toStoredLedger8SigningKey(reshape(retainedKey));

    // The first assertion is the reason the second one is not redundant: the import rule admits any
    // even-length hex of six characters or more, so it says nothing about this era's key length --
    // and `signatureVerifyingKey()` on a truncated key answers an authority nobody holds.
    expect(isValidSigningKey(entry)).toBe(true);
    expect(fromStoredLedger8SigningKey(entry, CONTRACT_ADDRESS, undefined)).toBeUndefined();
  });
});
