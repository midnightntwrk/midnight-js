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

import { loadLedger8Protocol } from '@midnightntwrk/midnight-js-protocol';
import * as v9 from '@midnightntwrk/midnight-js-protocol/v9';
import { describe, expect, it } from 'vitest';

import { mergeUnprovenTransactions } from '../../internal/utils/merge-unproven';

const ttl = () => new Date(Date.now() + 600_000);

const segmentIds = (segments: Map<number, unknown> | undefined): number[] => [...(segments?.keys() ?? [])].sort((a, b) => a - b);

const fallibleOffer = () =>
  v9.ZswapOffer.fromOutput(
    v9.ZswapOutput.new(
      v9.createShieldedCoinInfo(v9.shieldedToken().raw, 1n),
      1,
      v9.sampleCoinPublicKey(),
      v9.sampleEncryptionPublicKey()
    ),
    v9.shieldedToken().raw,
    1n
  );

describe('mergeUnprovenTransactions', () => {
  it('keeps both intents when two ledger 8 transactions sit in the same segment', async () => {
    // Arrange
    const v8 = await loadLedger8Protocol();
    const left = v8.Transaction.fromParts('undeployed', undefined, undefined, v8.Intent.new(ttl()));
    const right = v8.Transaction.fromParts('undeployed', undefined, undefined, v8.Intent.new(ttl()));

    // Act
    const merged = mergeUnprovenTransactions(left, right);

    // Assert
    expect(merged.intents?.size).toBe(2);
    expect(merged.intents?.has(1)).toBe(true);
  });

  it('keeps both intents when two ledger 9 transactions sit in the same segment', () => {
    // Arrange
    const left = v9.Transaction.fromParts('undeployed', undefined, undefined, v9.Intent.new(ttl()));
    const right = v9.Transaction.fromParts('undeployed', undefined, undefined, v9.Intent.new(ttl()));

    // Act
    const merged = mergeUnprovenTransactions(left, right);

    // Assert
    expect(merged.intents?.size).toBe(2);
    expect(merged.intents?.has(1)).toBe(true);
  });

  it('moves the fallible offer together with its intent', () => {
    // Arrange
    const left = v9.Transaction.fromParts('undeployed', undefined, fallibleOffer(), v9.Intent.new(ttl()));
    const right = v9.Transaction.fromParts('undeployed', undefined, fallibleOffer(), v9.Intent.new(ttl()));

    // Act
    const merged = mergeUnprovenTransactions(left, right);

    // Assert
    expect(segmentIds(merged.intents)).toHaveLength(2);
    expect(segmentIds(merged.fallibleOffer)).toEqual(segmentIds(merged.intents));
  });
});
