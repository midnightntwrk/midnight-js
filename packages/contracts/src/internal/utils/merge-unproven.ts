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

interface SegmentedTransaction<T> {
  intents: Map<number, unknown> | undefined;
  fallibleOffer: Map<number, unknown> | undefined;
  merge(other: T): T;
}

const MAX_SEGMENT_ID = 65_535;

const segmentIdsOf = <T>(tx: SegmentedTransaction<T>): Set<number> =>
  new Set([...(tx.intents?.keys() ?? []), ...(tx.fallibleOffer?.keys() ?? [])]);

const freeSegmentId = (taken: Set<number>): number => {
  let id: number;
  do {
    id = 1 + Math.floor(Math.random() * MAX_SEGMENT_ID);
  } while (taken.has(id));
  return id;
};

const rekey = <V>(segments: Map<number, V>, moves: Map<number, number>): Map<number, V> =>
  new Map([...segments].map(([id, value]) => [moves.get(id) ?? id, value]));

/**
 * Merges two unproven transactions, first moving every segment of `right` that `left` already uses
 * to a free one, so two calls that drew the same random segment id still merge.
 * Mutates `right`: pass a transaction nobody else holds.
 */
export const mergeUnprovenTransactions = <T extends SegmentedTransaction<T>>(left: T, right: T): T => {
  const leftIds = segmentIdsOf(left);
  const rightIds = segmentIdsOf(right);
  const taken = new Set([...leftIds, ...rightIds]);
  const moves = new Map<number, number>();
  for (const id of rightIds) {
    if (leftIds.has(id)) {
      const free = freeSegmentId(taken);
      taken.add(free);
      moves.set(id, free);
    }
  }
  if (moves.size > 0) {
    if (right.intents) right.intents = rekey(right.intents, moves);
    if (right.fallibleOffer) right.fallibleOffer = rekey(right.fallibleOffer, moves);
  }
  return left.merge(right);
};
