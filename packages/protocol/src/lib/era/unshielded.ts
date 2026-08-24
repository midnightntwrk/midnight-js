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

import type { AlignedValue, Transcript, UtxoOutput } from '@midnightntwrk/ledger-v9';

/**
 * The guaranteed/fallible transcript pair one call contributes to a
 * transaction. Both halves are optional: a call whose ops are all guaranteed
 * has no fallible half, and vice versa.
 */
export interface CallTranscriptPair {
  readonly guaranteed?: Transcript<AlignedValue>;
  readonly fallible?: Transcript<AlignedValue>;
}

/**
 * The era module slice {@link aggregateUnshieldedOffers} needs: just the
 * `UnshieldedOffer` constructor. Injected rather than imported as a value, for
 * the same reason `ContractStateDecoder` (`./contract-state.ts`) is — a value
 * import of either era's module would statically link its WASM into whatever
 * bundle reaches this one.
 */
export interface UnshieldedOfferLedger<TOffer> {
  readonly UnshieldedOffer: {
    readonly new: (inputs: never[], outputs: UtxoOutput[], signatures: never[]) => TOffer;
  };
}

/** The offer for each of a transaction's two segments, absent when that segment pays out nothing. */
export interface AggregatedUnshieldedOffers<TOffer> {
  readonly guaranteed: TOffer | undefined;
  readonly fallible: TOffer | undefined;
}

/**
 * Reads the UTXO outputs a call's transcript claims on behalf of USERS.
 *
 * Two kinds of claimed spend are deliberately skipped:
 * - a contract-addressed one, which is settled between contracts and never
 *   paid out to a UTXO;
 * - a dust-typed one, which has no raw token type to be paid out in.
 *
 * Emitting either would add an output the transaction cannot cover, and the
 * node rejects the whole transaction on submission. An absent transcript is
 * the normal shape of a call with no fallible half, not an error, so it yields
 * no outputs rather than throwing.
 */
export const extractUserAddressedOutputs = (transcript: Transcript<AlignedValue> | undefined): UtxoOutput[] => {
  if (transcript === undefined) {
    return [];
  }

  const outputs: UtxoOutput[] = [];
  for (const [[tokenType, publicAddress], value] of transcript.effects.claimedUnshieldedSpends) {
    if (publicAddress.tag === 'user' && tokenType.tag !== 'dust') {
      outputs.push({ value, owner: publicAddress.address, type: tokenType.raw });
    }
  }
  return outputs;
};

/**
 * Builds the one unshielded offer each segment of a transaction carries, from
 * EVERY call in the tree.
 *
 * A user-addressed output can be produced by any call, not just the root, and a
 * transaction has a single guaranteed and a single fallible offer. Assembling
 * either from the root call alone would drop a cross-contract callee's payout
 * and leave the transaction unbalanced — rejected on submission, with nothing
 * having reported a problem at composition time.
 *
 * A segment with nothing to pay out gets no offer at all rather than an empty
 * one: the ledger expects the field left unset, not a declared offer paying out
 * nothing.
 */
export const aggregateUnshieldedOffers = <TOffer>(
  calls: readonly CallTranscriptPair[],
  ledger: UnshieldedOfferLedger<TOffer>
): AggregatedUnshieldedOffers<TOffer> => {
  const guaranteedOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.guaranteed));
  const fallibleOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.fallible));

  return {
    guaranteed: guaranteedOutputs.length > 0 ? ledger.UnshieldedOffer.new([], guaranteedOutputs, []) : undefined,
    fallible: fallibleOutputs.length > 0 ? ledger.UnshieldedOffer.new([], fallibleOutputs, []) : undefined
  };
};
