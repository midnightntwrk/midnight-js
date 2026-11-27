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

import type { ContractExecutable } from '@midnightntwrk/midnight-js-protocol/v9/compact-js';

import { Ledger9ScopeFalliblePartError } from '../errors';
import { callName } from './ledger9-scope-checks';

type ContractCall = ContractExecutable.ContractExecutable.ContractCall;

/**
 * The calls of a scope placed in the fallible section of its one intent (`inFallibleSection`), in the
 * order they were made: each call tree's transcripts moved whole into the fallible half, root and
 * callees together. A transcript the partitioner placed guaranteed moves; one it placed fallible stays.
 * A proof binds the guaranteed program then the fallible one, concatenated, so a transcript proves
 * the same in either half. The coins and unshielded payments each transcript claims follow it.
 *
 * A call the partitioner split at a checkpoint, with a guaranteed and a fallible transcript, is
 * refused: its two transcripts become one only as the ledger's runtime computes it, with one cost and
 * one set of effects, and its guaranteed part placed alone would be kept when the rest fails.
 *
 * @param trees The call trees of the scope, one per call it recorded, in the order they were made.
 * @throws Ledger9ScopeFalliblePartError naming each call split at a checkpoint, before proving.
 */
export const placedInFallibleSection = (trees: readonly (readonly ContractCall[])[]): readonly ContractCall[] => {
  const calls = trees.flat();
  const split = calls.filter(
    ({ public: { partitionedTranscript } }) =>
      partitionedTranscript[0] !== undefined && partitionedTranscript[1] !== undefined
  );
  if (split.length > 0) {
    throw new Ledger9ScopeFalliblePartError(
      'unproven',
      split.map((call) => `a guaranteed transcript of ${callName(call)}, split at a checkpoint from its fallible one`),
      { inFallibleSection: true }
    );
  }
  return calls.map((call) => {
    const [guaranteed] = call.public.partitionedTranscript;
    return guaranteed === undefined
      ? call
      : { ...call, public: { ...call.public, partitionedTranscript: [undefined, guaranteed] } };
  });
};

/** The parts of a ledger transaction that the ledger applies with its guaranteed section. */
export interface GuaranteedParts {
  readonly guaranteedOffer: unknown;
  readonly intents:
    | ReadonlyMap<number, { readonly guaranteedUnshieldedOffer: unknown; readonly actions: readonly object[] }>
    | undefined;
}

/**
 * Refuses a transaction, built from the calls of a scope in the fallible section, that holds a part
 * the ledger applies with its guaranteed section and keeps when the calls fail: guaranteed coins (a
 * guaranteed Zswap offer), a guaranteed unshielded offer, or a guaranteed transcript. It runs before
 * proving, on the transaction of the calls alone; the wallet adds its Dust spend to the guaranteed
 * section later.
 *
 * @throws Ledger9ScopeFalliblePartError naming each guaranteed part, and the segment of each but the
 *         guaranteed coins, which the guaranteed section holds.
 */
export const refuseGuaranteedParts = (tx: GuaranteedParts): void => {
  const parts: string[] = tx.guaranteedOffer === undefined ? [] : ['guaranteed coins'];
  for (const [segment, intent] of tx.intents ?? []) {
    if (intent.guaranteedUnshieldedOffer !== undefined) {
      parts.push(`a guaranteed unshielded offer in segment ${segment}`);
    }
    const transcripts = intent.actions.filter(
      (action) => 'guaranteedTranscript' in action && action.guaranteedTranscript !== undefined
    ).length;
    if (transcripts > 0) {
      parts.push(`${transcripts} guaranteed transcript(s) in segment ${segment}`);
    }
  }
  if (parts.length > 0) {
    throw new Ledger9ScopeFalliblePartError('unproven', parts, { inFallibleSection: true });
  }
};
