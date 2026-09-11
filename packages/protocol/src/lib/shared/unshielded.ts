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
import type { LedgerVersion } from './ledger-version';

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

/**
 * The era module slice {@link aggregateUnshieldedOffers} needs: just the
 * `UnshieldedOffer` constructor.
 *
 * @typeParam TOffer The offer type the era's own `UnshieldedOffer.new`
 * returns, inferred from the module that is passed.
 * @see {@link ComposeRefusalOrder} for why this slice is hand-written and
 * generic rather than derived from one era's class, and why `inputs` and
 * `signatures` are typed `never[]`.
 * @see {@link ModuleGraphAndLazyLoading} for why the module is injected rather
 * than imported.
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
 * @param transcript One half of a call's transcript pair. Absent is the normal
 * shape of a call with no fallible half, and yields no outputs.
 * @param version The era every failure raised here names.
 * @param circuitId The entry point every failure raised here names.
 * @returns One `UtxoOutput` per user-addressed unshielded spend the transcript
 * claims. Contract-addressed spends are skipped.
 * @throws ComposeFailedError at stage `'call-dust-payout'` for a user-addressed
 * dust spend.
 * @throws ComposeFailedError at stage `'call-unsupported-payout'` for a
 * user-addressed spend of any token type other than unshielded.
 * @see {@link ComposeRefusalOrder}
 */
export const extractUserAddressedOutputs = (
  transcript: Transcript<AlignedValue> | undefined,
  version: LedgerVersion,
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

/**
 * Builds the one unshielded offer each segment of a transaction carries, from
 * EVERY call in the tree.
 *
 * @typeParam TOffer The offer type `ledger.UnshieldedOffer.new` returns.
 * @param calls Every call in the transaction's tree — cross-contract callees
 * as well as the root call, since any of them can produce a payout.
 * @param ledger The era module slice carrying `UnshieldedOffer`.
 * @param version The era every failure raised here names.
 * @returns The guaranteed and fallible offers. A segment with nothing to pay
 * out gets no offer at all rather than an empty one.
 * @throws ComposeFailedError from {@link extractUserAddressedOutputs} for a
 * user-addressed spend this seam cannot pay out.
 * @see {@link ComposeRefusalOrder}
 */
export const aggregateUnshieldedOffers = <TOffer>(
  calls: readonly CallTranscriptPair[],
  ledger: UnshieldedOfferLedger<TOffer>,
  version: LedgerVersion
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
