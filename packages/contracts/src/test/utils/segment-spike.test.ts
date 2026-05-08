/*
 * This file is part of midnight-js.
 * Copyright (C) 2025-2026 Midnight Foundation
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

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  coinCommitment,
  createShieldedCoinInfo,
  Intent,
  nativeToken,
  sampleCoinPublicKey,
  sampleEncryptionPublicKey,
  Transaction,
  ZswapOffer,
  ZswapOutput
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Zswap segment spike (#876)', () => {
  beforeAll(() => {
    setNetworkId('undeployed');
  });

  it('coinCommitment(coin, cpk) is segment-independent — same value for both segments', () => {
    // Arrange
    const cpk = sampleCoinPublicKey();
    const epk = sampleEncryptionPublicKey();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    // Act
    const commitmentFromHelper = coinCommitment(coin, cpk);
    const commitmentSeg0 = ZswapOutput.new(coin, 0, cpk, epk).commitment;
    const commitmentSeg1 = ZswapOutput.new(coin, 1, cpk, epk).commitment;
    // Assert
    expect(commitmentFromHelper).toBe(commitmentSeg0);
    expect(commitmentFromHelper).toBe(commitmentSeg1);
  });

  it('Transaction.fromPartsRandomized accepts both guaranteed and fallible offers', () => {
    // Arrange
    const cpk = sampleCoinPublicKey();
    const epk = sampleEncryptionPublicKey();
    const guaranteedCoin = createShieldedCoinInfo(nativeToken().raw, 100n);
    const fallibleCoin = createShieldedCoinInfo(nativeToken().raw, 200n);
    const guaranteedOffer = ZswapOffer.fromOutput(
      ZswapOutput.new(guaranteedCoin, 0, cpk, epk),
      nativeToken().raw,
      100n
    );
    const fallibleOffer = ZswapOffer.fromOutput(
      ZswapOutput.new(fallibleCoin, 1, cpk, epk),
      nativeToken().raw,
      200n
    );
    // Act
    const tx = Transaction.fromPartsRandomized(
      'undeployed',
      guaranteedOffer,
      fallibleOffer,
      Intent.new(ttlOneHour())
    );
    // Assert: the transaction exposes both offers
    expect(tx.guaranteedOffer).toBeDefined();
    expect(tx.fallibleOffer).toBeDefined();
    expect(tx.fallibleOffer!.size).toBe(1);
    // The fallible offer is keyed by the intent's randomized segment ID;
    // we don't assert its specific value — only that exactly one bucket exists
    // and it carries our fallible output.
    const [[fallibleSegmentId, placedFallible]] = Array.from(tx.fallibleOffer!.entries());
    expect(Number.isInteger(fallibleSegmentId) && fallibleSegmentId >= 0).toBe(true);
    expect(placedFallible.outputs.length).toBe(1);
    // tx.guaranteedOffer is a single ZswapOffer (not a Map keyed by segment ID).
    expect(tx.guaranteedOffer!.outputs.length).toBe(1);
  });

  it('passes segment === undefined to ZswapOutput.new — accepted, and commitment is still readable', () => {
    // Arrange
    const cpk = sampleCoinPublicKey();
    const epk = sampleEncryptionPublicKey();
    const coin = createShieldedCoinInfo(nativeToken().raw, 100n);
    // Act
    const output = ZswapOutput.new(coin, undefined, cpk, epk);
    // Assert: a future ledger that silently nulls .commitment when segment is
    // undefined would break the matching logic in zswapStateToSegmentedOffer.
    expect(output.commitment).toBe(coinCommitment(coin, cpk));
  });
});
