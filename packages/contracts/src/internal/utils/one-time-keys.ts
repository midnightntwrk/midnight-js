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

import { InvalidArgumentError } from '@midnightntwrk/midnight-js-protocol/errors';
import {
  coinCommitment,
  type ShieldedCoinInfo,
  type UnprovenOutput,
  type UnprovenTransient,
  ZswapLocalState,
  type ZswapSecretKeys
} from '@midnightntwrk/midnight-js-protocol/v9';

/** An offer's output or transient, with the token type and value it moves. */
type OfferEntry<U> = {
  readonly unproven: U;
  readonly type: string;
  readonly value: bigint;
};

/** The outputs and transients of one segment of a transaction's offers, keyed by coin commitment. */
export interface SegmentEntries {
  readonly segment: 0 | 1;
  readonly outputs: Map<string, OfferEntry<UnprovenOutput>>;
  readonly transients: Map<string, OfferEntry<UnprovenTransient>>;
}

/**
 * Spends again, in the same transaction, every coin the transaction makes for the coin key of
 * `keys`: each such output becomes a transient in the segment the output was placed in (the ledger
 * checks a transient's input and output against the segment of the offer that holds it), and no
 * longer appears as an output. The coin is made and spent in one transaction, so it is never left
 * unspent at that key, though the chain records its commitment and nullifier; its value balances
 * what the transaction takes in elsewhere.
 *
 * Contract-owned outputs are never touched, and neither is an output to any other coin key.
 *
 * @param segments The outputs and transients of each segment; changed in place.
 * @param coinOf The coin each output makes, by its commitment.
 * @param keys The keys that own the coins to spend again; never named in an error.
 * @throws InvalidArgumentError if the transaction makes no coin for `keys`: such keys would leave
 *         nothing spent, and a coin meant for them elsewhere would rest at a key nobody keeps.
 */
export const spendOutputsInside = (
  segments: readonly SegmentEntries[],
  coinOf: ReadonlyMap<string, ShieldedCoinInfo>,
  keys: ZswapSecretKeys
): void => {
  let spent = 0;
  for (const { segment, outputs, transients } of segments) {
    for (const [commitment, entry] of outputs) {
      const coin = coinOf.get(commitment);
      if (entry.unproven.contractAddress !== undefined || coin === undefined) continue;
      if (coinCommitment(coin, keys.coinPublicKey) !== commitment) continue;
      const [, transient] = new ZswapLocalState().spendFromOutput(
        keys,
        { ...coin, mt_index: 0n },
        segment,
        entry.unproven
      );
      transients.set(commitment, { unproven: transient, type: entry.type, value: entry.value });
      outputs.delete(commitment);
      spent += 1;
    }
  }
  if (spent === 0) {
    throw new InvalidArgumentError(
      'The one-time keys given to spend coins inside the transaction spend no coin its calls make: a coin ' +
        'meant for them would rest at a key nobody keeps. Give them only to a transaction whose calls make a ' +
        'coin for their coin public key.'
    );
  }
};
