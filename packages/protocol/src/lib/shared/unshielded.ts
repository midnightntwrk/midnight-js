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

import { ComposeFailedError } from '../../errors';
import type { LedgerEra } from './ledger-version';

/**
 * The guaranteed/fallible transcript pair one call contributes to a
 * transaction. Both halves are optional: a call whose ops are all guaranteed
 * has no fallible half, and vice versa.
 */
export interface CallTranscriptPair {
  /** The entry point this pair belongs to — named by any failure raised for it. */
  readonly circuitId: string;
  readonly guaranteed?: Transcript<AlignedValue>;
  readonly fallible?: Transcript<AlignedValue>;
}

// Hand-written and generic; `never[]` inputs and signatures: see InjectedVendorSlices.
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

// User-addressed spends only; dust and non-unshielded tokens fail closed (see ComposeRefusalOrder).
export const extractUserAddressedOutputs = (
  transcript: Transcript<AlignedValue> | undefined,
  version: LedgerEra,
  circuitId: string
): UtxoOutput[] => {
  if (transcript === undefined) {
    return [];
  }

  const outputs: UtxoOutput[] = [];
  for (const [[tokenType, publicAddress], value] of transcript.effects.claimedUnshieldedSpends) {
    if (publicAddress.tag !== 'user') {
      continue;
    }
    if (tokenType.tag === 'dust') {
      throw new ComposeFailedError(version, 'call-dust-payout', circuitId);
    }
    if (tokenType.tag !== 'unshielded') {
      throw new ComposeFailedError(version, 'call-unsupported-payout', circuitId);
    }
    outputs.push({ value, owner: publicAddress.address, type: tokenType.raw });
  }
  return outputs;
};

// From every call in the tree, not just the root; a segment with nothing to pay out gets no offer.
export const aggregateUnshieldedOffers = <TOffer>(
  calls: readonly CallTranscriptPair[],
  ledger: UnshieldedOfferLedger<TOffer>,
  version: LedgerEra
): AggregatedUnshieldedOffers<TOffer> => {
  const guaranteedOutputs = calls.flatMap((call) =>
    extractUserAddressedOutputs(call.guaranteed, version, call.circuitId)
  );
  const fallibleOutputs = calls.flatMap((call) => extractUserAddressedOutputs(call.fallible, version, call.circuitId));

  return {
    guaranteed: guaranteedOutputs.length > 0 ? ledger.UnshieldedOffer.new([], guaranteedOutputs, []) : undefined,
    fallible: fallibleOutputs.length > 0 ? ledger.UnshieldedOffer.new([], fallibleOutputs, []) : undefined
  };
};
